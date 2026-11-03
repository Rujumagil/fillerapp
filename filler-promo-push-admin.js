/* Fiiller Admin: campaña push con envío explícito y sin duplicados. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const workspace=document.getElementById("push-workspace");
const list=document.getElementById("push-campaign-list");
const info=document.getElementById("push-campaign-status");
if(!workspace||!list||!info)return;
const session=()=>{try{return JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null")}catch{return null}};
const status=(msg,bad=false)=>{info.textContent=msg;info.style.color=bad?"#a63226":"#38694a";};
async function getCampaigns(){
 const t=session()?.access_token;if(!t)throw Error("Necesitas iniciar sesión de administrador.");
 const r=await fetch(BASE+"/rest/v1/filler_promo_campaigns?select=id,title,body,status,created_at,image_url,target_url,attempted_count,delivered_to_push_service&order=created_at.desc&limit=50",{
 headers:{apikey:KEY,Authorization:"Bearer "+t,Accept:"application/json"},cache:"no-store"});
 if(!r.ok)throw Error("No pudimos cargar campañas push.");
 return r.json();
}
async function notifyTest(c){
 if(!("Notification" in window)||!("serviceWorker" in navigator))
   throw Error("Las notificaciones no están disponibles en este navegador.");
 // El permiso se solicita como respuesta al clic del administrador.
 const request=Notification.permission==="default"?Notification.requestPermission():Promise.resolve(Notification.permission);
 if(await request!=="granted")throw Error("Debes permitir las notificaciones para probar la campaña.");
 const reg=await navigator.serviceWorker.register("./sw.js");
 const ready=await navigator.serviceWorker.ready;
 await ready.showNotification(c.title,{body:c.body,icon:c.image_url||undefined,
   image:c.image_url||undefined,
   tag:"filler-promo-local-test",data:{type:"promotion",url:"./index.html#promociones"}});
}
async function deliver(c){
 const token=session()?.access_token;
 if(!token)throw Error("Inicia sesión como administrador.");
 const r=await fetch(BASE+"/functions/v1/filler-marketing-push",{
 method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
 body:JSON.stringify({action:"send",campaign_id:c.id}),cache:"no-store"});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.message||"No se pudo enviar la campaña.");
 return d;
}
function element(tag,text,cls){
 const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;
}
async function load(){
 const records=await getCampaigns();
 list.replaceChildren();
 if(!records?.length){list.append(element("p","Aún no hay campañas push preparadas."));return;}
 for(const c of records){
  const card=element("article",null,"item");
  const label=element("span",c.status==="draft"?"Borrador · listo para revisión":c.status==="sent"?"Enviado al servicio push":c.status==="failed"?"Envío fallido":"Procesando","pill");
  const title=element("h3",c.title);title.style.margin="6px 0";
  const body=element("p",c.body);body.style.margin="5px 0";
  const details=element("small",c.status==="sent"?
    c.delivered_to_push_service+" avisos aceptados por el proveedor push":
    "Solo recibirán el aviso los dispositivos suscritos con consentimiento.");
  const actions=element("div",null,"actions");
  const test=element("button","🔔 Probar en mi dispositivo","secondary");
  test.type="button";
  test.addEventListener("click",async()=>{
   test.disabled=true;
   try{await notifyTest(c);status("Aviso de prueba mostrado únicamente en este dispositivo. No se envió a clientes.");}
   catch(e){status(e.message,true)}finally{test.disabled=false;}
  });
  actions.append(test);
  if(c.status==="draft"){
   const send=element("button","Enviar push a clientes autorizados");
   send.type="button";
   send.addEventListener("click",async()=>{
    if(!confirm("¿Enviar «"+c.title+"» a todos los dispositivos que aceptaron promociones? Esta acción no se puede deshacer."))return;
    send.disabled=true;
    try{const result=await deliver(c);status(result.message+" Intentos: "+result.attempted+". Aceptados: "+result.accepted+".");await load();}
    catch(e){status(e.message,true);}
    finally{send.disabled=false;}
   });
   actions.append(send);
  }
  if(c.image_url&&/^https:\/\//.test(c.image_url)){
   const img=element("img");img.src=c.image_url;img.alt="Imagen del producto promocionado";
   img.loading="lazy";img.style.cssText="width:100%;max-width:340px;max-height:240px;object-fit:cover;border-radius:12px;margin:8px 0";
   card.append(img);
  }
  card.append(label,title,body,details,actions);
  list.append(card);
 }
}
async function ready(){
 if(session()?.access_token){
  workspace.hidden=false;
  try{await load();status("Revisa la campaña y utiliza la prueba local antes de enviar.");}
  catch(e){workspace.hidden=true;status(e.message,true);}
 }
}
document.addEventListener("fiiller:admin-ready",ready);
document.getElementById("reload-push").addEventListener("click",()=>load().catch(e=>status(e.message,true)));
if(document.readyState==="complete"&&!document.getElementById("workspace")?.hidden)ready();
})();