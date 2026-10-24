import webpush from "web-push";

const SUPABASE_URL="https://qwxydjotwhniahaovrff.supabase.co";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v);
function authorized(request,env){
const actual=request.headers.get("Authorization")||"";
return Boolean(env.FILLER_TEST_TOKEN&&actual==="Bearer "+env.FILLER_TEST_TOKEN);
}
async function db(env,path,options={}){
if(!env.SUPABASE_SERVICE_ROLE_KEY)throw Error("Sin credenciales de Supabase");
const response=await fetch(SUPABASE_URL+"/rest/v1/"+path,{
...options,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,
"Content-Type":"application/json",...(options.headers||{})}});
if(!response.ok)throw Error("Error de base de datos ("+response.status+")");
return response.status===204?null:response.json();
}
export default {
async fetch(request,env){
const url=new URL(request.url);
if(url.pathname==="/health"&&request.method==="GET")return json({ok:true,service:"filler-push",sendingEnabled:false});
if(url.pathname!=="/send-test"||request.method!=="POST")return json({error:"No encontrado"},404);
if(!authorized(request,env))return json({error:"No autorizado"},401);
if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return json({error:"Configuración VAPID incompleta"},503);
let payload;try{payload=await request.json();}catch{return json({error:"JSON inválido"},400);}
if(!uuid(payload?.subscription_id))return json({error:"subscription_id inválido"},400);
try{
const rows=await db(env,"filler_push_subscriptions?select=id,endpoint,p256dh,auth_secret,active&id=eq."+encodeURIComponent(payload.subscription_id)+"&limit=1");
const sub=rows?.[0];
if(!sub?.active)return json({error:"Dispositivo no registrado o inactivo"},404);
webpush.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);
try{
await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},
JSON.stringify({type:"customer",title:"☕ Filler Café",body:"Notificación de prueba. No se modificó ningún pedido."}),{TTL:60});
return json({ok:true,subscription_id:sub.id});
}catch(error){
const code=Number(error?.statusCode||0);
if(code===404||code===410){
await db(env,"filler_push_subscriptions?id=eq."+encodeURIComponent(sub.id),{
method:"PATCH",headers:{Prefer:"return=minimal"},
body:JSON.stringify({active:false,updated_at:new Date().toISOString()})});
}
return json({error:"No se pudo entregar la notificación",pushStatus:code||null},502);
}
}catch(error){return json({error:"Error interno de envío"},500);}
}
};
