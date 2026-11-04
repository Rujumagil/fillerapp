/* Fiiller Café: encuesta rápida en dispositivo compartido; envía y limpia tras confirmación. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const form=document.getElementById("filler-feedback-form");
if(!form)return;
const email=document.getElementById("guest-email");
const output=document.getElementById("filler-feedback-message");
const button=document.getElementById("send-filler-feedback");
const thanks=document.getElementById("survey-thank-you");
const title=document.getElementById("survey-thank-you-title");
const description=document.getElementById("survey-thank-you-copy");
const labels={1:"Muy malo",2:"Malo",3:"Regular",4:"Muy bueno",5:"Excelente"};
let submissionId=crypto.randomUUID();
let resetTimer;
function progress(){
 let count=0;
 for(let i=1;i<=10;i++){
  const block=document.querySelector('[data-stars="'+i+'"]');
  if(!block)continue;
  const radio=block.querySelector("input:checked");
  const value=radio?Number(radio.value):0;
  if(value)count++;
  block.querySelectorAll(".star-choice").forEach(el=>{
   el.classList.toggle("selected",Number(el.querySelector("input").value)<=value);
  });
  const text=document.getElementById("rating-text-"+i);
  if(text)text.textContent=value?value+" / 5 · "+labels[value]:"Sin calificar";
  document.querySelector('[data-question="'+i+'"]')?.classList.toggle("answered",!!value);
 }
 document.getElementById("survey-progress-label").textContent=count+" de 10 preguntas";
 document.getElementById("survey-progress").style.width=count*10+"%";
}
form.addEventListener("change",event=>{if(event.target.matches('input[type="radio"]'))progress()});
form.querySelectorAll(".stars").forEach(group=>{
 group.addEventListener("pointerover",event=>{
  const label=event.target.closest(".star-choice");
  if(!label)return;
  const rating=Number(label.querySelector("input").value);
  group.querySelectorAll(".star-choice").forEach(el=>el.classList.toggle("preview",Number(el.querySelector("input").value)<=rating));
 });
 group.addEventListener("pointerleave",()=>group.querySelectorAll(".star-choice").forEach(el=>el.classList.remove("preview")));
});
function resetForNext(){
 clearTimeout(resetTimer);
 form.reset();
 form.querySelectorAll(".preview,.selected,.answered").forEach(el=>el.classList.remove("preview","selected","answered"));
 email.value="";
 output.textContent="";
 button.disabled=false;
 submissionId=crypto.randomUUID();
 progress();
 thanks.hidden=true;
 form.hidden=false;
 window.scrollTo({top:0,behavior:"instant"});
 email.focus({preventScroll:true});
}
form.addEventListener("submit",async event=>{
 event.preventDefault();
 if(button.disabled)return;
 const address=email.value.trim().toLowerCase();
 if(!email.checkValidity()||!address){output.textContent="Escribe un correo electrónico válido.";email.focus();return}
 const fields=new FormData(form);
 const ratings=Array.from({length:10},(_,i)=>Number(fields.get("q"+(i+1))));
 if(ratings.some(n=>!Number.isInteger(n)||n<1||n>5)){output.textContent="Responde las 10 preguntas.";return}
 button.disabled=true;
 output.textContent="Guardando tu encuesta…";
 const payload={id:submissionId,email:address,ratings,
  comment:String(fields.get("comment")||"").trim().slice(0,500),
  suggested_dish:String(fields.get("suggested_dish")||"").trim().slice(0,120),
  suggested_product_2:String(fields.get("suggested_product_2")||"").trim().slice(0,120)};
 try{
  const res=await fetch(BASE+"/functions/v1/filler-survey-submit",{
   method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"
  });
  const result=await res.json().catch(()=>({}));
  if(!res.ok||!result.saved)throw Error(result.message||"No pudimos guardar tu encuesta.");
  // Remove answers and personal data immediately, including the browser's autofill state.
  form.reset();email.value="";progress();form.hidden=true;
  title.textContent="¡Gracias por compartir tu opinión!";
  description.textContent=result.email_sent
    ?"Tu encuesta quedó registrada y enviamos la invitación con el QR a tu correo. La pantalla se limpiará para la siguiente persona."
    :(result.message||"La encuesta quedó guardada. La invitación por correo está pendiente. La pantalla se limpiará para la siguiente persona.");
  thanks.hidden=false;
  window.scrollTo({top:0,behavior:"instant"});
  resetTimer=setTimeout(resetForNext,3500);
 }catch(error){output.textContent=error.message||"No se pudo enviar la encuesta. Intenta nuevamente.";button.disabled=false}
});
progress();
})();