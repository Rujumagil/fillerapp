import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";
const base=Deno.env.get("SUPABASE_URL")||"";
const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";}catch{return "";}})();
const resend=Deno.env.get("FILLER_RESEND_API_KEY")||"";
const allowed=new Set(["https://fiillercafe.app","https://www.fiillercafe.app","https://rujumagil.github.io"]);
const reply=(status:number,origin:string)=>new Response(JSON.stringify({message:"Si existe una cuenta con ese correo, recibirás instrucciones para recuperar tu acceso."}),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"apikey,content-type,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"apikey,content-type,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});
 if(req.method!=="POST"||(origin&&!allowed.has(origin)))return reply(403,origin);
 try{
  const body=await req.json();
  const email=String(body.email||"").trim().toLowerCase();
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return reply(200,origin);
  if(!base||!secret||!resend)return reply(503,origin);
  const supabase=createClient(base,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(email));
  const hashed=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
  const bucket=Math.floor(Date.now()/300000);
  const limit=await supabase.from("filler_auth_email_rate_limits").insert({rate_key:"recovery:"+hashed+":"+bucket});
  if(limit.error)return new Response(JSON.stringify({error:"Espera unos minutos antes de solicitar otro enlace."}),{status:429,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"apikey,content-type,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});
  const {data,error}=await supabase.auth.admin.generateLink({type:"recovery",email,options:{redirectTo:"https://fiillercafe.app/mi-filler.html"}});
  if(error||!data?.properties?.action_link)return reply(200,origin);
  // El usuario inició la recuperación desde el sitio oficial de Fiiller.
  // No depender del registro de perfil: algunas cuentas existentes carecen de metadata Fiiller.
  const url=data.properties.action_link.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;");
  const html='<html lang="es"><body style="background:#f6f2e9;padding:24px;font-family:Arial,sans-serif;color:#183629"><table role="presentation" style="max-width:570px;margin:auto;background:#fff;width:100%"><tr><td style="text-align:center;background:#006241;padding:28px"><img alt="Fiiller Café" width="170" src="https://fiillercafe.app/assets/filler-logo-oficial.webp"></td></tr><tr><td style="padding:32px"><h1>Recupera tu acceso a Mi Fiiller ☕</h1><p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p><p style="margin:32px 0;text-align:center"><a style="background:#006241;color:white;padding:16px 24px;text-decoration:none;border-radius:8px" href="'+url+'">Restablecer mi contraseña</a></p><p>Si no lo solicitaste, ignora este mensaje.</p></td></tr><tr><td style="text-align:center;background:#eff5ef;padding:18px;font-size:12px">Fiiller Café · fiillercafe.app</td></tr></table></body></html>';
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resend,"Content-Type":"application/json"},body:JSON.stringify({from:"Fiiller Café <hola@fiillercafe.app>",to:[email],subject:"Mi Fiiller ☕ Recupera tu contraseña",html})});
  if(!response.ok){console.error("Fiiller recovery delivery failed",response.status);return new Response(JSON.stringify({error:"El proveedor no pudo enviar el correo."}),{status:502,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"apikey,content-type,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});}
  return reply(200,origin);
 }catch(err){console.error("Fiiller recovery unexpected error",String(err).slice(0,80));return reply(200,origin);}
});