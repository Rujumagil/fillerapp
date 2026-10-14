/* Filler Café - cocina conectada, pedidos de la nube y alarma audible. */
(() => {
  "use strict";
  const root=document.getElementById("orders");
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>"$"+Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:2});
  const min=n=>Math.max(0,Math.floor(n/60000));
  let role=null, orders=[], running=false, timer=null;
  const shell=document.createElement("section");
  shell.className="card";
  shell.style.marginBottom="12px";
  root.parentElement.before(shell);
  shell.innerHTML='<div id="filler-kitchen-info" class="muted">Conectando con Supabase…</div><div id="filler-kitchen-access"></div>';
  const info=document.getElementById("filler-kitchen-info");
  const access=document.getElementById("filler-kitchen-access");
  function message(m,bad=false){info.textContent=m;info.style.color=bad?"#b64235":"#155b42";}
  const notifier=FillerOrderNotifications.create({onStatus:message});
  function loginForm(){
    access.innerHTML='<form id="kitchen-login" style="display:grid;gap:10px;max-width:480px;margin:15px 0"><label>Usuario<input name="username" type="text" placeholder="admin o cocina" autocapitalize="none" spellcheck="false" required autocomplete="username"></label><label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">Entrar a cocina</button></form>';
    const form=document.getElementById("kitchen-login");
    form.addEventListener("submit",async ev=>{
      ev.preventDefault(); const submit=form.querySelector("button");submit.disabled=true;
      try{role=(await FillerCloud.login(form.elements.namedItem("username").value,form.elements.namedItem("password").value)).role;start();}catch(err){message(err.message,true);}
      finally{submit.disabled=false;}
    });
    root.innerHTML='<div class="empty">Ingresa con usuario y contraseña para ver los pedidos reales. Usa la cuenta admin o cocina autorizada.</div>';
  }
  function statusRow(o){
    const age=Date.now()-o.createdTs;
    const since=Date.now()-o.statusUpdatedAt;
    if(["Nuevo","Preparando"].includes(o.status)&&age>600000) return {cls:"late",line:"alert",label:"Fuera de tiempo",detail:min(age)+" min desde que entró"};
    if(o.status==="Listo"&&since>600000) return {cls:"late",line:"alert",label:"Fuera de tiempo",detail:min(since)+" min esperando recolección"};
    if(o.status==="Listo")return {cls:"ready",line:"ok",label:"Listo",detail:"Listo hace "+min(since)+" min"};
    if(o.status==="Preparando")return {cls:"prep",line:"wait",label:"Preparando",detail:min(age)+" min preparando"};
    if(o.status==="Entregado")return {cls:"done",line:"ok",label:"Entregado",detail:"Pedido cerrado"};
    return {cls:"new",line:"wait",label:"Nuevo",detail:min(age)+" min desde que entró"};
  }
  function render(){
    root.innerHTML=orders.length ? orders.map(o=>{
      const s=statusRow(o);
      const items=o.items.map(i=>'<div style="margin:3px 0">'+Number(i.qty)+' × '+escape(i.name)+
        (i.extras?.length?'<div class="note"><b>Extras:</b> '+i.extras.map(e=>escape(e.name)).join(", ")+'</div>':"")+'</div>').join("");
      return '<div class="line '+s.line+'"><div class="progress"><span class="dot '+s.cls+'">'+s.label+'</span><span class="timer">'+s.detail+'</span></div>'+
        '<b>'+escape(o.id)+' — '+escape(o.customer)+'</b><br><span>'+escape(o.phone)+' | Recoge: '+escape(o.pickup)+'</span>'+
        '<div>'+items+'</div><b>'+money(o.total)+'</b>'+(o.notes?'<div class="note">Notas: '+escape(o.notes)+'</div>':"")+
        (o.status!=="Entregado"?'<div class="actions">'+
        (o.status==="Nuevo"?'<button data-change="'+escape(o.uuid)+'" data-status="Preparando">Preparando</button>':"")+
        (o.status!=="Listo"?'<button data-change="'+escape(o.uuid)+'" data-status="Listo">Listo</button>':"")+
        '<button data-change="'+escape(o.uuid)+'" data-status="Entregado">Entregado</button></div>':"")+
        '</div>';
    }).join(""):'<div class="empty">No hay pedidos reales registrados en Supabase.</div>';
    root.querySelectorAll("[data-change]").forEach(btn=>btn.addEventListener("click",async()=>{
      btn.disabled=true;
      try{await FillerCloud.updateOrder(btn.dataset.change,btn.dataset.status);await poll();}catch(err){message(err.message,true);}
      finally{btn.disabled=false;}
    }));
  }
  function activationUI(){
    access.innerHTML='<div class="actions"><button id="kitchen-sound" type="button">🔔 Activar notificaciones y probar sonido</button><button id="kitchen-exit" class="secondary" type="button">Cerrar sesión</button><span id="sound-status" class="muted">Activa las notificaciones en este equipo</span></div>';
    const test=document.getElementById("kitchen-sound");
    test.addEventListener("click",async()=>{
      test.disabled=true;
      try{
        const active=await notifier.enable();
        document.getElementById("sound-status").textContent=active.notifications?"✓ Avisos del sistema habilitados":"El aviso visual funciona; activa permisos para avisos del sistema";
        test.textContent="🔔 Probar notificación nuevamente";
      }finally{test.disabled=false;}
    });
    document.getElementById("kitchen-exit").addEventListener("click",()=>{
      FillerCloud.logout();role=null;if(timer)clearTimeout(timer);timer=null;loginForm();message("Sesión cerrada.");
    });
  }
  async function poll(){
    if(!role || running)return;
    running=true;
    try{
      const fresh=await FillerCloud.orders();
      notifier.incoming(fresh);
      orders=fresh;render();
      message("En línea con Supabase · "+new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",second:"2-digit"})+" · Pedidos sincronizados cada 3 segundos");
    }catch(err){message("Sin conexión a pedidos: "+err.message,true);}
    finally {running=false;if(role)timer=setTimeout(poll,3000);}
  }
  async function start(){activationUI();await poll();}
  (async()=>{
    role=await FillerCloud.staffRole();
    if(role)await start();else{message("Inicia sesión para recibir pedidos en esta computadora.");loginForm();}
  })();
})();
