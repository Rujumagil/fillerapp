/* CRM de clientes Filler Café — acceso administrativo exclusivamente desde Supabase Auth. */
(() => {
  "use strict";
  const API="https://qwxydjotwhniahaovrff.supabase.co/functions/v1/filler-clientes-admin";
  const el=id=>document.getElementById(id);
  const notice=(text,error=false)=>{
    const box=el("crm-notice");
    box.textContent=text;box.classList.toggle("error",error);box.hidden=!text;
  };
  let customers=[],selected=null,secret="",working=false;
  const date=value=>{
    if(!value)return "Sin actividad";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-MX",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  };
  async function authHeader(){
    const session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
    if(!session?.access_token)throw Error("Tu sesión terminó. Vuelve a iniciar sesión.");
    return session.access_token;
  }
  async function call(action,payload={}){
    const jwt=await authHeader();
    const result=await fetch(API,{
      method:"POST",mode:"cors",cache:"no-store",
      headers:{"authorization":"Bearer "+jwt,"apikey":"sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3","content-type":"application/json"},
      body:JSON.stringify({action,...payload})
    });
    let data={};
    try{data=await result.json()}catch{}
    if(!result.ok)throw Error(data.error||"No pudimos conectar con el CRM ("+result.status+").");
    return data;
  }
  async function loadDirectory(){
    const jwt=await authHeader();
    const response=await fetch(
      "https://qwxydjotwhniahaovrff.supabase.co/rest/v1/rpc/filler_admin_customer_directory",
      {
        method:"POST",mode:"cors",cache:"no-store",
        headers:{
          "authorization":"Bearer "+jwt,
          "apikey":"sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3",
          "content-type":"application/json"
        },
        body:"{}"
      }
    );
    const data=await response.json().catch(()=>null);
    if(!response.ok||!Array.isArray(data)){
      if(response.status===401||response.status===403)
        throw Error("Tu acceso de administrador necesita validación. Cierra sesión y vuelve a ingresar.");
      throw Error("No se pudo recuperar el directorio de Supabase ("+response.status+").");
    }
    return {customers:data,total:data.length,partial:false};
  }
  function rowCell(tr,text,small=""){
    const td=tr.insertCell();
    const name=document.createElement("strong");name.textContent=text;
    td.append(name);
    if(small){const sm=document.createElement("small");sm.textContent=small;td.append(sm);}
    return td;
  }
  function draw(){
    const term=el("crm-search").value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
    const view=customers.filter(c=>{
      const haystack=[c.name,c.email,c.phone].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      return haystack.includes(term);
    });
    el("crm-count").textContent=customers.length;
    el("crm-confirmed").textContent=customers.filter(c=>c.confirmed).length;
    el("crm-pending").textContent=customers.filter(c=>!c.confirmed).length;
    const body=el("crm-rows");body.replaceChildren();
    if(!view.length){
      const tr=document.createElement("tr"),td=tr.insertCell();
      td.colSpan=5;td.className="empty";td.textContent=term?"No encontramos clientes con esta búsqueda.":"Todavía no hay registros de Mi Filler.";
      body.append(tr);
    }
    for(const c of view){
      const tr=document.createElement("tr");
      rowCell(tr,c.name||"Sin nombre",c.profile_completed?"Perfil registrado":"Perfil pendiente");
      rowCell(tr,c.email||"Sin correo",c.phone||"Sin teléfono");
      rowCell(tr,date(c.registered_at),"Último acceso: "+date(c.last_sign_in));
      const state=tr.insertCell();
      const flag=document.createElement("span");
      flag.className="status"+(c.confirmed?"":" pending");
      flag.textContent=c.confirmed?"✓ Confirmado":"Pendiente de activar";
      state.append(flag);
      if(c.temporary_pending){
        const tag=document.createElement("span");tag.className="status reset";tag.style.marginTop="5px";tag.textContent="Cambio de clave pendiente";state.append(document.createElement("br"),tag);
      }
      const action=tr.insertCell(),button=document.createElement("button");
      button.type="button";button.className="outline";button.textContent="Restablecer acceso";
      button.disabled=!c.confirmed;
      button.title=c.confirmed?"Generar contraseña temporal":"Primero debe confirmar su correo";
      button.addEventListener("click",()=>openReset(c.id));
      action.append(button);
      body.append(tr);
    }
    el("crm-showing").textContent="Mostrando "+view.length+" de "+customers.length+" cuentas"+(term?" para la búsqueda":"")+".";
  }
  async function load(){
    el("crm-refresh").disabled=true;notice("Actualizando registros…");
    try{
      const response=await loadDirectory();
      if(!Array.isArray(response.customers))throw Error("El servidor no devolvió un directorio válido.");
      customers=response.customers;
      draw();
      notice(response.partial?"Mostramos parte del directorio. Contacta al administrador para revisar el límite de registros.":"✓ Directorio actualizado.");
    }catch(error){
      // Un error de red no significa que el CRM tenga cero clientes.
      if(!customers.length){
        for(const id of ["crm-count","crm-confirmed","crm-pending"])el(id).textContent="—";
        const tr=document.createElement("tr"),td=tr.insertCell();
        td.colSpan=5;td.className="empty";
        td.textContent="No pudimos consultar los registros. Intenta «Actualizar».";
        el("crm-rows").replaceChildren(tr);
        el("crm-showing").textContent="Datos no disponibles temporalmente.";
      }
      notice("No se pudieron cargar los clientes: "+error.message,true);
    }finally{el("crm-refresh").disabled=false;}
  }
  async function enter(){
    const role=await FillerCloud.staffRole();
    if(role!=="admin"){
      el("crm-dashboard").hidden=true;
      el("crm-login").hidden=false;
      if(role)notice("Esta cuenta no tiene permisos de administrador.",true);
      return;
    }
    el("crm-login").hidden=true;el("crm-dashboard").hidden=false;
    await load();
  }
  function clearSecret(){
    secret="";selected=null;el("crm-temp-value").textContent="";
    el("crm-reset-result").hidden=true;el("crm-reset-start").hidden=false;
    el("crm-reset-error").hidden=true;
  }
  function openReset(id){
    const c=customers.find(v=>v.id===id);
    if(!c||!c.confirmed)return;
    clearSecret();selected=c;
    el("crm-reset-customer").textContent="Cliente: "+c.name+" · "+c.email;
    el("crm-reset-dialog").showModal();
  }
  function closeReset(){
    if(working)return;
    el("crm-reset-dialog").close();clearSecret();
  }
  el("crm-reset-cancel").addEventListener("click",closeReset);
  el("crm-reset-close").addEventListener("click",closeReset);
  el("crm-reset-dialog").addEventListener("cancel",event=>{if(working){event.preventDefault();return;}clearSecret();});
  el("crm-reset-confirm").addEventListener("click",async()=>{
    if(!selected||working)return;
    working=true;
    el("crm-reset-confirm").disabled=true;el("crm-reset-error").hidden=true;
    try{
      const id=selected.id;
      const result=await call("create_temporary_password",{user_id:id});
      if(!result.ok||typeof result.temporary_password!=="string")throw Error("No se recibió la contraseña temporal.");
      secret=result.temporary_password;
      el("crm-temp-value").textContent=secret;
      el("crm-reset-start").hidden=true;
      el("crm-reset-result").hidden=false;
      const c=customers.find(c=>c.id===id);if(c)c.temporary_pending=true;
      draw();notice("✓ Acceso restablecido. Entrega la contraseña al titular y solicita que la cambie.");
    }catch(error){
      el("crm-reset-error").hidden=false;
      el("crm-reset-error").textContent=error.message;
    }finally{working=false;el("crm-reset-confirm").disabled=false;}
  });
  el("crm-copy-temp").addEventListener("click",async()=>{
    if(!secret)return;
    try{await navigator.clipboard.writeText(secret);el("crm-copy-temp").textContent="✓ Copiada";setTimeout(()=>{el("crm-copy-temp").textContent="Copiar contraseña";},2300);}
    catch{notice("No pudimos copiar la contraseña automáticamente.",true);}
  });
  el("crm-refresh").addEventListener("click",load);
  el("crm-search").addEventListener("input",draw);
  el("crm-logout").addEventListener("click",()=>{
    if(!el("crm-reset-dialog").open){FillerCloud.logout();customers=[];el("crm-dashboard").hidden=true;el("crm-login").hidden=false;notice("Sesión cerrada.");}
  });
  el("crm-login-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector("button[type=submit]");
    button.disabled=true;notice("");
    try{
      const result=await FillerCloud.login("admin",form.elements.password.value);
      form.elements.password.value="";
      if(result.role!=="admin")throw Error("Esta cuenta no tiene permisos de CRM.");
      await enter();
    }catch(error){notice(error.message,true)}
    finally{button.disabled=false;}
  });
  enter().catch(error=>notice("No pudimos validar la sesión: "+error.message,true));
})();