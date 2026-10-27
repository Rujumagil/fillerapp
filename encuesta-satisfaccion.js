/* Encuesta visual Fiiller Café: estrellas y sugerencias con sesión autenticada. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const form=document.getElementById("filler-feedback-form");
if(!form)return;
const output=document.getElementById("filler-feedback-message");
const button=document.getElementById("send-filler-feedback");
const labels={1:"Muy malo",2:"Malo",3:"Regular",4:"Muy bueno",5:"Excelente"};
function selected(){
 let count=0;
 for(let i=1;i<=10;i++){
   const block=document.querySelector('[data-stars="'+i+'"]');
   if(!block)continue;
   const choice=block.querySelector('input:checked');
   const value=choice?Number(choice.value):0;
   if(value)count++;
   block.querySelectorAll(".star-choice").forEach(label=>{
     label.classList.toggle("selected",Number(label.querySelector("input").value)<=value);
   });
   document.getElementById("rating-text-"+i).textContent=value?value+" / 5 · "+labels[value]:"Sin calificar";
   document.querySelector('[data-question="'+i+'"]')?.classList.toggle("answered",!!value);
 }
 document.getElementById("survey-progress-label").textContent=count+" de 10 preguntas";
 document.getElementById("survey-progress").style.width=count*10+"%";
}
form.addEventListener("change",event=>{if(event.target.matches('input[type="radio"]'))selected();});
form.querySelectorAll(".stars").forEach(group=>{
  group.addEventListener("pointerover",ev=>{
    const label=ev.target.closest(".star-choice");
    if(!label)return;
    const rating=Number(label.querySelector("input").value);
    group.querySelectorAll(".star-choice").forEach(el=>el.classList.toggle("preview",Number(el.querySelector("input").value)<=rating));
  });
  group.addEventListener("pointerleave",()=>group.querySelectorAll(".star-choice").forEach(el=>el.classList.remove("preview")));
});
selected();
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
function completed(){form.querySelectorAll("input,select,textarea,button").forEach(el=>el.disabled=true);output.textContent="✓ ¡Gracias por participar! Tu opinión quedó registrada. Podrás responder nuevamente mañana.";output.scrollIntoView({behavior:"smooth",block:"center"});}
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
(async()=>{
  try{
    const token=await access();
    if(!token){
      document.getElementById("login-gate").hidden=false;
      output.textContent="Inicia sesión en Mi Fiiller para registrar tu evaluación.";
      button.disabled=true;
      return;
    }
    await check();
  }catch(error){output.textContent="No pudimos verificar tu sesión: "+error.message;button.disabled=true;}
})();
})();