/* Filler Café — avisos visuales de pedidos mientras Cocina/Monitor están abiertos.
 * La ventana visual no requiere permisos de Windows; el aviso del sistema sí.
 * El push con el navegador cerrado requiere un servidor VAPID.
 */
(() => {
  "use strict";
  const SCREEN=location.pathname.endsWith("/monitor.html")?"monitor":"pedidos";
  const KEY="filler_seen_"+SCREEN+"_v2";
  const MAX_AGE=30*60*1000;
  const originalTitle=document.title;
  let seen=[];
  try{
    const stored=JSON.parse(sessionStorage.getItem(KEY)||"[]");
    if(Array.isArray(stored))seen=stored.filter(v=>typeof v==="string").slice(-350);
  }catch{}
  const saveSeen=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(seen));}catch{}};

  function create({onStatus=()=>{}}={}) {
    let audio=null, audioEnabled=false, lastNotice=null;
    const overlay=document.createElement("section");
    overlay.id="filler-order-popup";
    overlay.hidden=true;
    overlay.setAttribute("role","alertdialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-labelledby","filler-popup-title");
    overlay.setAttribute("aria-describedby","filler-popup-details");
    overlay.style.cssText="display:flex;align-items:center;justify-content:center;position:fixed;inset:0;z-index:2147483647;background:rgba(6,28,22,.83);padding:16px";
    overlay.innerHTML=
      '<div style="width:min(100%,570px);background:#fffdf5;border:5px solid #ffa924;border-radius:26px;box-shadow:0 30px 110px rgba(0,0,0,.55);padding:27px 23px;color:#143e2b;font-family:system-ui,sans-serif;text-align:center">'+
      '<div aria-hidden="true" style="font-size:66px;line-height:1.2">🔔</div>'+
      '<h2 id="filler-popup-title" style="margin:9px 0;font-size:clamp(25px,5vw,37px);line-height:1.15;color:#125537">¡Nuevo pedido recibido!</h2>'+
      '<p id="filler-popup-details" style="margin:12px 0;font-size:clamp(18px,3vw,24px);line-height:1.5;color:#233d30;font-weight:750"></p>'+
      '<div style="font-size:14px;background:#fff1cd;border:1px solid #ffd98e;border-radius:11px;padding:10px;margin:14px 0;color:#745114">Pedido recibido en cocina · Confirma que lo viste</div>'+
      '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">'+
      '<button type="button" id="filler-popup-show" style="font:inherit;font-size:16px;font-weight:850;border:0;border-radius:13px;background:#006241;color:#fff;padding:15px 19px;cursor:pointer;min-width:145px">Ver pedido</button>'+
      '<button type="button" id="filler-popup-close" style="font:inherit;font-size:16px;font-weight:850;border:2px solid #bfcfc2;border-radius:13px;background:#f5f8f5;color:#16432e;padding:13px 19px;cursor:pointer">Entendido</button>'+
      '</div></div>';
    const css=document.createElement("style");
    css.textContent="#filler-order-popup[hidden]{display:none!important}";
    document.head.appendChild(css);
    document.body.appendChild(overlay);

    const close=()=>{overlay.hidden=true;document.title=originalTitle;};
    overlay.querySelector("#filler-popup-close").addEventListener("click",close);
    overlay.querySelector("#filler-popup-show").addEventListener("click",()=>{
      close();document.getElementById("orders")?.scrollIntoView({behavior:"smooth",block:"start"});
    });

    function showVisual(title,details){
      overlay.querySelector("#filler-popup-title").textContent=title;
      overlay.querySelector("#filler-popup-details").textContent=details;
      overlay.hidden=false;
      document.title="🔔 PEDIDO NUEVO — Filler Café";
      overlay.querySelector("#filler-popup-show").focus({preventScroll:true});
    }
    // Firma sonora Filler Cocina: cinco notas rítmicas, distintas del aviso al cliente.
    function sound(){
      if(!audioEnabled||!audio)return;
      audio.resume().then(()=>{
        const start=audio.currentTime+.03;
        const notes=[
          {hz:523.25,at:0,d:.15},
          {hz:659.25,at:.19,d:.15},
          {hz:783.99,at:.43,d:.21},
          {hz:659.25,at:.69,d:.15},
          {hz:1046.5,at:.90,d:.32}
        ];
        for(const note of notes){
          const osc=audio.createOscillator(),gain=audio.createGain();
          const at=start+note.at;
          osc.type="triangle";
          osc.frequency.setValueAtTime(note.hz,at);
          gain.gain.setValueAtTime(.001,at);
          gain.gain.linearRampToValueAtTime(.14,at+.025);
          gain.gain.exponentialRampToValueAtTime(.002,at+note.d);
          osc.connect(gain);gain.connect(audio.destination);
          osc.start(at);osc.stop(at+note.d+.02);
        }
      }).catch(error=>onStatus("Sonido bloqueado: "+error.message,true));
    }
    async function systemNotification(title,details,tag){
      if(!("Notification" in window)||Notification.permission!=="granted")return false;
      const icon="./assets/filler-icon-192.png";
      const options={body:details,icon,badge:icon,tag,renotify:true,requireInteraction:true,
        data:{url:SCREEN==="monitor"?"./monitor.html":"./pedidos.html"}};
      try{
        if("serviceWorker" in navigator){
          const registration=await navigator.serviceWorker.getRegistration();
          if(registration?.active&&typeof registration.showNotification==="function"){
            await registration.showNotification(title,options);return true;
          }
        }
        const notification=new Notification(title,options);
        notification.onclick=()=>{window.focus();document.getElementById("orders")?.scrollIntoView({block:"start"});notification.close();};
        return true;
      }catch(error){
        onStatus("La alerta visual funciona; el sistema bloqueó la notificación externa.",true);
        return false;
      }
    }
    async function enable(){
      // La solicitud de permiso comienza durante el clic, antes de operaciones asincrónicas.
      const permissionRequest=("Notification" in window&&Notification.permission==="default")
        ? Notification.requestPermission()
        : Promise.resolve("Notification" in window?Notification.permission:"unsupported");
      try{
        if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
        await audio.resume();audioEnabled=true;
      }catch(error){onStatus("Audio no disponible: "+error.message,true);}
      let permission="unsupported";
      try{permission=await permissionRequest;}catch{}
      showVisual("🔔 Prueba de notificación","Prueba visual. No se creó ningún pedido.");
      sound();
      await systemNotification("🔔 Prueba Filler Café","Notificación de prueba, sin pedido real.","filler-test-"+SCREEN);
      if(permission==="granted")onStatus("✓ Alerta visual, sonido y avisos del sistema habilitados.");
      else onStatus("✓ Alerta visual y sonido activos. Avisos del sistema: "+(permission==="denied"?"permiso bloqueado":"permiso pendiente")+".");
      return {sound:audioEnabled,notifications:permission==="granted",permission};
    }
    function incoming(orders){
      const incomingOrders=(Array.isArray(orders)?orders:[]).filter(o=>{
        const id=String(o?.uuid||o?.id||""),ts=Number(o?.createdTs),age=Date.now()-ts;
        return o?.status==="Nuevo"&&id&&Number.isFinite(ts)&&age>=-120000&&age<MAX_AGE&&!seen.includes(id);
      });
      if(!incomingOrders.length)return;
      const ids=incomingOrders.map(o=>String(o.uuid||o.id));
      seen=[...new Set([...seen,...ids])].slice(-350);
      saveSeen();
      lastNotice=incomingOrders[0];
      const qty=incomingOrders.reduce((n,o)=>n+(Array.isArray(o.items)?o.items:[])
        .reduce((sum,i)=>sum+Number(i.qty||0),0),0);
      const title=incomingOrders.length===1?"🔔 ¡Nuevo pedido recibido!":"🔔 "+incomingOrders.length+" pedidos nuevos";
      const details=(incomingOrders.length===1?String(incomingOrders[0].id):incomingOrders.map(o=>String(o.id)).join(" · "))+
        " · "+qty+" artículos";
      showVisual(title,details);
      sound();
      systemNotification("🔔 Nuevo pedido Filler Café",details,"filler-new-"+ids[0]);
    }
    return Object.freeze({enable,incoming,beep:sound,isEnabled:()=>audioEnabled,
      permission:()=>("Notification" in window?Notification.permission:"unsupported"),lastNotice:()=>lastNotice});
  }
  window.FillerOrderNotifications=Object.freeze({create});
})();
