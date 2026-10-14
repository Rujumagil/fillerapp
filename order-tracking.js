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
  const feedback=(text,isError=false)=>{el("feedback").textContent=text;el("feedback").className=isError?"error":"";};
  const stages={
    Nuevo:{index:0,title:"¡Ya recibimos tu pedido!",description:"Cocina tiene tu pedido. En cuanto comencemos, verás el cambio aquí."},
    Preparando:{index:1,title:"Estamos preparando tu pedido",description:"Nuestro equipo ya está trabajando para tenerlo listo."},
    Listo:{index:2,title:"¡Tu pedido está listo!",description:"Pasa a recogerlo en Filler Café. ¡Gracias por esperar!"},
    Entregado:{index:2,title:"¡Pedido entregado!",description:"Esperamos que disfrutes tu pedido. ¡Gracias por visitarnos!"},
    Cancelado:{index:-1,title:"Este pedido fue cancelado",description:"Acércate al personal de Filler Café si necesitas ayuda."}
  };
  function updateView(order) {
    const config=stages[order.status]||stages.Nuevo;
    el("folio").textContent=order.code;
    el("status-pill").textContent=order.status;
    el("status-title").textContent=config.title;
    el("status-description").textContent=config.description;
    el("pickup").textContent=order.pickup||"Consultar en mostrador";
    const date=new Date(order.status_updated_at);
    el("updated").textContent=Number.isFinite(date.getTime())?
      date.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}):"—";
    document.querySelectorAll("[data-step]").forEach(step=>
      step.classList.toggle("active",Number(step.dataset.step)<=config.index));
    el("ready-banner").hidden=order.status!=="Listo";
    if(order.status==="Listo")document.title="🔔 ¡Tu pedido está listo! · Filler Café";
  }
  function sound(){
    if(!soundEnabled||!audio)return;
    audio.resume().then(()=>{
      const now=audio.currentTime;
      [880,1100,880].forEach((hz,i)=>{
        const osc=audio.createOscillator(),gain=audio.createGain(),t=now+i*.32;
        osc.frequency.setValueAtTime(hz,t);
        gain.gain.setValueAtTime(.001,t);
        gain.gain.linearRampToValueAtTime(.16,t+.03);
        gain.gain.exponentialRampToValueAtTime(.002,t+.25);
        osc.connect(gain);gain.connect(audio.destination);
        osc.start(t);osc.stop(t+.26);
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
    const request=("Notification" in window && Notification.permission==="default")
      ? Notification.requestPermission()
      : Promise.resolve("Notification" in window?Notification.permission:"unsupported");
    try{
      audio=new (window.AudioContext||window.webkitAudioContext)();
      await audio.resume();soundEnabled=true;
    }catch{}
    let permission="unsupported";
    try{permission=await request;}catch{}
    hasAlerts=true;
    el("enable-alert").textContent="🔔 Avisos activados en esta página";
    el("enable-alert").disabled=true;
    if(permission==="granted")feedback("✓ Avisos activados. Mantén esta página abierta para recibirlos.");
    else feedback("✓ Aviso visual"+(soundEnabled?" y sonido":"")+" activados. Las notificaciones del sistema requieren permiso.");
    if(lastStatus==="Listo")notifyReady(el("folio").textContent);
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