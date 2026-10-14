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
    if(o.status==="Cancelado")return {cls:"done",line:"ok",label:"Cancelado",detail:"Pedido cancelado"};
    return {cls:"new",line:"wait",label:"Nuevo",detail:min(age)+" min desde que entró"};
  }
  const sections=[
    {title:"🟡 Por preparar",status:"Nuevo"},
    {title:"🔵 En preparación",status:"Preparando"},
    {title:"🟢 Listos para entregar",status:"Listo"},
    {title:"⚪ Entregados",status:"Entregado"},
    {title:"⚫ Cancelados",status:"Cancelado"}
  ];
  function render(){
    if(!orders.length){
      root.innerHTML='<div class="empty">No hay pedidos reales registrados en Supabase.</div>';
      return;
    }
    root.innerHTML=sections.map(group=>{
      const filtered=orders.filter(o=>o.status===group.status)
        .sort((a,b)=>group.status==="Entregado"?b.createdTs-a.createdTs:a.createdTs-b.createdTs);
      if(!filtered.length)return "";
      return '<section class="kitchen-group"><h2>'+group.title+' <small>('+filtered.length+')</small></h2>'+
        '<div class="kitchen-orders">'+filtered.map(o=>{
          const s=statusRow(o);
          const items=(Array.isArray(o.items)?o.items:[]).map(i=>
            '<div class="order-product"><strong class="order-qty">'+Number(i.qty)+'×</strong><div><b>'+escape(i.name)+'</b>'+
            (i.extras?.length?'<div class="note"><strong>Extras:</strong> '+i.extras.map(e=>escape(e.name)).join(", ")+'</div>':"")+
            '</div></div>'
          ).join("");
          const date=new Date(o.createdTs);
          const time=Number.isFinite(date.getTime())?date.toLocaleString("es-MX",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
          return '<article class="order-card '+s.line+'" data-order-id="'+escape(o.uuid)+'">'+
            '<div class="progress"><span class="dot '+s.cls+'">'+s.label+'</span><span class="timer">'+escape(s.detail)+'</span></div>'+
            '<div class="order-heading"><h3>'+escape(o.id)+'</h3><span>'+escape(time)+'</span></div>'+
            '<div><strong>Cliente:</strong> '+escape(o.customer)+'</div>'+
            '<div><strong>Recoge:</strong> '+escape(o.pickup)+' · '+escape(o.phone)+'</div>'+
            '<div class="order-products">'+items+'</div>'+
            (o.notes?'<div class="order-notes"><strong>Indicaciones:</strong> '+escape(o.notes)+'</div>':"")+
            '<div class="order-total">Total: '+money(o.total)+'</div>'+
            '<div class="actions print-actions">'+
            '<button type="button" data-print="'+escape(o.uuid)+'" data-kind="cocina">🖨 Imprimir comanda</button>'+
            '<button type="button" class="secondary" data-print="'+escape(o.uuid)+'" data-kind="cliente">Ticket cliente</button>'+
            '</div>'+
            (o.status==="Listo"?
              '<div class="actions whatsapp-actions"><button type="button" data-whatsapp="'+escape(o.uuid)+'">📱 Avisar al cliente por WhatsApp</button><span class="note">Abre WhatsApp: pulsa Enviar para avisar.</span></div>':"")+
            (!["Entregado","Cancelado"].includes(o.status)?'<div class="actions state-actions">'+
            (o.status==="Nuevo"?'<button type="button" data-change="'+escape(o.uuid)+'" data-status="Preparando">Preparando</button>':"")+
            (o.status!=="Listo"?'<button type="button" data-change="'+escape(o.uuid)+'" data-status="Listo">Listo</button>':"")+
            '<button type="button" data-change="'+escape(o.uuid)+'" data-status="Entregado">Entregado</button></div>':"")+
            '</article>';
        }).join("")+'</div></section>';
    }).join("");
  }
  // Un único controlador, preservado aunque los pedidos se refresquen cada tres segundos.
  root.addEventListener("click",async event=>{
    const button=event.target.closest("button");
    if(!button||!root.contains(button))return;
    const printId=button.dataset.print;
    const changeId=button.dataset.change;
    if(printId){
      const order=orders.find(o=>o.uuid===printId);
      if(!order)return message("No se encontró el pedido. Actualiza la lista.",true);
      try{FillerTickets.print(order,button.dataset.kind);}catch(error){message("No se pudo imprimir: "+error.message,true);}
      return;
    }
    if(button.dataset.whatsapp){
      const order=orders.find(o=>o.uuid===button.dataset.whatsapp);
      const url=FillerCloud.readyWhatsappUrl(order);
      if(!url){message("No hay un teléfono válido para enviar WhatsApp a este pedido.",true);return;}
      window.open(url,"_blank","noopener,noreferrer");
      message("Se abrió WhatsApp para el pedido "+order.id+". Pulsa Enviar para notificar al cliente.");
      return;
    }
    if(!changeId)return;
    button.disabled=true;
    try{await FillerCloud.updateOrder(changeId,button.dataset.status);await poll();}
    catch(error){message(error.message,true);}
    finally{button.disabled=false;}
  });
  function activationUI(){
    access.innerHTML='<div class="actions"><button id="kitchen-sound" type="button">🔔 Activar notificaciones y probar sonido</button><label class="paper-choice">Papel: <select id="kitchen-paper" aria-label="Ancho de papel"><option value="80">80 mm</option><option value="58">58 mm</option></select></label><button id="kitchen-exit" class="secondary" type="button">Cerrar sesión</button><span id="sound-status" class="muted">Activa las notificaciones en este equipo</span></div>';
    const paperInput=document.getElementById("kitchen-paper");
    paperInput.value=FillerTickets.paper();
    paperInput.addEventListener("change",()=>FillerTickets.setPaper(paperInput.value));
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
