/* Fiiller Café: funciones de datos compartidos. Solo usa una clave pública. */
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
    const raw=String(username||"").trim().toLowerCase();
    const account=USER_ACCOUNTS[raw]?raw:Object.keys(USER_ACCOUNTS).find(k=>USER_ACCOUNTS[k]===raw);
    const email=account?USER_ACCOUNTS[account]:null;
    if(!email)throw new Error('Usuario no reconocido. Escribe "admin" o "cocina".');
    if(typeof password!=="string" || !password)throw new Error("Escribe tu contraseña de Fiiller Café.");
    let res;
    try {
      res=await fetch(BASE+"/auth/v1/token?grant_type=password",{
        method:"POST",headers:{...publicHeaders(),"Content-Type":"application/json"},
        body:JSON.stringify({email,password})
      });
    } catch(error) {
      throw new Error("No fue posible contactar a Supabase. Comprueba tu conexión y vuelve a intentar.");
    }
    let data;
    try{data=await res.json();}catch{throw new Error("Supabase respondió sin datos válidos. Intenta de nuevo.");}
    if (!res.ok || !data.access_token) {
      const code=String(data.error_code||data.code||data.error||"").toLowerCase();
      if(res.status===429 || code.includes("rate_limit") || code.includes("over_request"))
        throw new Error("Se alcanzó el límite de intentos. Espera unos minutos antes de intentarlo de nuevo.");
      if(code.includes("email_not_confirmed"))
        throw new Error("La cuenta todavía no está confirmada en Supabase.");
      if(code.includes("invalid_credentials") || code.includes("invalid_grant"))
        throw new Error("Supabase rechazó la contraseña. Revísala o actualízala en Authentication > Users de Supabase; la clave es la que asignaste al crear esta cuenta.");
      if(res.status===401 || res.status===403)
        throw new Error("Acceso rechazado por Supabase ("+res.status+"). Revisa que la cuenta esté activa y la conexión sea correcta.");
      throw new Error("Error de autenticación en Supabase ("+res.status+"): "+String(data.error_description||data.msg||data.message||data.error||"Intenta nuevamente.").slice(0,160));
    }
    saveSession(data);
    try {
      const staff = await request("filler_staff?select=user_id,role&user_id=eq."+encodeURIComponent(data.user.id),{staff:true});
      if (!staff?.length) throw new Error("Este usuario todavía no está autorizado para operar Fiiller Café.");
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
    const transitions = Object.freeze({
      "Nuevo": "Preparando",
      "Preparando": "Listo",
      "Listo": "Entregado"
    });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||""))) {
      throw new Error("Identificador de pedido no válido.");
    }
    if (!["Preparando","Listo","Entregado"].includes(status)) throw new Error("Estado no válido.");
    // Compare-and-set: la actualización solo procede desde el estado esperado.
    // Una respuesta vacía indica que otro dispositivo ya cambió el pedido.
    const previous = Object.keys(transitions).find(key => transitions[key] === status);
    const rows = await request(
      "filler_orders?id=eq."+encodeURIComponent(id)+"&status=eq."+encodeURIComponent(previous)+"&select=id,status",
      {method:"PATCH",staff:true,body:{status,status_updated_at:new Date().toISOString()},prefer:"return=representation"}
    );
    if (!Array.isArray(rows) || rows.length !== 1) {
      throw new Error("El pedido ya cambió de estado o no tienes permiso. Actualiza la pantalla antes de continuar.");
    }
    return rows[0];
  }
  async function orderMessages(orderId) {
    if (!/^[0-9a-f-]{36}$/i.test(String(orderId||""))) throw new Error("Pedido no válido.");
    const records=await request("filler_order_messages?select=id,kind,message,created_at&order_id=eq."+
      encodeURIComponent(orderId)+"&order=created_at.desc&limit=30",{staff:true});
    return Array.isArray(records)?records.reverse():[];
  }
  async function sendOrderMessage(orderId,text,kind="observacion") {
    const message=String(text||"").trim();
    if (!/^[0-9a-f-]{36}$/i.test(String(orderId||""))) throw new Error("Pedido no válido.");
    if (!message || message.length>500) throw new Error("El mensaje debe tener entre 1 y 500 caracteres.");
    if (!["observacion","informacion","listo"].includes(kind))throw new Error("Tipo de mensaje no permitido.");
    const rows=await request("filler_order_messages?select=id,kind,message,created_at",{
      method:"POST",staff:true,body:{order_id:orderId,message,kind},prefer:"return=representation"
    });
    if (!Array.isArray(rows)||rows.length!==1)throw new Error("No se pudo confirmar el envío del mensaje.");
    return rows[0];
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
    // Cuando el cliente inició sesión en Mi Fiiller, asociar el pedido a su
    // usuario validado por Supabase; el invitado conserva el flujo habitual.
    let customerAccess=null;
    try{
      const customer=JSON.parse(sessionStorage.getItem("filler_customer_session_v1")||"null");
      if(customer?.user?.id && customer?.access_token){
        if(customer.expires_at && customer.expires_at <= Math.floor(Date.now()/1000)+60 && customer.refresh_token){
          const refreshRes=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{
            method:"POST",headers:{...publicHeaders(),"Content-Type":"application/json"},
            body:JSON.stringify({refresh_token:customer.refresh_token})
          });
          if(refreshRes.ok){
            const updated=await refreshRes.json();
            sessionStorage.setItem("filler_customer_session_v1",JSON.stringify(updated));
            customerAccess=updated.access_token;
          }
        }else if(!customer.expires_at || customer.expires_at > Math.floor(Date.now()/1000)+60){
          customerAccess=customer.access_token;
        }
      }
    }catch(error){console.warn("Historial de cliente sin sesión válida:",error);}
    const orderHeaders={...publicHeaders(),"Content-Type":"application/json"};
    if(customerAccess)orderHeaders.Authorization="Bearer "+customerAccess;
    const response=await fetch(BASE+"/rest/v1/rpc/filler_place_order",{
      method:"POST",headers:orderHeaders,body:JSON.stringify(data),cache:"no-store"
    });
    let result=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(result?.message||"No se pudo confirmar el pedido.");
    if(!result?.code)throw new Error("No hubo confirmación del servidor.");
    return result;
  }
  async function orderStatus(token) {
    const safe=String(token||"").trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safe))
      throw new Error("Este enlace de seguimiento no es válido.");
    const value=await request("rpc/filler_order_status",{method:"POST",body:{p_token:safe}});
    if(!value?.code)throw new Error("No encontramos este pedido. Revisa el enlace.");
    return value;
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
  async function uploadProductPhoto(productId,file) {
    if ((await staffRole()) !== "admin") throw new Error("Solo el administrador puede publicar fotos.");
    if (!/^[a-z0-9][a-z0-9_-]{1,120}$/i.test(String(productId||""))) throw new Error("Producto no válido.");
    if (!(file instanceof Blob) || file.type !== "image/jpeg" || file.size > 3145728) throw new Error("La foto debe ser JPG y pesar menos de 3 MB.");
    const access = await token();
    if (!access) throw new Error("Vuelve a iniciar sesión como administrador.");
    const name = "productos/" + productId + "-" + Date.now() + "-" + Math.random().toString(36).slice(2,8) + ".jpg";
    const upload = await fetch(BASE + "/storage/v1/object/filler-product-images/" + name, {
      method:"POST",headers:{...publicHeaders(),Authorization:"Bearer "+access,"Content-Type":"image/jpeg","x-upsert":"false"},body:file
    });
    if (!upload.ok) {
      const data=await upload.json().catch(()=>({}));
      throw new Error(data.message||data.error||"No se pudo cargar la foto al almacenamiento compartido.");
    }
    const imageUrl=BASE + "/storage/v1/object/public/filler-product-images/" + name;
    const saved=await request("filler_products?id=eq."+encodeURIComponent(productId),{
      method:"PATCH",staff:true,body:{image_url:imageUrl},prefer:"return=representation"
    });
    if (!Array.isArray(saved)||saved.length!==1||saved[0].image_url!==imageUrl)
      throw new Error("La foto se guardó, pero no se pudo vincular al producto. Revisa los permisos del catálogo.");
    return imageUrl;
  }
  function logout(){saveSession(null);}
  window.FillerCloud=Object.freeze({login,logout,staffRole,orders,updateOrder,orderMessages,sendOrderMessage,catalog,extras,placeOrder,orderStatus,importCatalog,importExtras,uploadProductPhoto,present});
})();
