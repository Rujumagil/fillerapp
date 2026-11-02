/* Fiiller Café: marketing push requires explicit consent and OS permission. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const enable=document.getElementById("filler-enable-promos-push");
const disable=document.getElementById("filler-disable-promos-push");
const status=document.getElementById("filler-push-status");
const guide=document.getElementById("filler-push-permission-guide");
const steps=document.getElementById("filler-push-permission-steps");
const check=document.getElementById("filler-check-push-permission");
if(!enable||!disable||!status||!guide||!steps||!check)return;
let pending=false;
function say(text,error=false){status.textContent=text;status.style.color=error?"#a63327":"#47755a";}
const isIOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent||"");
const isAndroid=()=>/Android/i.test(navigator.userAgent||"");
function showHelp(message){
 guide.hidden=false;
 enable.hidden=true;
 if(message)say(message,true);
 if(isAndroid()){
  steps.textContent="1. Mantén presionado el ícono de Fiiller Café y abre Información de la app → Notificaciones → Permitir. 2. Abre Chrome → ⋮ → Configuración → Configuración de sitios → Notificaciones. Si fiillercafe.app aparece bloqueado, cámbialo a Permitir. 3. Regresa a Mi Fiiller y toca «Volver a comprobar permisos».";
 }else if(isIOS()){
  steps.textContent="Abre Fiiller Café desde la pantalla de inicio (no desde una pestaña de Safari). En Ajustes del iPhone → Notificaciones → Fiiller Café, activa Permitir notificaciones. Luego regresa a Mi Fiiller y toca «Volver a comprobar permisos».";
 }else{
  steps.textContent="Abre los ajustes de tu navegador → Privacidad y seguridad → Configuración de sitios → Notificaciones. Busca fiillercafe.app y selecciona Permitir. Revisa también las notificaciones del sistema para este navegador. Regresa aquí para comprobarlo.";
 }
}
function hideHelp(){guide.hidden=true;}
function permissionBlocked(){
 return !("Notification" in window)||Notification.permission==="denied";
}
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
  const allowed=await marketingAllowed(auth);
  if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)){
    disable.hidden=true;
    showHelp("Este dispositivo no ofrece Web Push en el modo actual.");return;
  }
  if(permissionBlocked()){
    disable.hidden=true;
    showHelp("Las notificaciones están bloqueadas en este dispositivo. Debes permitirlas en la configuración antes de activar las promociones.");return;
  }
  hideHelp();
  const reg=await registration();
  const sub=await reg.pushManager.getSubscription();
  enable.hidden=Boolean(sub);disable.hidden=!sub;
  enable.disabled=!allowed;
  if(sub&&!allowed)say("Las promociones están desactivadas en tu perfil. Puedes desactivar los avisos de este dispositivo desde aquí.");
  else if(sub)say("✓ Este dispositivo está suscrito para recibir avisos. La entrega depende de que el dispositivo permita notificaciones.");
  else if(!allowed)say("Para activar los avisos, marca «Quiero recibir promociones», guarda tu preferencia y vuelve aquí.");
  else say("Toca «Activar promociones push». Android solicitará permiso si aún no lo has concedido.");
 }catch(e){
  disable.hidden=true;
  if(permissionBlocked())showHelp("No hay autorización de notificaciones para este dispositivo.");
  else {hideHelp();enable.hidden=true;say(e.message,true);}
 }
}
enable.addEventListener("click",async()=>{
 if(pending||enable.disabled)return;
 if(permissionBlocked()){
  showHelp("Android bloqueó las notificaciones; revisa las instrucciones antes de volver a intentar.");
  return;
 }
 pending=true;enable.disabled=true;
 // El permiso debe pedirse durante el toque; el consentimiento se revisó antes de habilitar este botón.
 const permissionRequest=("Notification" in window)
   ? (Notification.permission==="default"?Notification.requestPermission():Promise.resolve(Notification.permission))
   : Promise.resolve("unsupported");
 try{
  const s=await customerToken();
  if(!(await marketingAllowed(s)))throw Error("Primero acepta y guarda la opción «Quiero recibir promociones» en Mis datos.");
  const permission=await permissionRequest;
  if(permission!=="granted"){
    showHelp("No se concedió el permiso de notificaciones. Habilítalo en la configuración del dispositivo.");
    return;
  }
  await registration();const ready=await navigator.serviceWorker.ready;
  const result=await fetch(BASE+"/functions/v1/filler-marketing-push",{
   method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({action:"config"})});
  const config=await result.json().catch(()=>({}));
  if(!result.ok||!config.publicKey)throw Error(config.message||"No pudimos obtener la configuración push.");
  const sub=(await ready.pushManager.getSubscription())||await ready.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:urlB64ToBytes(config.publicKey)});
  await apiSave(s,sub);
  hideHelp();
  say("✓ ¡Listo! Este dispositivo quedó suscrito para recibir promociones cuando Fiiller las envíe.");
  enable.hidden=true;disable.hidden=false;
 }catch(e){
   if(permissionBlocked())showHelp(e.message||"El dispositivo bloqueó las notificaciones.");
   else say(e.message||"No se pudieron activar los avisos.",true);
 }
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
check.addEventListener("click",async()=>{
 check.disabled=true;
 say("Comprobando permisos del dispositivo…");
 try{await refresh();}
 finally{check.disabled=false;}
});
window.FillerPushClient={refresh,showHelp};
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
window.addEventListener("pageshow",()=>refresh());
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh);
else refresh();
})();