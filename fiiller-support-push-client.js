/* Fiiller Café: optional transactional push for support messages, independent from marketing consent. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const staff=location.pathname.endsWith("/admin.html")||new URLSearchParams(location.search).has("personal");
const mount=document.getElementById("fiiller-message-alerts");if(!mount)return;
const actions=mount.querySelector("div:nth-child(2)")||mount;
const button=document.createElement("button");
button.type="button";button.textContent="📲 Push con app cerrada";button.style.cssText="border:1px solid #006241;background:#fff;color:#006241;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer";
actions.append(button);
const note=document.createElement("p");note.style.cssText="font-size:12px;color:#526d60;margin:8px 0 0";note.setAttribute("role","status");mount.append(note);
const auth=async()=>{
 if(staff){
  if(!window.FillerCloud||!await FillerCloud.staffRole())throw Error("Inicia sesión en el panel de Fiiller.");
  const token=await FillerCloud.accessToken();
  if(!token)throw Error("Inicia sesión nuevamente.");
  const jwt=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
  return {token,userId:jwt.sub}
 }
 const sess=window.FillerCustomerAuth?await FillerCustomerAuth.getSession():await window.FiillerCustomerSession?.getSession();
 if(!sess?.access_token||!sess?.user?.id)throw Error("Inicia sesión en Mi Fiiller.");
 return {token:sess.access_token,userId:sess.user.id};
};
const b64=s=>{const padded=s+"=".repeat((4-s.length%4)%4);const raw=atob(padded.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0))};
const tell=(s,bad=false)=>{note.textContent=s;note.style.color=bad?"#a53527":"#526d60"};
button.addEventListener("click",async()=>{
 if(button.disabled)return;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){tell("Este navegador no permite Web Push. En iPhone instala Fiiller desde Safari y ábrela desde la pantalla de inicio.",true);return}
 button.disabled=true;
 try{
  // Permission request is directly connected to the button press.
  const permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission;
  if(permission!=="granted")throw Error("Autoriza las notificaciones en la configuración de este dispositivo.");
  const user=await auth();
  const reg=await navigator.serviceWorker.register("./sw.js");await navigator.serviceWorker.ready;
  const configResponse=await fetch(BASE+"/functions/v1/filler-support-push",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({action:"config"})});
  const config=await configResponse.json();
  if(!configResponse.ok||!config.publicKey)throw Error(config.message||"No está disponible la configuración push.");
  const subscription=(await reg.pushManager.getSubscription())||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(config.publicKey)});
  const keys=subscription.toJSON().keys||{};
  if(!keys.p256dh||!keys.auth)throw Error("El dispositivo no entregó las claves de suscripción.");
  const res=await fetch(BASE+"/rest/v1/filler_support_push_subscriptions?on_conflict=endpoint",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+user.token,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
   body:JSON.stringify({user_id:user.userId,endpoint:subscription.endpoint,p256dh:keys.p256dh,auth_secret:keys.auth,active:true,updated_at:new Date().toISOString()})
  });
  if(!res.ok)throw Error("No fue posible guardar la suscripción. Verifica que este dispositivo corresponda a tu cuenta.");
  button.textContent="✓ Push activado";
  tell("Avisos de mensajes habilitados. Recibirás notificaciones aunque cierres la aplicación, cuando el dispositivo y el navegador las permitan.");
 }catch(err){tell(err.message||"No fue posible activar avisos.",true)}
 finally{button.disabled=false}
});
})();
