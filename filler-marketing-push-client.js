/* Fiiller Café: marketing push requires explicit consent and OS permission. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const enable=document.getElementById("filler-enable-promos-push");
const disable=document.getElementById("filler-disable-promos-push");
const status=document.getElementById("filler-push-status");
if(!enable||!disable||!status)return;
let pending=false;
function say(text,error=false){status.textContent=text;status.style.color=error?"#a63327":"#47755a";}
function session(){try{return JSON.parse(sessionStorage.getItem("filler_customer_session_v1")||"null");}catch{return null;}}
async function customerToken(){
 const s=session();if(!s?.access_token||!s?.user?.id)throw Error("Inicia sesión en Mi Fiiller para recibir promociones.");
 if(s.expires_at&&s.expires_at<Date.now()/1000+60)throw Error("Tu sesión venció. Ingresa de nuevo.");
 return s;
}
async function marketingAllowed(s){
 const r=await fetch(BASE+"/rest/v1/filler_customers?user_id=eq."+encodeURIComponent(s.user.id)+"&select=promotions_opt_in",{
 headers:{apikey:KEY,Authorization:"Bearer "+s.access_token},cache:"no-store"});
 if(!r.ok)throw Error("No pudimos consultar tus preferencias.");
 const rows=await r.json();
 return Boolean(rows?.[0]?.promotions_opt_in);
}
function urlB64ToBytes(value){
 const b64=value.replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(b64+"=".repeat((4-b64.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function apiSave(s,subscription){
 const json=subscription.toJSON(),keys=json.keys||{};
 if(!json.endpoint||!keys.p256dh||!keys.auth)throw Error("El navegador no generó una suscripción válida.");
 const r=await fetch(BASE+"/rest/v1/filler_push_subscriptions?on_conflict=endpoint",{
 method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+s.access_token,"Content-Type":"application/json",
 Prefer:"resolution=merge-duplicates,return=representation"},
 body:JSON.stringify({user_id:s.user.id,endpoint:json.endpoint,p256dh:keys.p256dh,auth_secret:keys.auth,
 active:true,updated_at:new Date().toISOString()})});
 if(!r.ok)throw Error("No pudimos guardar este dispositivo para notificaciones.");
}
async function apiDeactivate(s,endpoint){
 const r=await fetch(BASE+"/rest/v1/filler_push_subscriptions?endpoint=eq."+encodeURIComponent(endpoint),{
 method:"PATCH",headers:{apikey:KEY,Authorization:"Bearer "+s.access_token,"Content-Type":"application/json"},
 body:JSON.stringify({active:false,updated_at:new Date().toISOString()})});
 if(!r.ok)throw Error("No pudimos desactivar el dispositivo.");
}
async function registration(){
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))
   throw Error("Este navegador no admite notificaciones push. En iPhone instala Mi Fiiller desde Safari y ábrela desde la pantalla de inicio.");
 return navigator.serviceWorker.register("./sw.js");
}
async function refresh(){
 try{
  const auth=await customerToken();
  if(!auth.user?.id){enable.hidden=true;disable.hidden=true;return;}
  const allowed=await marketingAllowed(auth);
  const r=await registration();
  const sub=await r.pushManager.getSubscription();
  enable.hidden=Boolean(sub);disable.hidden=!sub;
  enable.disabled=!allowed;
  if(sub&&!allowed)say("Las promociones están desactivadas en tu perfil. Puedes desactivar los avisos de este dispositivo desde aquí.");
  else if(sub)say("✓ Este dispositivo tiene notificaciones habilitadas.");
  else if(!allowed)say("Para activar los avisos, primero marca «Quiero recibir promociones» y guarda tus preferencias.");
  else say("Toca «Activar promociones push» si deseas recibir avisos en este dispositivo.");
 }catch(e){enable.hidden=false;disable.hidden=true;say(e.message,true);}
}
enable.addEventListener("click",async()=>{
 if(pending||enable.disabled)return;
 pending=true;enable.disabled=true;
 // El permiso debe pedirse durante el toque; el consentimiento se revisó antes de habilitar este botón.
 const permissionRequest=("Notification" in window)
   ? (Notification.permission==="default"?Notification.requestPermission():Promise.resolve(Notification.permission))
   : Promise.resolve("unsupported");
 try{
  const s=await customerToken();
  if(!(await marketingAllowed(s)))throw Error("Primero acepta y guarda la opción «Quiero recibir promociones» en Mis datos.");
  const permission=await permissionRequest;
  if(permission!=="granted")throw Error("Permiso de notificaciones no concedido. Puedes habilitarlo en los ajustes del navegador.");
  await registration();const ready=await navigator.serviceWorker.ready;
  const result=await fetch(BASE+"/functions/v1/filler-marketing-push",{
   method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({action:"config"})});
  const config=await result.json().catch(()=>({}));
  if(!result.ok||!config.publicKey)throw Error(config.message||"No pudimos obtener la configuración push.");
  const sub=(await ready.pushManager.getSubscription())||await ready.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:urlB64ToBytes(config.publicKey)});
  await apiSave(s,sub);
  say("✓ ¡Listo! Recibirás promociones en este dispositivo cuando Fiiller las envíe.");
  enable.hidden=true;disable.hidden=false;
 }catch(e){say(e.message||"No se pudieron activar los avisos.",true);}
 finally{pending=false;enable.disabled=false;}
});
disable.addEventListener("click",async()=>{
 if(pending)return;pending=true;disable.disabled=true;
 try{
  const s=await customerToken(),r=await registration();
  const sub=await r.pushManager.getSubscription();
  if(sub){await apiDeactivate(s,sub.endpoint);await sub.unsubscribe();}
  say("Avisos de promociones desactivados en este dispositivo.");
  disable.hidden=true;enable.hidden=false;
 }catch(e){say(e.message,true);}
 finally{pending=false;disable.disabled=false;}
});
window.FillerPushClient={refresh};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);
else refresh();
})();