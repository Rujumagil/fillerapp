import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return ""}})();
const RESEND=Deno.env.get("FILLER_RESEND_API_KEY")||"";
const origins=new Set(["https://fiillercafe.app","https://www.fiillercafe.app","https://rujumagil.github.io"]);
const db=createClient(BASE,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const cors=(origin:string)=>({"Access-Control-Allow-Origin":origins.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"});
const answer=(o:string,status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:{...cors(o),"Content-Type":"application/json"}});
const validEmail=(s:string)=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const cap=(v:unknown,n:number)=>String(v||"").trim().slice(0,n)||null;
const safe=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,"0")).join("");
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=="POST"||!origins.has(origin))return answer(origin,403,{message:"Acceso no permitido."});
 if(!BASE||!SERVICE)return answer(origin,503,{message:"Servicio no configurado."});
 if(Number(req.headers.get("content-length")||0)>12000)return answer(origin,413,{message:"Solicitud demasiado grande."});
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return answer(origin,400,{message:"Solicitud inválida."})}
 const id=String(body.id||"").trim(),email=String(body.email||"").trim().toLowerCase();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||!validEmail(email))return answer(origin,400,{message:"Revisa tu correo electrónico."});
 const ratings=body.ratings;
 if(!Array.isArray(ratings)||ratings.length!==10||!ratings.every(n=>Number.isInteger(n)&&n>=1&&n<=5))return answer(origin,400,{message:"Responde las diez preguntas de la encuesta."});
 const note=cap(body.comment,500),suggested=cap(body.suggested_dish,120),second=cap(body.suggested_product_2,120);
 const avg=(a:number[])=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
 try{
  let record:any;
  const found=await db.from("filler_feedback").select("id,guest_email,invitation_email_status").eq("id",id).maybeSingle();
  if(found.error)throw found.error;
  if(found.data){
   if(found.data.guest_email!==email)return answer(origin,409,{message:"Este envío ya fue utilizado."});
   record=found.data;
  }else{
   // Prevent repeated unsolicited mail to one address within a short window.
   const bucket=Math.floor(Date.now()/180000);
   const key="survey-invitation:"+await hash(email)+":"+bucket;
   const throttle=await db.from("filler_auth_email_rate_limits").insert({rate_key:key});
   if(throttle.error)return answer(origin,429,{message:"Ya recibimos una encuesta reciente para este correo. Intenta en unos minutos."});
   const payload={id,user_id:null,guest_email:email,respondent_name:null,guest_verified_at:null,survey_date:day(),rating:avg(ratings),food_rating:avg(ratings.slice(3,6)),speed_rating:avg(ratings.slice(8)),improvement:"ninguno",question_ratings:Object.fromEntries(ratings.map((n,i)=>["q"+(i+1),n])),comment:note,suggested_dish:suggested,suggested_product_2:second,invitation_email_status:"pending"};
   const saved=await db.from("filler_feedback").insert(payload).select("id,guest_email,invitation_email_status").single();
   if(saved.error){console.error("fiiller survey save",saved.error.code);return answer(origin,503,{message:"No se pudo registrar la encuesta."})}
   record=saved.data;
  }
  if(record.invitation_email_status==="sent")return answer(origin,200,{saved:true,email_sent:true});
  if(!RESEND)return answer(origin,200,{saved:true,email_sent:false,message:"Encuesta registrada. El correo de invitación está pendiente de configuración."});
  const qr="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="+encodeURIComponent("https://www.fiillercafe.app/");
  const html='<!doctype html><html lang="es"><body style="margin:0;background:#f7f2e9;padding:24px 8px;font-family:Arial,sans-serif;color:#173d2b"><table role="presentation" style="width:100%;max-width:560px;margin:auto;background:white;border-collapse:collapse"><tr><td style="background:#006241;padding:25px;text-align:center"><img alt="Fiiller Café" src="https://fiillercafe.app/assets/filler-logo-oficial.webp" width="145"></td></tr><tr><td style="padding:30px;text-align:center"><h1>¡Gracias por tu opinión!</h1><p>Tu encuesta quedó registrada. Te invitamos a ordenar tus favoritos en línea y recogerlos en Fiiller Café.</p><p><a href="https://www.fiillercafe.app/" style="display:inline-block;background:#006241;color:#fff;padding:14px 24px;text-decoration:none;border-radius:8px;font-weight:bold">Ordenar en línea</a></p><p>O escanea este código QR:</p><img src="'+safe(qr)+'" alt="Código QR para ordenar en Fiiller Café" width="200" height="200"><p><a href="https://www.fiillercafe.app/">www.fiillercafe.app</a></p><p style="font-size:12px;color:#597466">Recibes este correo porque registraste una encuesta de satisfacción. No necesitas crear una cuenta para realizar un pedido.</p></td></tr></table></body></html>';
  const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+RESEND,"Content-Type":"application/json"},body:JSON.stringify({from:"Fiiller Café <hola@fiillercafe.app>",to:[email],subject:"Gracias por tu opinión · Ordena en Fiiller Café ☕",html,headers:{"X-Entity-Ref-ID":id},idempotency_key:"filler-survey-"+id})});
  if(!mail.ok){console.error("fiiller invitation mail",mail.status);await db.from("filler_feedback").update({invitation_email_status:"failed",invitation_email_error:"Provider HTTP "+mail.status}).eq("id",id);return answer(origin,200,{saved:true,email_sent:false,message:"Encuesta registrada. No se pudo enviar la invitación; el envío quedó pendiente."})}
  await db.from("filler_feedback").update({invitation_email_status:"sent",invitation_email_sent_at:new Date().toISOString(),invitation_email_error:null}).eq("id",id);
  return answer(origin,200,{saved:true,email_sent:true});
 }catch(err){console.error("fiiller survey submit",String(err).slice(0,140));return answer(origin,503,{message:"Servicio temporalmente no disponible."})}
});