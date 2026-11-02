/* Encuesta Fiiller: clientes autenticados y visitantes con correo verificado. */
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
// Mes calendario basado en el reloj de Guadalajara, nunca en el del celular.
const monthWindow=()=>{
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"America/Mexico_City",year:"numeric",month:"2-digit"
  }).formatToParts(new Date());
  const get=type=>Number(parts.find(p=>p.type===type)?.value||0);
  const year=get("year"),month=get("month");
  if(!year||!month)throw Error("No se pudo calcular el período mensual.");
  const start=year+"-"+String(month).padStart(2,"0")+"-01";
  const next=new Date(Date.UTC(year,month,1));
  const end=next.toISOString().slice(0,10);
  const nextLabel=new Intl.DateTimeFormat("es-MX",{
    timeZone:"UTC",day:"numeric",month:"long",year:"numeric"
  }).format(next);
  const label=new Intl.DateTimeFormat("es-MX",{
    timeZone:"UTC",month:"long",year:"numeric"
  }).format(new Date(Date.UTC(year,month-1,1)));
  return {start,end,nextLabel,label};
};
let checkedMonth=monthWindow().start;
function showPeriod(){
 const p=monthWindow();
 const period=document.getElementById("survey-month-period");
 if(period)period.textContent="Encuesta de "+p.label+". Se permite una respuesta por cliente y mes.";
 const renewal=document.getElementById("survey-renewal");
 if(renewal)renewal.textContent="Nueva encuesta disponible desde el "+p.nextLabel+".";
 return p;
}
showPeriod();
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
const guestPanel=document.getElementById("guest-verification");
const guestName=document.getElementById("guest-name");
const guestCodeArea=document.getElementById("guest-code-area");
let issuedIdentity=null;
const guestEmail=document.getElementById("guest-email");
const guestCode=document.getElementById("guest-code");
const guestSendCode=document.getElementById("guest-send-code");
const guestMessage=document.getElementById("guest-code-message");
const thankYou=document.getElementById("survey-thank-you");
const thankYouTitle=document.getElementById("survey-thank-you-title");
const thankYouCopy=document.getElementById("survey-thank-you-copy");

