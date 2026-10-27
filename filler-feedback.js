/* Encuesta privada de Fiiller Café: una respuesta por cliente cada día. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const form=document.getElementById("filler-feedback-form");
if(!form)return;
const output=document.getElementById("filler-feedback-message");
const button=document.getElementById("send-filler-feedback");
const today=()=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=k=>parts.find(p=>p.type===k)?.value||"";return get("year")+"-"+get("month")+"-"+get("day");};
async function access(){
  let session;
  try{session=JSON.parse(sessionStorage.getItem("filler_customer_session_v1")||"null");}catch{return null;}
  if(!session?.access_token)return null;
  if(session.expires_at && session.expires_at<=Date.now()/1000+60){
    if(!session.refresh_token)return null;
    const r=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!r.ok)return null;
    session=await r.json();
    sessionStorage.setItem("filler_customer_session_v1",JSON.stringify(session));
  }
  return session.access_token;
}
async function request(path,opts={}){
  const token=await access();
  if(!token)throw Error("Inicia sesión en Mi Fiiller para responder.");
  const r=await fetch(BASE+"/rest/v1/"+path,{method:opts.method||"GET",headers:{"apikey":KEY,"Authorization":"Bearer "+token,"Content-Type":"application/json",...(opts.method?{"Prefer":"return=minimal"}:{})},body:opts.body?JSON.stringify(opts.body):undefined,cache:"no-store"});
  if(!r.ok){const data=await r.json().catch(()=>({}));const err=Error(data.message||"No se pudo guardar la encuesta.");err.code=data.code;throw err;}
  return r.status===204?null:await r.json().catch(()=>null);
}
function completed(){form.querySelectorAll("input,select,textarea,button").forEach(el=>el.disabled=true);output.textContent="✓ Gracias por compartir tu opinión. Puedes volver a responder mañana.";}
async function check(){
  try{
    const rows=await request("filler_feedback?select=id&survey_date=eq."+today()+"&limit=1");
    if(rows?.length)completed();
  }catch(error){output.textContent=error.message;}
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(button.disabled)return;
  const fields=new FormData(form);
  const values=Array.from({length:10},(_,i)=>Number(fields.get("q"+(i+1))));
  if(values.some(n=>!Number.isInteger(n)||n<1||n>5)){output.textContent="Responde las 10 preguntas con una calificación de 1 a 5.";return;}
  const question_ratings=Object.fromEntries(values.map((n,i)=>["q"+(i+1),n]));
  const average=(a)=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
  const payload={
    rating:average(values),
    food_rating:average(values.slice(3,6)),
    speed_rating:average(values.slice(8,10)),
    improvement:"ninguno",
    question_ratings,
    comment:String(fields.get("comment")||"").trim().slice(0,500)||null,
    suggested_dish:String(fields.get("suggested_dish")||"").trim().slice(0,120)||null,
    suggested_product_2:String(fields.get("suggested_product_2")||"").trim().slice(0,120)||null
  };
  button.disabled=true;output.textContent="Enviando tu opinión…";
  try{await request("filler_feedback",{method:"POST",body:payload});completed();}
  catch(err){button.disabled=false;output.textContent=err.code==="23505"?"Ya registramos tu opinión de hoy. ¡Gracias!":err.message;}
});
if(!document.getElementById("member").hidden)check();
const observer=new MutationObserver(()=>{if(!document.getElementById("member").hidden){observer.disconnect();check();}});
observer.observe(document.getElementById("member"),{attributes:true,attributeFilter:["hidden"]});
})();