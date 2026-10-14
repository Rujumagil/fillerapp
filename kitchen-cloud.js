/* Filler Café - cocina conectada, pedidos de la nube y alarma audible. */
(() => {
  "use strict";
  const root=document.getElementById("orders");
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>"$"+Number(n||0).toLocaleString("es-MX",{minimumFractionDigits:0,maximumFractionDigits:2});
  const min=n=>Math.max(0,Math.floor(n/60000));
  let role=null, orders=[], running=false, alarm=null, sound=false, timer=null;
  const seenKey="filler_kitchen_seen_orders_v1";
  let seen=[];
  try{seen=JSON.parse(localStorage.getItem(seenKey)||"[]");if(!Array.isArray(seen))seen=[];}catch{}
  const shell=document.createElement("section");
  shell.className="card";
  shell.style.marginBottom="12px";
  root.parentElement.before(shell);
  shell.innerHTML='<div id="filler-kitchen-info" class="muted">Conectando con Supabase…</div><div id="filler-kitchen-access"></div>';
  const info=document.getElementById("filler-kitchen-info");
  const access=document.getElementById("filler-kitchen-access");
  function message(m,bad=false){info.textContent=m;info.style.color=bad?"#b64235":"#155b42";}
  function loginForm(){
    access.innerHTML='<form id="kitchen-login" style="display:grid;gap:10px;max-width:480px;margin:15px 0"><label>Correo del personal<input name="email" type="email" required autocomplete="username"></label><label>Contraseña<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">Entrar a cocina</button></form>';
    const form=document.getElementById("kitchen-login");
    form.addEventListener("submit",async ev=>{
      ev.preventDefault(); const submit=form.querySelector("button");submit.disabled=true;
      try{role=(await FillerCloud.login(form.email.value,form.password.value)).role;start();}catch(err){message(err.message,true);}
      finally{submit.disabled=false;}
    });
    root.innerHTML='<div class="empty">Inicia sesión para recibir pedidos reales de clientes. Este equipo solo mostrará órdenes autorizadas.</div>';
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
  function beep() {
    if(!sound||!alarm)return;
    alarm.resume().then(()=>{
      const now=alarm.currentTime;
      for(let i=0;i<3;i++){
        const osc=alarm.createOscillator(),gain=alarm.createGain();
        osc.type="sine";osc.frequency.value=i===1?740:950;
        gain.gain.setValueAtTime(0,now+i*.35);
        gain.gain.linearRampToValueAtTime(.14,now+i*.35+.025);
        gain.gain.exponentialRampToValueAtTime(.002,now+i*.35+.25);
        osc.connect(gain);gain.connect(alarm.destination);
        osc.start(now+i*.35);osc.stop(now+i*.35+.27);
      }
    }).catch(err=>message("El navegador bloqueó el audio: "+err.message,true));
  }
  function notify(o){
    beep();
    if("Notification" in window && Notification.permission==="granted" && document.visibilityState!=="visible"){
      new Notification("☕ Nuevo pedido Filler Café",{body:o.id+" — "+o.customer,icon:"assets/filler-icon-192.png"});
    }
  }
  function activationUI(){
    access.innerHTML='<div class="actions"><button id="kitchen-sound" type="button">🔊 Activar sonido y probar alarma</button><button id="kitchen-exit" class="secondary" type="button">Cerrar sesión</button><span id="sound-status" class="muted">Sonido pendiente de activar</span></div>';
    document.getElementById("kitchen-sound").addEventListener("click",async()=>{
      try {
        if(!alarm)alarm=new (window.AudioContext||window.webkitAudioContext)();
        await alarm.resume();sound=true;beep();
        document.getElementById("sound-status").textContent="✓ Alarma activada (mantén abierta esta pestaña)";
        if("Notification" in window&&Notification.permission==="default")await Notification.requestPermission();
      }catch(err){message("No se pudo activar sonido: "+err.message,true);}
    });
    document.getElementById("kitchen-exit").addEventListener("click",()=>{
      FillerCloud.logout();role=null;sound=false;if(timer)clearTimeout(timer);timer=null;loginForm();message("Sesión cerrada.");
    });
  }
  async function poll(){
    if(!role || running)return;
    running=true;
    try{
      const fresh=await FillerCloud.orders();
      const added=fresh.filter(o=>o.status==="Nuevo"&&!seen.includes(o.uuid)&&Date.now()-o.createdTs<30*60000);
      for(const o of added){notify(o);}
      if(added.length){
        seen=[...new Set([...seen,...added.map(o=>o.uuid)])].slice(-300);
        try{localStorage.setItem(seenKey,JSON.stringify(seen));}catch{}
      }
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
