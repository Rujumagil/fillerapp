const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return ""}})();
const ORIGINS=new Set(["https://fiillercafe.app","https://www.fiillercafe.app","https://rujumagil.github.io"]);
const headers=origin=>({"Access-Control-Allow-Origin":ORIGINS.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"});
const answer=(origin,status,obj)=>new Response(JSON.stringify(obj),{status,headers:headers(origin)});
async function table(path,method="GET",body){
 const r=await fetch(BASE+"/rest/v1/"+path,{method,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Accept:"application/json",Prefer:"return=representation"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const obj=await r.json().catch(()=>null);if(!r.ok)throw Error("Database "+r.status);return obj;
}
const today=()=>{const ps=new Intl.DateTimeFormat("en-US",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const part=k=>ps.find(x=>x.type===k)?.value||"";return [part("year"),part("month"),part("day")].join("-");};
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=="POST"||!ORIGINS.has(origin))return answer(origin,403,{message:"Origen no autorizado."});
 if(!BASE||!KEY)return answer(origin,503,{message:"El servicio push no está configurado."});
 let body;try{body=await req.json()}catch{return answer(origin,400,{message:"Solicitud inválida."})}
 try{
  if(body.action==="config"){
   const config=await table("filler_push_config?config_key=eq.primary&select=vapid_public_key");
   return config?.length?answer(origin,200,{publicKey:config[0].vapid_public_key}):answer(origin,503,{message:"Push no configurado."});
  }
  if(body.action!=="send")return answer(origin,400,{message:"Acción desconocida."});
  // Llamadas internas de administración desde pg_net usan una credencial aleatoria
  // que permanece en una tabla protegida; el cliente público nunca la recibe.
  const internalToken=req.headers.get("x-fiiller-internal-dispatch")||"";
  let internalAuthorized=false;
  if(/^[0-9a-f]{64}$/.test(internalToken)){
    const config=(await table("filler_push_config?config_key=eq.primary&select=internal_dispatch_token"))?.[0];
    const saved=String(config?.internal_dispatch_token||"");
    if(saved.length===64){
      const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(saved),"HMAC",false,["sign"]);
      const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("Fiiller push dispatcher"));
      const suppliedKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(internalToken),"HMAC",false,["sign"]);
      const digestSupplied=await crypto.subtle.sign("HMAC",suppliedKey,new TextEncoder().encode("Fiiller push dispatcher"));
      internalAuthorized=new Uint8Array(digest).every((byte,i)=>byte===new Uint8Array(digestSupplied)[i]);
    }
  }
  if(!internalAuthorized){
    const access=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
    if(!access)return answer(origin,401,{message:"Inicia sesión como administrador."});
    const auth=await fetch(BASE+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+access},cache:"no-store"});
    if(!auth.ok)return answer(origin,401,{message:"Sesión inválida."});
    const user=await auth.json();
    if(!/^[0-9a-f-]{36}$/i.test(String(user?.id||"")))return answer(origin,401,{message:"Cuenta inválida."});
    const staff=await table("filler_staff?user_id=eq."+user.id+"&role=eq.admin&select=role");
    if(!staff?.length)return answer(origin,403,{message:"Acceso solo para administradores."});
  }
  const id=String(body.campaign_id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return answer(origin,400,{message:"Campaña inválida."});
  const rows=await table("filler_promo_campaigns?id=eq."+id+"&select=id,status,title,body,image_url,target_url,feature_id");
  const c=rows?.[0];if(!c)return answer(origin,404,{message:"No existe la campaña."});
  if(c.status!=="draft")return answer(origin,409,{message:"Campaña ya procesada o en curso."});
  if(c.feature_id){
    const f=(await table("filler_storefront_features?id=eq."+encodeURIComponent(c.feature_id)+"&select=is_published,starts_on,ends_on"))?.[0];
    if(!f?.is_published||(f.starts_on&&f.starts_on>today())||(f.ends_on&&f.ends_on<today()))return answer(origin,409,{message:"La promoción debe estar publicada y vigente."});
  }
  const opted=await table("filler_customers?promotions_opt_in=eq.true&select=user_id&limit=2000");
  const ids=(opted||[]).map(x=>x.user_id).filter(x=>typeof x==="string");
  if(!ids.length)return answer(origin,409,{message:"Ningún cliente aceptó promociones.",subscribers:0});
  const subs=await table("filler_push_subscriptions?active=eq.true&user_id=in.("+ids.join(",")+")&select=id,endpoint,p256dh,auth_secret&limit=250");
  if(!subs?.length)return answer(origin,409,{message:"No hay dispositivos con push activado. El borrador no se envió.",subscribers:0});
  const keys=(await table("filler_push_config?config_key=eq.primary&select=vapid_public_key,vapid_private_key"))?.[0];
  if(!keys)return answer(origin,503,{message:"Claves VAPID no disponibles."});
  const loaded=await import("npm:web-push@3.6.7");const webpush=loaded.default||loaded;
  webpush.setVapidDetails("mailto:proyectocompas.info@gmail.com",keys.vapid_public_key,keys.vapid_private_key);
  const claimed=await table("filler_promo_campaigns?id=eq."+id+"&status=eq.draft","PATCH",{status:"processing",updated_at:new Date().toISOString()});
  if(!claimed?.length)return answer(origin,409,{message:"Ya se inició el envío."});
  const payload=JSON.stringify({type:"promotion",campaign_id:id,title:c.title,body:c.body,image:c.image_url,url:c.target_url||"./index.html#promociones"});
  let accepted=0,failed=0;
  for(let i=0;i<subs.length;i+=4){
   await Promise.all(subs.slice(i,i+4).map(async s=>{
     try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},payload,{TTL:21600,contentEncoding:"aes128gcm",urgency:"normal"});accepted++}
     catch(err){failed++;const code=Number(err?.statusCode||0);
       if(code===404||code===410)await table("filler_push_subscriptions?id=eq."+s.id,"PATCH",{active:false});
       console.warn("Fiiller push provider rejected",code)}
   }));
  }
  await table("filler_promo_campaigns?id=eq."+id,"PATCH",{status:accepted?"sent":"failed",sent_at:new Date().toISOString(),attempted_count:subs.length,delivered_to_push_service:accepted,updated_at:new Date().toISOString()});
  return answer(origin,200,{message:accepted?"Aviso aceptado por el servicio push.":"Los avisos fueron rechazados.",attempted:subs.length,accepted,failed});
 }catch(e){console.error("Fiiller push error",String(e).slice(0,150));return answer(origin,503,{message:"No se pudo procesar el envío. Revisa su estado."})}
});