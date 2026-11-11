/* Fiiller support inbox: alerts only while this page is open.
 * No server push; OS permissions are requested solely after a user gesture.
 */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const staff=location.pathname.endsWith("/admin.html")||location.search.includes("personal=1");
const section=document.createElement("section");
section.id="fiiller-message-alerts";
section.style.cssText="background:#fff;border:1px solid #c9dece;border-radius:17px;padding:15px;margin:15px auto;max-width:980px;color:#123e2c;font:14px system-ui,Arial;box-sizing:border-box";
const header=document.createElement("div");header.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap";
const title=document.createElement("strong");title.textContent="💬 Mensajes de Fiiller";
const badge=document.createElement("span");badge.id="fiiller-chat-badge";badge.style.cssText="font-weight:800;color:#006241";badge.textContent="Conectando…";
header.append(title,badge);
const buttons=document.createElement("div");buttons.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:9px";
const link=document.createElement("a");link.href=staff?"./atencion.html?personal=1":"./atencion.html";link.textContent="Abrir conversaciones";link.style.cssText="display:inline-block;background:#006241;color:white;text-decoration:none;border-radius:10px;padding:10px 12px;font-weight:800";
const enable=document.createElement("button");enable.type="button";enable.textContent="🔔 Activar avisos";enable.style.cssText="border:1px solid #006241;background:#e8f3ec;color:#006241;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer";
buttons.append(link,enable);
const detail=document.createElement("p");detail.style.cssText="font-size:12px;color:#587365;margin:8px 0 0";detail.textContent="Avisos y sonido mientras esta pantalla permanezca abierta. Se requiere activar audio.";
section.append(header,buttons,detail);
const main=document.querySelector("main")||document.body;
const anchor=document.querySelector("main > header")||document.querySelector("main > .hero")||document.querySelector("header");
if(anchor&&anchor.parentNode===main)anchor.after(section);else main.prepend(section);
let audio=null,audioOn=false,baseline=false,lastIds=new Set(),busy=false,unread=0,noticeUntil=0,originalTitle=document.title;
const seenKey="fiiller_support_seen_"+(staff?"staff":"customer")+"_v2";
function readSeen(){try{return JSON.parse(sessionStorage.getItem(seenKey)||"[]")}catch{return []}}
function storeSeen(v){try{sessionStorage.setItem(seenKey,JSON.stringify(v.slice(0,120)))}catch{}}
async function credentials(){
 if(staff){
  if(!window.FillerCloud||!await FillerCloud.staffRole())return null;
  const token=await FillerCloud.accessToken();
  if(!token)return null;
  const jwt=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
  return {token,userId:jwt.sub};
 }
 const session=window.FillerCustomerAuth?await FillerCustomerAuth.getSession():window.FiillerCustomerSession?await FiillerCustomerSession.getSession():null;
 if(!session?.access_token||!session.user?.id)return null;
 return {token:session.access_token,userId:session.user.id};
}
async function poll(){
 if(busy||document.hidden)return;
 busy=true;
 try{
  const user=await credentials();
  if(!user){badge.textContent="Inicia sesión para ver mensajes";return}
  const res=await fetch(BASE+"/rest/v1/filler_support_messages?select=id,thread_id,sender_id,created_at&order=created_at.desc&limit=100",{
   headers:{apikey:KEY,Authorization:"Bearer "+user.token},cache:"no-store"
  });
  if(!res.ok)throw Error("Mensajería no disponible ("+res.status+")");
  const rows=await res.json();
  if(!baseline){lastIds=new Set([...readSeen(),...rows.map(r=>r.id)]);baseline=true;storeSeen([...lastIds]);badge.textContent="Mensajes al día";return}
  const incoming=rows.filter(r=>!lastIds.has(r.id)&&r.sender_id!==user.userId);
  rows.forEach(r=>lastIds.add(r.id));
  if(lastIds.size>300)lastIds=new Set(rows.map(r=>r.id));
  storeSeen([...lastIds]);
  if(incoming.length){
   unread+=incoming.length;
   badge.textContent=unread+" nuevo"+(unread===1?"":"s");
   badge.style.color="#b64235";
   detail.textContent="Tienes mensajes nuevos. Abre las conversaciones para responder.";
   document.title="("+unread+") 💬 "+originalTitle;
   if(audioOn&&audio){try{await audio.resume();window.FillerSounds?.play(audio,"message","max")||beep(audio)}catch{}}
   if("Notification" in window&&Notification.permission==="granted"&&Date.now()>noticeUntil){
    noticeUntil=Date.now()+5000;
    try{const n=new Notification("Fiiller Café · Nuevo mensaje",{body:"Tienes un nuevo mensaje en el centro de atención.",tag:"fiiller-support-message"});n.onclick=()=>{window.focus();location.href=link.href}}catch{}
   }
  }else if(!unread){badge.textContent="Mensajes al día"}
 }catch(error){badge.textContent="Sin conexión al chat";detail.textContent=error.message}
 finally{busy=false}
}
function beep(ctx){const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.setValueAtTime(880,ctx.currentTime);o.frequency.setValueAtTime(1108,ctx.currentTime+.22);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.27,ctx.currentTime+.03);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.55)}
enable.onclick=async()=>{
 try{
  const Engine=window.AudioContext||window.webkitAudioContext;
  if(!Engine)throw Error("Este dispositivo no admite sonido desde el navegador.");
  if(!audio)audio=new Engine();
  await audio.resume();audioOn=true;
  if(window.FillerSounds){await window.FillerSounds.prepare(audio);window.FillerSounds.play(audio,"message","alto")}else beep(audio);
  enable.textContent="🔊 Sonido activo";detail.textContent="Sonido activado. Si aceptas notificaciones del navegador también verás alertas mientras esta página esté abierta.";
  if("Notification" in window&&Notification.permission==="default"){
   const permission=await Notification.requestPermission();
   if(permission!=="granted")detail.textContent="Sonido activo. Las notificaciones visuales seguirán disponibles en esta página.";
  }
 }catch(error){detail.textContent=error.message}
};
link.addEventListener("click",()=>{unread=0;document.title=originalTitle});
poll();setInterval(poll,15000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll()});
})();
