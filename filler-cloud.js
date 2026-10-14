/* Filler Café: funciones de datos compartidos. Solo usa una clave pública. */
(() => {
  "use strict";
  const BASE = "https://qwxydjotwhniahaovrff.supabase.co";
  const PUBLIC_KEY = "sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
  const SESSION_KEY = "filler_staff_session_v1";
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch {}
  const publicHeaders = () => ({ apikey: PUBLIC_KEY, Accept: "application/json" });
  const present = () => !!(session?.access_token && session?.user?.id);
  function saveSession(value) {
    session = value;
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  }
  async function refresh() {
    if (!session?.refresh_token) return null;
    try {
      const res = await fetch(BASE + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST", headers: { ...publicHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      if (!res.ok) throw new Error("Sesión caducada");
      const data = await res.json();
      saveSession(data); return data;
    } catch { saveSession(null); return null; }
  }
  async function token() {
    if (!present()) return null;
    if (session.expires_at && session.expires_at < Math.floor(Date.now()/1000)+60) await refresh();
    return session?.access_token || null;
  }
  async function request(path,{method="GET",body=null,staff=false,prefer=null}={}) {
    const auth = staff ? await token() : null;
    if (staff && !auth) throw new Error("Inicia sesión como personal autorizado.");
    const headers = { ...publicHeaders() };
    if (auth) headers.Authorization = "Bearer " + auth;
    if (body !== null) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer=prefer;
    let response;
    try{
      response = await fetch(BASE+"/rest/v1/"+path,{ method, headers, body:body===null?undefined:JSON.stringify(body),cache:"no-store" });
    }catch{ throw new Error("No se puede conectar a Supabase. Comprueba la conexión a internet."); }
    let payload = await response.text();
    try {payload = payload ? JSON.parse(payload):null} catch {}
    if (!response.ok) throw new Error(payload?.message || payload?.hint || "Error de Supabase ("+response.status+")");
    return payload;
  }
  // Identificadores internos de Auth: no son contraseñas ni requieren correo al iniciar sesión.
  // Crear estas cuentas de forma privada en Supabase Authentication > Users.
  const USER_ACCOUNTS = Object.freeze({
    admin: "filler.admin@proyectocompas.com",
    cocina: "filler.cocina@proyectocompas.com"
  });
  async function login(username,password) {
    const account=String(username||"").trim().toLowerCase();
    const email=USER_ACCOUNTS[account];
    if(!email || typeof password!=="string" || !password) {
      throw new Error("Usuario o contraseña incorrectos.");
    }
    const res=await fetch(BASE+"/auth/v1/token?grant_type=password",{
      method:"POST",headers:{...publicHeaders(),"Content-Type":"application/json"},
      body:JSON.stringify({email,password})
    });
    const data=await res.json();
    if (!res.ok || !data.access_token) throw new Error("Usuario o contraseña incorrectos.");
    saveSession(data);
    try {
      const staff = await request("filler_staff?select=user_id,role&user_id=eq."+encodeURIComponent(data.user.id),{staff:true});
      if (!staff?.length) throw new Error("Este usuario todavía no está autorizado para operar Filler Café.");
      // El perfil Auth y el rol permitido deben coincidir con el nombre de usuario elegido.
      const expectedRole=account==="admin"?"admin":"cocina";
      if(staff[0].role!==expectedRole) throw new Error("Los permisos de este usuario necesitan revisión.");
      return staff[0];
    } catch(error) {saveSession(null);throw error;}
  }
  async function staffRole() {
    if (!present()) return null;
    try{
      const data=await request("filler_staff?select=user_id,role&user_id=eq."+encodeURIComponent(session.user.id),{staff:true});
      return data?.[0]?.role || null;
    } catch {return null;}
  }
  async function orders() {
    const rows=await request("filler_orders?select=id,public_code,customer,phone,pickup,notes,status,total,created_at,status_updated_at,filler_order_items(id,name,price,qty,extras)&order=created_at.desc&limit=90",{staff:true});
    return (rows||[]).map(o=>({
      id:o.public_code, uuid:o.id, customer:o.customer,phone:o.phone,pickup:o.pickup,notes:o.notes,
      status:o.status,total:Number(o.total), createdTs:new Date(o.created_at).getTime(),
      statusUpdatedAt:new Date(o.status_updated_at).getTime(),
      items:(o.filler_order_items||[]).map(i=>({id:i.id,qty:i.qty,name:i.name,price:Number(i.price),extras:i.extras||[]}))
    }));
  }
  async function updateOrder(id,status) {
    if (!["Preparando","Listo","Entregado"].includes(status)) throw new Error("Estado no válido.");
    return request("filler_orders?id=eq."+encodeURIComponent(id),{
      method:"PATCH", staff:true, body:{ status,status_updated_at:new Date().toISOString() },prefer:"return=minimal"
    });
  }
  async function catalog() {
    const rows=await request("filler_products?select=id,category,name,price,stock,image_url,active&active=eq.true&order=category.asc,name.asc");
    return (rows||[]).map(i=>({id:i.id,cat:i.category,name:i.name,price:Number(i.price),stock:Number(i.stock),image:i.image_url||""}));
  }
  async function extras() {
    const rows=await request("filler_extras?select=id,name,price,enabled&enabled=eq.true&order=name.asc");
    return (rows||[]).map(i=>({id:i.id,name:i.name,price:Number(i.price),enabled:true}));
  }
  async function placeOrder(data) {
    const result=await request("rpc/filler_place_order",{method:"POST",body:data});
    if (!result?.code) throw new Error("No hubo confirmación del servidor.");
    return result;
  }
  async function importCatalog(items) {
    if (!Array.isArray(items)||!items.length) throw new Error("No hay platillos para subir.");
    if ((await staffRole())!=="admin") throw new Error("Solo un administrador puede sincronizar el menú.");
    const records=items.map(i=>({
      id:i.id, category:i.cat, name:i.name, price:Number(i.price),stock:Number(i.stock),
      image_url:i.image?.startsWith("https://")?i.image:null,active:true
    }));
    return request("filler_products?on_conflict=id",{method:"POST",staff:true,body:records,prefer:"resolution=merge-duplicates,return=minimal"});
  }
  async function importExtras(items){
    if ((await staffRole())!=="admin") throw new Error("No tienes permisos de administrador.");
    const safe=(items||[]).filter(i=>i && i.price!==null && Number.isFinite(Number(i.price)) && Number(i.price)>=0)
      .map(i=>({id:i.id,name:i.name,price:Number(i.price),enabled:!!i.enabled}));
    if (safe.length) await request("filler_extras?on_conflict=id",{method:"POST",staff:true,body:safe,prefer:"resolution=merge-duplicates,return=minimal"});
  }
  function logout(){saveSession(null);}
  window.FillerCloud=Object.freeze({login,logout,staffRole,orders,updateOrder,catalog,extras,placeOrder,importCatalog,importExtras,present});
})();
