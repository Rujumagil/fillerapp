/* Filler Café — avisos para pedidos nuevos mientras la página de cocina está abierta.
 * No es Web Push remoto con el navegador cerrado: requiere backend VAPID/subscripciones.
 */
(() => {
  "use strict";
  const KEY="filler_notifications_seen_v1";
  const MAX_AGE=30*60*1000;
  const titleDefault=document.title;
  const path=location.pathname.endsWith("/monitor.html")?"monitor.html":"pedidos.html";
  const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  let seen=[];
  try{const stored=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(stored))seen=stored.filter(i=>typeof i==="string").slice(-350);}catch{}
  function create({onStatus=()=>{}}={}) {
    let audioContext=null, audioEnabled=false, lastNotice=null;
    const notice=document.createElement("aside");
    notice.id="filler-new-order-alert";
    notice.setAttribute("role","alert");
    notice.setAttribute("aria-live","assertive");
    notice.hidden=true;
    notice.style.cssText="position:fixed;z-index:9999;top:12px;left:50%;transform:translateX(-50%);width:min(94vw,560px);background:#fff9eb;border:3px solid #db8920;border-radius:19px;padding:18px 16px;box-shadow:0 10px 35px #0005;color:#173e2d;text-align:left";
    notice.innerHTML='<div style="display:flex;gap:12px;align-items:flex-start"><div style="font-size:36px">🔔</div><div style="flex:1"><b id="filler-alert-title" style="font-size:21px">¡Nuevo pedido!</b><p id="filler-alert-body" style="margin:5px 0 8px"></p><button id="filler-alert-show" type="button" style="padding:10px 13px;border-radius:10px;background:#006241;color:white;border:0;cursor:pointer">Ver pedidos</button></div><button id="filler-alert-close" type="button" aria-label="Cerrar aviso" style="border:0;background:transparent;color:#173e2d;font-size:24px;cursor:pointer">×</button></div>';
    document.body.appendChild(notice);
    const close=()=>{notice.hidden=true;document.title=titleDefault;};
    notice.querySelector("#filler-alert-close").addEventListener("click",close);
    notice.querySelector("#filler-alert-show").addEventListener("click",()=>{close();document.getElementById("orders")?.scrollIntoView({behavior:"smooth",block:"start"});});
    window.addEventListener("focus",()=>{if(notice.hidden)document.title=titleDefault;});
    const icon="assets/filler-icon-192.png";
    function banner(label,details){
      notice.querySelector("#filler-alert-title").textContent=label;
      notice.querySelector("#filler-alert-body").textContent=details;
      notice.hidden=false;
      document.title="🔔 Nuevo pedido — Filler Café";
    }
    function beep(){
      if(!audioEnabled||!audioContext)return;
      audioContext.resume().then(()=>{
        const t=audioContext.currentTime;
        for(let i=0;i<3;i++){
          const osc=audioContext.createOscillator(),vol=audioContext.createGain(),at=t+i*.33;
          osc.type="sine";osc.frequency.setValueAtTime(i===1?720:920,at);
          vol.gain.setValueAtTime(.001,at);
          vol.gain.linearRampToValueAtTime(.22,at+.03);
          vol.gain.exponentialRampToValueAtTime(.002,at+.27);
          osc.connect(vol);vol.connect(audioContext.destination);
          osc.start(at);osc.stop(at+.29);
        }
      }).catch(error=>onStatus("El navegador bloqueó el sonido: "+error.message,true));
    }
    async function systemNotification(label,body,tag){
      if(!("Notification" in window)||Notification.permission!=="granted")return false;
      const options={body,icon,badge:icon,tag,renotify:true,data:{url:"./"+path}};
      try{
        if("serviceWorker" in navigator){
          const registration=await navigator.serviceWorker.getRegistration();
          if(registration?.active && typeof registration.showNotification==="function"){
            await registration.showNotification(label,options);
            return true;
          }
        }
        const msg=new Notification(label,options);
        msg.onclick=()=>{window.focus();document.getElementById("orders")?.scrollIntoView({block:"start"});msg.close();};
        return true;
      }catch(error){
        try{new Notification(label,options);return true;}catch{onStatus("Aviso visible, pero el sistema bloqueó las notificaciones.",true);return false;}
      }
    }
    async function enable(){
      // Ambos métodos deben iniciarse directamente desde la pulsación del usuario.
      const permissionPromise=("Notification" in window && Notification.permission==="default")
        ? Notification.requestPermission()
        : Promise.resolve("Notification" in window?Notification.permission:"unsupported");
      try{
        if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();
        await audioContext.resume();
        audioEnabled=true;
      }catch(error){onStatus("El sonido no pudo activarse: "+error.message,true);}
      const permission=await permissionPromise;
      beep();
      banner("Prueba de alerta Filler Café","Esta es una prueba: no se creó ningún pedido.");
      await systemNotification("🔔 Prueba Filler Café","Notificaciones listas. Esta prueba no registró ningún pedido.","filler-test-"+path);
      if(permission==="granted")onStatus("🔊 Sonido y notificaciones del sistema activados. Mantén esta página abierta.");
      else onStatus("🔊 Sonido "+(audioEnabled?"activado":"no disponible")+". Para avisos del sistema, habilita las notificaciones de este sitio en el navegador.");
      return {sound:audioEnabled,notifications:permission==="granted"};
    }
    function incoming(orders){
      const fresh=(Array.isArray(orders)?orders:[]).filter(o=>
        o?.status==="Nuevo"&&
        (o.uuid||o.id)&&
        Number.isFinite(Number(o.createdTs))&&
        Date.now()-Number(o.createdTs)<MAX_AGE&&
        Date.now()-Number(o.createdTs)>-120000&&
        !seen.includes(String(o.uuid||o.id))
      );
      if(!fresh.length)return;
      const ids=fresh.map(o=>String(o.uuid||o.id));
      seen=[...new Set([...seen,...ids])].slice(-350);
      try{localStorage.setItem(KEY,JSON.stringify(seen));}catch{}
      lastNotice=fresh[0];
      const count=fresh.length;
      const label=count>1?"🔔 "+count+" pedidos nuevos":"🔔 ¡Nuevo pedido recibido!";
      const details=count>1?fresh.map(o=>o.id).join(", "):fresh[0].id+" · "+fresh[0].items.reduce((sum,i)=>sum+Number(i.qty||0),0)+" artículos";
      banner(label,details);
      beep();
      systemNotification(label,details,"filler-new-"+ids[0]);
    }
    return Object.freeze({enable,incoming,beep,isEnabled:()=>audioEnabled,lastNotice:()=>lastNotice});
  }
  window.FillerOrderNotifications=Object.freeze({create});
})();
