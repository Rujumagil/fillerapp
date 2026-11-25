import webpush from "npm:web-push@3.6.7";
const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const allowed=new Set(["https://fiillercafe.app","https://www.fiillercafe.app","https://rujumagil.github.io"]);
async function db(path:string,method="GET",body?:unknown){const r=await fetch(BASE+"/rest/v1/"+path,{method,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error("DB "+r.status);return r.status===204?null:r.json()}
Deno.serve(async(req)=>{
const origin=req.headers.get("origin")||"";
const h={"Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://fiillercafe.app","Access-Control-Allow-Headers":"apikey,authorization,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"};
const out=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:h});
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
if(req.method!=="POST")return out(405,{error:"Método inválido"});
try{
const b=await req.json();
const config=(await db("filler_push_config?config_key=eq.primary&select=vapid_public_key,vapid_private_key,internal_dispatch_token"))?.[0];
if(!config?.vapid_public_key)return out(503,{error:"Push no configurado"});
if(b.action==="config"&&allowed.has(origin))return out(200,{publicKey:config.vapid_public_key});
if(b.action!=="dispatch")return out(400,{error:"Acción inválida"});
const secret=req.headers.get("x-fiiller-internal-dispatch")||"";
const expected=String(config.internal_dispatch_token||"");
if(!/^[a-f0-9]{64}$/i.test(expected)||secret.length!==expected.length)return out(403,{error:"No autorizado"});
let diff=0;for(let i=0;i<expected.length;i++)diff|=secret.charCodeAt(i)^expected.charCodeAt(i);
if(diff)return out(403,{error:"No autorizado"});
const id=String(b.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return out(400,{error:"ID inválido"});
const test=b.kind==="test";
const rows=await db((test?"filler_order_alert_tests":"filler_orders")+"?id=eq."+id+"&select="+(test?"id,created_at":"id,public_code,status"));
if(!rows?.length||(!test&&rows[0].status!=="Nuevo"))return out(200,{accepted:0});
const staff=await db("filler_staff?role=eq.cajera&select=user_id");
const ids=(staff||[]).map((x:{user_id:string})=>x.user_id);
if(!ids.length)return out(200,{accepted:0});
const subscriptions=await db("filler_cashier_push_subscriptions?active=eq.true&user_id=in.("+ids.join(",")+")&select=id,endpoint,p256dh,auth_secret&limit=100");
webpush.setVapidDetails("mailto:proyectocompas.info@gmail.com",config.vapid_public_key,config.vapid_private_key);
const payload=JSON.stringify({type:"cashier",id,title:test?"Fiiller Caja · Pedido de prueba":"Fiiller Caja · Nuevo pedido",body:test?"Pedido simulado. No preparar ni cobrar.":"Pedido #"+String(rows[0].public_code).slice(0,40)+" · Abre Caja para aceptarlo."});
let accepted=0,failed=0;
for(const s of subscriptions||[]){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},payload,{TTL:300,urgency:"high"});accepted++}catch(e){failed++;if([404,410].includes(Number((e as {statusCode?:number})?.statusCode)))await db("filler_cashier_push_subscriptions?id=eq."+s.id,"PATCH",{active:false}).catch(()=>{});}}
return out(200,{accepted,failed});
}catch{return out(503,{error:"No se pudo procesar el aviso"});}
});