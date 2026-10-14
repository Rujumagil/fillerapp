/* Sincronización inicial del catálogo. No sobrescribe existencias de una tienda ya activa. */
(() => {
  "use strict";
  const host=document.createElement("section");
  host.className="card";host.id="filler-cloud-setup";host.style.marginTop="18px";
  host.innerHTML='<h2>Conexión con cocina en la nube</h2><p class="muted">Aquí se activa la sincronización con Supabase para que todos los equipos vean los pedidos. Solo personal administrador autorizado.</p><div id="filler-cloud-message" role="status" aria-live="polite" style="margin:12px 0;color:#075b3c;font-weight:750"></div><div id="filler-cloud-access"></div>';
  document.querySelector("#extras-control")?.after(host);
  if(!host.isConnected)document.querySelector("main")?.append(host);
  const message=document.getElementById("filler-cloud-message"),actions=document.getElementById("filler-cloud-access");
  if(window.location.hash==="#filler-cloud-setup"){requestAnimationFrame(()=>host.scrollIntoView({block:"start"}));}

  function notify(v,error=false){message.textContent=v;message.style.color=error?"#b64235":"#075b3c";}
  async function showAdmin(){
    const localSaved=localStorage.getItem("fillerMenu");
    actions.innerHTML='<div class="actions"><button type="button" id="filler-sync-first">Sincronizar menú para pedidos reales</button><button type="button" id="filler-sync-extras" class="secondary">Sincronizar extras</button><button type="button" id="filler-cloud-signout" class="secondary">Cerrar sesión</button></div>'+
      '<p class="muted" style="font-size:12px">La primera sincronización sube nombres, precios y existencias guardados en ESTE navegador. No se modificará ningún catálogo remoto que ya tenga productos. Las fotos almacenadas en el dispositivo no se publican automáticamente en otros equipos.</p>'+
      (localSaved?'<p class="edit-hint">Menú local detectado: '+menu.length+' productos. Comprueba nombres, precios y existencias antes de sincronizar.</p>':
      '<p class="edit-hint" style="color:#994a21">Este navegador NO tiene un menú personalizado guardado. Abre esta página en la computadora o navegador donde hiciste los cambios. No vamos a importar un menú de ejemplo por error.</p>');
    document.getElementById("filler-cloud-signout").addEventListener("click",()=>{FillerCloud.logout();renderLogin();notify("Sesión cerrada.");});
    document.getElementById("filler-sync-first").addEventListener("click",async ev=>{
      const btn=ev.currentTarget;btn.disabled=true;
      try {
        const exists=await FillerCloud.catalog();
        if(exists.length)throw new Error("Ya existe un catálogo en la nube. Para proteger existencias y pedidos, esta primera importación no lo sobreescribe.");
        if(!localStorage.getItem("fillerMenu"))throw new Error("No existe un menú guardado en este navegador. Usa el equipo donde configuraste los platillos.");
        if(!menu.length)throw new Error("No hay productos en este navegador.");
        if(menu.some(p=>!p||!p.id||!p.name||!p.cat||!Number.isFinite(Number(p.price))||Number(p.price)<0||!Number.isInteger(Number(p.stock))||Number(p.stock)<0)){
          throw new Error("Hay productos con datos o precios incorrectos. Revisa el menú antes de importarlo.");
        }
        if(!confirm("¿Subir "+menu.length+" productos con sus precios y existencias actuales a Supabase? Revisa primero los datos. Esta acción habilitará pedidos reales."))return;
        await FillerCloud.importCatalog(menu);
        const imported=await FillerCloud.catalog();
        if(imported.length!==menu.length)throw new Error("Se enviaron productos, pero la verificación no coincide. Se recibieron "+imported.length+" de "+menu.length+". No vuelvas a importar hasta revisar.");
        notify("✓ "+imported.length+" productos sincronizados y verificados en Supabase. Ahora sincroniza los extras; la página pública todavía está en modo local.");

      } catch(err){notify(err.message,true);} finally {btn.disabled=false;}
    });
    document.getElementById("filler-sync-extras").addEventListener("click",async e=>{
      const button=e.currentTarget;button.disabled=true;
      try{
        let extras=[];try{extras=JSON.parse(localStorage.getItem("fillerExtras")||"[]");}catch{}
        if(!Array.isArray(extras)||!extras.length)throw new Error("No hay extras configurados en este navegador.");
        await FillerCloud.importExtras(extras);
        notify("✓ Extras con precio sincronizados correctamente.");
      }catch(error){notify("Extras no sincronizados: "+error.message,true);}
      finally{button.disabled=false;}
    });
    try{
      const remote=await FillerCloud.catalog();
      notify(remote.length?"La nube ya contiene "+remote.length+" productos. La primera importación está bloqueada para proteger precios y existencias.":"Catálogo remoto vacío. "+(localSaved?"Puedes sincronizar los "+menu.length+" platillos guardados.":"Abre esta página en el navegador con el menú guardado."));
      document.getElementById("filler-sync-first").disabled=!!remote.length||!localSaved;
    }catch(error){notify("No se pudo comprobar el catálogo remoto: "+error.message,true);document.getElementById("filler-sync-first").disabled=true;}
  }
  function renderLogin(){
    actions.innerHTML='<form id="filler-cloud-form" class="form"><label>Usuario administrador<input name="username" type="text" placeholder="admin" autocapitalize="none" spellcheck="false" autocomplete="username" required></label><label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">Entrar como administrador</button></form>';
    document.getElementById("filler-cloud-form").addEventListener("submit",async e=>{
      e.preventDefault();const f=e.currentTarget,button=f.querySelector("button");button.disabled=true;
      try {
        const staff=await FillerCloud.login(f.elements.namedItem("username").value,f.elements.namedItem("password").value);
        if(staff.role!=="admin"){FillerCloud.logout();throw new Error("Este usuario no tiene permiso de administrador Filler Café.");}
        await showAdmin();
      }catch(err){notify(err.message,true);}finally{button.disabled=false;}
    });
  }
  (async()=>{const role=await FillerCloud.staffRole();if(role==="admin")await showAdmin();else{renderLogin();notify("Para activar cocina, entra con la cuenta administradora autorizada.");}})();
})();
