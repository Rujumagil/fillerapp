import webpush from "web-push";

const SUPABASE_URL="https://qwxydjotwhniahaovrff.supabase.co";
const ALLOWED_ORIGIN="https://rujumagil.github.io";
const json=(body,status=200,origin="")=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...(origin===ALLOWED_ORIGIN?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{})}});
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const authorized=(request,env)=>Boolean(env.FILLER_TEST_TOKEN&&request.headers.get("Authorization")==="Bearer "+env.FILLER_TEST_TOKEN);
async function db(env,path,options={}){
  if(!env.SUPABASE_SERVICE_ROLE_KEY)throw Error("Supabase no configurado");
  const response=await fetch(SUPABASE_URL+"/rest/v1/"+path,{
    ...options,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type":"application/json",...(options.headers||{})}
  });
  if(!response.ok)throw Error("Base de datos: "+response.status);
  return response.status===204?null:response.json();
}
function configureVapid(env){
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)throw Error("VAPID no configurado");
  webpush.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);
}
async function getOrder(env,token){
  const result=await db(env,"filler_orders?select=id,public_code,status,tracking_token&tracking_token=eq."+encodeURIComponent(token)+"&limit=1");
  return result?.[0]||null;
}
async function send(env,sub,payload){
  configureVapid(env);
  try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},JSON.stringify(payload),{TTL:3600});
    return "sent";
  }catch(error){
    const status=Number(error?.statusCode||0);
    if(status===404||status===410){
      await db(env,"filler_order_push_subscriptions?id=eq."+encodeURIComponent(sub.id),
        {method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:false,updated_at:new Date().toISOString()})});
      return "expired";
    }
    throw error;
  }
}
async function dispatchReady(env){
  const rows=await db(env,"filler_order_push_subscriptions?select=id,endpoint,p256dh,auth_secret,filler_orders!inner(public_code,status,tracking_token)&active=eq.true&ready_notified_at=is.null&filler_orders.status=eq.Listo&limit=100");
  let delivered=0;
  for(const sub of rows||[]){
    const order=sub.filler_orders;
    if(!order?.tracking_token)continue;
    try{
      const outcome=await send(env,sub,{type:"customer",code:order.public_code,body:"¡Tu pedido está listo para recoger en Filler Café!",tracking_url:"./pedido.html#token="+order.tracking_token});
      if(outcome==="sent"){
        await db(env,"filler_order_push_subscriptions?id=eq."+encodeURIComponent(sub.id),
          {method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({ready_notified_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
        delivered++;
      }
    }catch(error){console.error("Aviso no entregado",sub.id,String(error?.statusCode||"error"));}
  }
  return delivered;
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS"&&["/subscribe","/unsubscribe"].includes(url.pathname)){
      if(origin!==ALLOWED_ORIGIN)return json({error:"Origen no autorizado"},403);
      return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600","Vary":"Origin"}});
    }
    if(url.pathname==="/health"&&request.method==="GET")return json({ok:true,service:"filler-push",sendingEnabled:Boolean(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.SUPABASE_SERVICE_ROLE_KEY),customerPush:true});
    if(["/subscribe","/unsubscribe"].includes(url.pathname)&&request.method==="POST"){
      if(origin!==ALLOWED_ORIGIN)return json({error:"Origen no autorizado"},403);
      let payload;
      try{payload=await request.json();}catch{return json({error:"JSON inválido"},400,origin);}
      if(!uuid(payload?.tracking_token))return json({error:"Enlace de pedido inválido"},400,origin);
      const endpoint=payload?.subscription?.endpoint;
      if(typeof endpoint!=="string"||endpoint.length>2048||endpoint.length<20||!endpoint.startsWith("https://"))
        return json({error:"Suscripción inválida"},400,origin);
      try{
        const order=await getOrder(env,payload.tracking_token);
        if(!order)return json({error:"Pedido no encontrado"},404,origin);
        if(url.pathname==="/unsubscribe"){
          await db(env,"filler_order_push_subscriptions?order_id=eq."+order.id+"&endpoint=eq."+encodeURIComponent(endpoint),
            {method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:false,updated_at:new Date().toISOString()})});
          return json({ok:true},200,origin);
        }
        const keys=payload?.subscription?.keys;
        if(typeof keys?.p256dh!=="string"||keys.p256dh.length<30||keys.p256dh.length>250||
          typeof keys?.auth!=="string"||keys.auth.length<10||keys.auth.length>250)
          return json({error:"Claves de suscripción inválidas"},400,origin);
        if(["Cancelado","Entregado"].includes(order.status))return json({error:"El pedido ya terminó"},409,origin);
        const existing=await db(env,"filler_order_push_subscriptions?select=id,ready_notified_at&order_id=eq."+order.id+"&endpoint=eq."+encodeURIComponent(endpoint)+"&limit=1");
        const row={order_id:order.id,endpoint,p256dh:keys.p256dh,auth_secret:keys.auth,active:true,updated_at:new Date().toISOString()};
        if(existing?.length){
          await db(env,"filler_order_push_subscriptions?id=eq."+existing[0].id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(row)});
        }else{
          await db(env,"filler_order_push_subscriptions",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(row)});
        }
        return json({ok:true,push:true},200,origin);
      }catch(error){console.error("Registro de avisos",String(error?.message||"error"));return json({error:"No se pudo guardar la suscripción"},503,origin);}
    }
    if(url.pathname==="/send-test"&&request.method==="POST"){
      if(!authorized(request,env))return json({error:"No autorizado"},401);
      let payload;try{payload=await request.json();}catch{return json({error:"JSON inválido"},400);}
      if(!uuid(payload?.subscription_id))return json({error:"ID inválido"},400);
      try{
        const rows=await db(env,"filler_order_push_subscriptions?select=id,endpoint,p256dh,auth_secret,active&id=eq."+payload.subscription_id+"&limit=1");
        if(!rows?.[0]?.active)return json({error:"Dispositivo inactivo"},404);
        const outcome=await send(env,rows[0],{type:"customer",code:"Filler Café",body:"Notificación de prueba. No se modificó ningún pedido."});
        return json({ok:outcome==="sent"});
      }catch{return json({error:"Error de entrega"},502);}
    }
    return json({error:"No encontrado"},404);
  },
  async scheduled(event,env,ctx){
    ctx.waitUntil(dispatchReady(env).then(n=>console.log("Avisos de pedidos listos:",n)).catch(error=>console.error("Cron avisos",String(error?.message||"error"))));
  }
};
