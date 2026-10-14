/* Sincronización inicial del catálogo. No sobrescribe existencias de una tienda ya activa. */
(() => {
  "use strict";
  const host=document.createElement("section");
  host.className="card";host.style.marginTop="18px";
  host.innerHTML='<h2>Conexión con cocina en la nube</h2><p class="muted">Aquí se activa la sincronización con Supabase para que todos los equipos vean los pedidos. Solo personal administrador autorizado.</p><div id="filler-cloud-message" role="status" aria-live="polite" style="margin:12px 0;color:#075b3c;font-weight:750"></div><div id="filler-cloud-access"></div>';
  document.querySelector("#extras-control")?.after(host);
  if(!host.isConnected)document.querySelector("main")?.append(host);
  const message=document.getElementById("filler-cloud-message"),actions=document.getElementById("filler-cloud-access");
  function notify(v,error=false){message.textContent=v;message.style.color=error?"#b64235":"#075b3c";}
  async function showAdmin(){
    actions.innerHTML='<div class="actions"><button type="button" id="filler-sync-first">Sincronizar menú para pedidos reales</button><button type="button" id="filler-cloud-signout" class="secondary">Salir de Supabase</button></div><p class="muted" style="font-size:12px">La primera sincronización sube nombres, precios y existencias de este navegador. Las fotografías aún requieren almacenamiento público en la nube. No se sobreescribirá un catálogo que ya tenga productos.</p>';
    document.getElementById("filler-cloud-signout").addEventListener("click",()=>{FillerCloud.logout();renderLogin();notify("Sesión cerrada.");});
    document.getElementById("filler-sync-first").addEventListener("click",async ev=>{
      const btn=ev.currentTarget;btn.disabled=true;
      try {
        const exists=await FillerCloud.catalog();
        if(exists.length)throw new Error("Ya existe un catálogo en la nube. Para proteger existencias y pedidos, esta primera importación no lo sobreescribe.");
        if(!menu.length)throw new Error("No hay productos en este navegador.");
        if(!confirm("¿Subir "+menu.length+" productos con sus precios y existencias actuales a Supabase? Revisa primero los datos. Esta acción habilitará pedidos reales."))return;
        await FillerCloud.importCatalog(menu);
        let extras=[];try{extras=JSON.parse(localStorage.getItem("fillerExtras")||"[]");}catch{}
        await FillerCloud.importExtras(extras);
        notify("✓ Catálogo inicial sincronizado. Abre el menú público y el monitor de cocina para probar los pedidos.");
      } catch(err){notify(err.message,true);} finally {btn.disabled=false;}
    });
    const remote=await FillerCloud.catalog();
    notify(remote.length?"Hay "+remote.length+" productos compartidos en Supabase. No se modificará el catálogo mediante la importación inicial.":"La nube todavía no tiene productos. Puedes importar los "+menu.length+" platillos locales.");
  }
  function renderLogin(){
    actions.innerHTML='<form id="filler-cloud-form" class="form"><label>Correo del administrador<input name="email" type="email" required autocomplete="username"></label><label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">Entrar como administrador</button></form>';
    document.getElementById("filler-cloud-form").addEventListener("submit",async e=>{
      e.preventDefault();const f=e.currentTarget,button=f.querySelector("button");button.disabled=true;
      try {
        const staff=await FillerCloud.login(f.email.value,f.password.value);
        if(staff.role!=="admin"){FillerCloud.logout();throw new Error("Este usuario no tiene permiso de administrador Filler Café.");}
        await showAdmin();
      }catch(err){notify(err.message,true);}finally{button.disabled=false;}
    });
  }
  (async()=>{const role=await FillerCloud.staffRole();if(role==="admin")await showAdmin();else{renderLogin();notify("Para activar cocina, entra con la cuenta administradora autorizada.");}})();
})();
