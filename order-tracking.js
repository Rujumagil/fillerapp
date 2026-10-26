/* Seguimiento privado del pedido de Filler Café, sin exponer datos personales. */
(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const url=new URL(location.href);
  const tokenParam=new URLSearchParams(location.hash.slice(1)).get("token");
  let lastStored=null;
  try{lastStored=JSON.parse(localStorage.getItem("filler_last_tracking_v1")||"null");}catch{}
  const token=(tokenParam||lastStored?.token||"").trim();
  let lastStatus=null, audio=null, soundEnabled=false, firstLoad=true, timer=null;
  let hasAlerts=false;
  let messagesLoaded=false,knownMessages=new Set();
  const PUSH_API="https://filler-push.proyectocompas-info.workers.dev";
  const VAPID_PUBLIC="BAbjSZ6EjTAd00X6YZApNN8O2fWj5P2o8XSQbuUJTRX9pbQ5G9dZWne12rSSu3lI3BQhslH9FHhqHtWlYyKp8oQ";
  function vapidBytes(value){
    const decoded=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
    return Uint8Array.from(decoded,ch=>ch.charCodeAt(0));
  }
  async function enableBackgroundPush(){
    if(!("serviceWorker" in navigator)||!("PushManager" in window))
      throw new Error("Este navegador no admite avisos con la página cerrada.");
    const registration=await navigator.serviceWorker.ready;
    const subscription=await registration.pushManager.getSubscription()||
      await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});
    const response=await fetch(PUSH_API+"/subscribe",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({tracking_token:token,subscription:subscription.toJSON()})
    });
    if(!response.ok)throw new Error("No se pudo registrar el dispositivo ("+response.status+").");
    return subscription;
  }
  const feedback=(text,isError=false)=>{el("feedback").textContent=text;el("feedback").className=isError?"error":"";};
  const stages={
    Nuevo:{index:0,title:"¡Ya recibimos tu pedido!",description:"Cocina tiene tu pedido. En cuanto comencemos, verás el cambio aquí."},
    Preparando:{index:1,title:"Estamos preparando tu pedido",description:"Nuestro equipo ya está trabajando para tenerlo listo."},
    Listo:{index:2,title:"¡Tu pedido está listo!",description:"Pasa a recogerlo en Filler Café. ¡Gracias por esperar!"},
    Entregado:{index:3,title:"¡Pedido entregado!",description:"Esperamos que disfrutes tu pedido. ¡Gracias por visitarnos!"},
    Cancelado:{index:-1,title:"Este pedido fue cancelado",description:"Acércate al personal de Filler Café si necesitas ayuda."}
  };
  function updateView(order) {
    const config=stages[order.status]||stages.Nuevo;
    el("folio").textContent=order.code;
    el("status-pill").textContent=order.status;
    el("status-pill").dataset.state=order.status;
    el("status-title").textContent=config.title;
    el("status-description").textContent=config.description;
    el("pickup").textContent=order.pickup||"Consultar en mostrador";
    const date=new Date(order.status_updated_at);
    el("updated").textContent=Number.isFinite(date.getTime())?
      date.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}):"—";
    document.querySelectorAll("[data-step]").forEach(step=>{
      const n=Number(step.dataset.step);
      step.classList.toggle("active",n<=config.index);
      step.classList.toggle("current",n===config.index);
    });
    el("ready-banner").hidden=order.status!=="Listo";
    if(order.status==="Listo")document.title="🔔 ¡Tu pedido está listo! · Filler Café";
    else if(order.status==="Entregado")document.title="✓ Pedido entregado · Filler Café";
    else document.title="Mi pedido · Filler Café";
  }
  function renderKitchenMessages(items){
    const panel=el("customer-messages"),list=el("customer-message-list");
    if(!panel||!list)return;
    const messages=Array.isArray(items)?items.filter(m=>m&&typeof m.message==="string"):[];
    const fresh=messagesLoaded?messages.filter(m=>m.id&&!knownMessages.has(m.id)):[];
    knownMessages=new Set(messages.map(m=>m.id).filter(Boolean));
    messagesLoaded=true;
    panel.hidden=messages.length===0;
    list.replaceChildren();
    for(const m of messages){
      const card=document.createElement("article");
      card.className="customer-message";
      const date=document.createElement("small");
      date.className="customer-message-date";
      const moment=new Date(m.created_at);
      date.textContent=(m.kind==="listo"?"✅ Listo · ":"☕ Cocina · ")+
        (Number.isFinite(moment.getTime())?moment.toLocaleString("es-MX",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"");
      const content=document.createElement("p");
      content.textContent=m.message;
      card.append(date,content);list.append(card);
    }
    const extra=fresh.find(m=>m.kind!=="listo");
    if(extra && hasAlerts && !document.hidden){
      sound();
      if("Notification" in window&&Notification.permission==="granted"){
        const options={body:String(extra.message).slice(0,140),tag:"filler-message-"+extra.id,
          icon:"./assets/filler-icon-192.png",data:{url:"./pedido.html"+location.hash}};
        try{
          navigator.serviceWorker?.getRegistration().then(reg=>{
            if(reg?.active)reg.showNotification("☕ Mensaje de Filler Café",options);
            else new Notification("☕ Mensaje de Filler Café",options);
          }).catch(()=>{});
        }catch{}
      }
    }
  }
  // Firma sonora Filler Cliente: tres notas ascendentes de pedido listo.
  function sound(){
    if(!soundEnabled||!audio)return;
    audio.resume().then(()=>{
      const start=audio.currentTime+.03;
      [{hz:587.33,at:0,d:.20},{hz:739.99,at:.24,d:.20},{hz:987.77,at:.50,d:.44}]
        .forEach(note=>{
          const osc=audio.createOscillator(),gain=audio.createGain(),at=start+note.at;
          osc.type="sine";
          osc.frequency.setValueAtTime(note.hz,at);
          gain.gain.setValueAtTime(.001,at);
          gain.gain.linearRampToValueAtTime(.16,at+.035);
          gain.gain.exponentialRampToValueAtTime(.002,at+note.d);
          osc.connect(gain);gain.connect(audio.destination);
          osc.start(at);osc.stop(at+note.d+.02);
        });
    }).catch(()=>{});
  }
  async function notifyReady(code){
    if(!hasAlerts)return;
    sound();
    if("Notification" in window&&Notification.permission==="granted"){
      const title="☕ ¡Tu pedido "+code+" está listo!";
      const options={body:"Pasa a recogerlo en Filler Café.",icon:"./assets/filler-icon-192.png",
        tag:"filler-ready-"+code,requireInteraction:true,data:{url:"./pedido.html"+location.hash}};
      try{
        const registration="serviceWorker" in navigator?await navigator.serviceWorker.getRegistration():null;
        if(registration?.active){await registration.showNotification(title,options);}
        else new Notification(title,options);
      }catch(error){feedback("El pedido está listo. Tu sistema bloqueó la notificación externa.",true);}
    }
  }
  async function checkStatus(){
    try{
      const order=await FillerCloud.orderStatus(token);
      updateView(order);
      renderKitchenMessages(order.messages);
      try{localStorage.setItem("filler_last_tracking_v1",JSON.stringify({token,code:order.code}));}catch{}
      if(lastStatus!=="Listo" && order.status==="Listo"&&!firstLoad)notifyReady(order.code);
      lastStatus=order.status;
      firstLoad=false;
      if(["Listo","Entregado","Cancelado"].includes(order.status)){
        // Conservar polling si el cliente quiere revisar la entrega, sin nuevas alarmas.
      }
      if(!hasAlerts)feedback("Seguimiento conectado. Permite las notificaciones para recibir avisos.");
    }catch(error){
      feedback("No se pudo consultar el estado: "+error.message,true);
    }finally{timer=setTimeout(checkStatus,5000);}
  }
  async function enable(){
    el("enable-alert").disabled=true;
    feedback("Activando notificaciones del dispositivo…");
    const request=("Notification" in window && Notification.permission==="default")
      ? Notification.requestPermission()
      : Promise.resolve("Notification" in window?Notification.permission:"unsupported");
    try{audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();soundEnabled=true;}catch{}
    let permission="unsupported";
    try{permission=await request;}catch{}
    hasAlerts=true;
    sound(); // Vista previa del tono al activar los avisos.
    if(permission==="granted"){
      try{
        await enableBackgroundPush();
        el("enable-alert").textContent="✓ Avisos activados, incluso al cerrar";
        feedback("✓ Te avisaremos cuando cocina marque tu pedido como listo, aunque cierres esta página.");
        if(lastStatus==="Listo")notifyReady(el("folio").textContent);
        return;
      }catch(error){
        el("enable-alert").textContent="🔔 Reintentar avisos en segundo plano";
        el("enable-alert").disabled=false;
        feedback("Puedes recibir avisos con esta página abierta. "+error.message,true);
        return;
      }
    }
    el("enable-alert").textContent="🔔 Permitir notificaciones";
    el("enable-alert").disabled=permission==="denied";
    feedback(permission==="denied"?"Activa el permiso de notificaciones desde la configuración del navegador.":"Avisos visuales activos en esta página; este dispositivo no admite notificaciones del sistema.",permission==="denied");
  }
  el("enable-alert").addEventListener("click",enable);
  el("copy-link").addEventListener("click",async()=>{
    const link=location.origin+location.pathname+"#token="+token;
    try{await navigator.clipboard.writeText(link);feedback("✓ Enlace copiado. No lo compartas públicamente.");}
    catch{feedback("No se pudo copiar automáticamente. Puedes copiarlo desde la barra del navegador.",true);}
  });
  if(!valid.test(token)){
    el("status-title").textContent="No encontramos tu enlace de seguimiento";
    el("status-description").textContent="Abre el seguimiento desde la confirmación de tu pedido o solicita ayuda al personal.";
    el("folio").textContent="Sin pedido";
    el("enable-alert").disabled=true;
    el("copy-link").disabled=true;
    feedback("Falta un enlace privado de pedido.",true);
    return;
  }
  checkStatus();
})();