function completed(guest=false,duplicate=false){
 const p=showPeriod();
 form.hidden=true;
 thankYou.hidden=false;
 thankYouTitle.textContent=duplicate?"Ya registramos una respuesta este mes":"¡Gracias por compartir tu opinión!";
 thankYouCopy.textContent=duplicate
   ?"Ya contamos con una encuesta de este mes. Podrás participar nuevamente el "+p.nextLabel+"."
   :"Tus respuestas quedaron registradas. Nos ayudan a mejorar Fiiller Café. ¡Te esperamos en tu próximo pedido!";
 document.getElementById("survey-register-cta").hidden=!guest;
 document.getElementById("survey-login-cta").hidden=!guest;
 thankYou.scrollIntoView({behavior:"smooth",block:"center"});
}
async function guestRequest(payload){
 const response=await fetch(BASE+"/functions/v1/filler-guest-survey",{
   method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},
   body:JSON.stringify(payload),cache:"no-store"
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const err=Error(data.message||"No se pudo enviar la encuesta.");err.status=response.status;throw err;}
 return data;
}
function readGuestIdentity(){
 const name=guestName.value.trim().replace(/\s+/g," ");
 const email=guestEmail.value.trim().toLowerCase();
 if(name.length<2||name.length>60){
   guestName.focus();
   throw Error("Escribe solo tu nombre (de 2 a 60 caracteres), sin necesidad de apellidos.");
 }
 if(!email||!guestEmail.checkValidity()){
   guestEmail.focus();
   throw Error("Ingresa un correo electrónico válido.");
 }
 return {name,email};
}
function saveSignupData(identity){
 try{
   sessionStorage.setItem("filler_survey_signup_email",identity.email);
   sessionStorage.setItem("filler_survey_signup_name",identity.name);
 }catch{}
}
function resetVerificationIfEdited(){
 if(!issuedIdentity)return;
 if(guestName.value.trim().replace(/\s+/g," ")===issuedIdentity.name &&
    guestEmail.value.trim().toLowerCase()===issuedIdentity.email)return;
 issuedIdentity=null;
 guestCode.value="";
 guestCodeArea.hidden=true;
 guestMessage.textContent="Cambiaste tus datos. Solicita un nuevo código para confirmar el correo.";
}
guestName.addEventListener("input",resetVerificationIfEdited);
guestEmail.addEventListener("input",resetVerificationIfEdited);
guestSendCode.addEventListener("click",async()=>{
 let identity;
 try { identity=readGuestIdentity(); }
 catch(error){ guestMessage.textContent=error.message;return; }
 guestSendCode.disabled=true;
 guestMessage.textContent="Enviando código de verificación…";
 try{
   const result=await guestRequest({action:"send_code",...identity});
   issuedIdentity=identity;
   guestCodeArea.hidden=false;
   guestMessage.textContent=result.message||"Revisa tu correo, incluida la carpeta de spam.";
   guestCode.focus();
 }catch(error){guestMessage.textContent=error.message;}
 finally{guestSendCode.disabled=false;}
});
async function check(){
  try{
    const p=showPeriod();
    const rows=await request("filler_feedback?select=id&survey_date=gte."+p.start+
      "&survey_date=lt."+p.end+"&limit=1");
    if(rows?.length)completed(false,true);
    else{output.textContent="Puedes responder la encuesta de "+p.label+". Una respuesta por mes.";button.disabled=false;}
  }catch(error){output.textContent="No fue posible validar si ya respondiste: "+error.message;button.disabled=true;}
}
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(button.disabled)return;
  const fields=new FormData(form);
  const values=Array.from({length:10},(_,i)=>Number(fields.get("q"+(i+1))));
  if(values.some(n=>!Number.isInteger(n)||n<1||n>5)){
    output.textContent="Responde las 10 preguntas con una calificación de 1 a 5.";
    return;
  }
  const question_ratings=Object.fromEntries(values.map((n,i)=>["q"+(i+1),n]));
  const average=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
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
  button.disabled=true;
  output.textContent="Enviando tu opinión…";
  try {
    const token=await access();
    if(token){
      await request("filler_feedback",{method:"POST",body:payload});
      completed(false);
    }else{
      const identity=readGuestIdentity();
      if(!issuedIdentity||issuedIdentity.email!==identity.email||issuedIdentity.name!==identity.name)
        throw Error("Solicita y confirma el código de verificación de tu correo.");
      if(!/^[0-9]{6}$/.test(guestCode.value.trim()))
        throw Error("Introduce el código de seis dígitos que enviamos a tu correo.");
      await guestRequest({action:"submit",email:identity.email,code:guestCode.value.trim(),
        ratings:values,comment:payload.comment,suggested_dish:payload.suggested_dish,
        suggested_product_2:payload.suggested_product_2});
      saveSignupData(identity);
      completed(true);
    }
  }catch(err){
    if(err.code==="23505"){
      completed(false,true);
    }else if(err.status===409){
      try{saveSignupData(readGuestIdentity());}catch{}
      completed(true,true);
    }else{
      output.textContent=err.message||"No pudimos guardar tu encuesta.";
      button.disabled=false;
      output.scrollIntoView({behavior:"smooth",block:"center"});
    }
  }
});
(async()=>{
  try {
    const token=await access();
    if(token){
      guestPanel.hidden=true;
      document.getElementById("login-gate").hidden=true;
      await check();
    }else{
      guestPanel.hidden=false;
      document.getElementById("login-gate").hidden=false;
      output.textContent="Escribe un nombre y tu correo. Confírmalo para guardar tu encuesta sin registrarte.";
      button.disabled=false;
    }
  }catch(error){
    guestPanel.hidden=false;
    button.disabled=false;
    output.textContent="Puedes responder como visitante: ingresa un nombre y correo electrónico para confirmar tu opinión.";
  }
})();
// Si la encuesta quedó abierta hasta el siguiente mes, recuperar su disponibilidad
// al regresar a la pestaña sin exigir al cliente que recuerde recargarla.
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden&&monthWindow().start!==checkedMonth)location.reload();
});
})();