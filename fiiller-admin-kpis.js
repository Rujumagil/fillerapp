/* Fiiller Café · Resumen de operación en admin.html.
 * Fuentes: cortes Arrow, pedidos digitales y almacén. Ningún indicador se infiere de pedidos no pagados.
 * Los mensajes representan avisos observados por el módulo existente en esta pestaña, no una bandeja global de pendientes.
 */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const cash=value=>Number(value).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2});
const whole=value=>Number(value).toLocaleString("es-MX");
const todayMexico=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let generation=0,busy=false,allowRefresh=true,lastRole=null;
function put(name,value,note,level=""){
 const v=$("kpi-"+name+"-value"),sub=$("kpi-"+name+"-note");
 if(v)v.textContent=value;
 if(sub)sub.textContent=note;
 const card=$("kpi-"+name);
 if(card)card.dataset.level=level;
}
function priority(name,value,note,level=""){
 const line=$("priority-"+name),v=$("priority-"+name+"-value"),sub=$("priority-"+name+"-note");
 if(!line)return;
 if(v)v.textContent=value;
 if(sub)sub.textContent=note;
 line.dataset.level=level;
}
function setNotice(message){
 const node=$("admin-kpi-updated");
 if(node)node.textContent=message;
}
function initMessageBadge(){
 const wrap=$("kpi-messages");
 if(!wrap)return;
 const bind=()=>{
  const badge=$("fiiller-chat-badge");
  if(!badge)return false;
  const render=()=>{
   const raw=String(badge.textContent||"").trim();
   const match=raw.match(/^(\d+)\s+nuevos?$/i);
   if(match)put("messages",whole(match[1]),"Avisos nuevos desde que abriste esta pantalla",Number(match[1])>0?"attention":"");
   else if(/mensajes al día/i.test(raw))put("messages","Al día","Sin nuevos avisos detectados en esta sesión");
   else if(/sin conexión/i.test(raw))put("messages","Sin conexión","Revisa la conexión de mensajería","warning");
   else if(/inicia sesión/i.test(raw))put("messages","Sin acceso","Inicia sesión para consultar mensajes");
   else put("messages","—",raw||"Conectando con mensajería…");
  };
  new MutationObserver(render).observe(badge,{childList:true,subtree:true,characterData:true});
  render();
  return true;
 };
 if(bind())return;
 const observer=new MutationObserver(()=>{
  if(bind())observer.disconnect();
 });
 observer.observe(document.querySelector("main")||document.body,{childList:true,subtree:true});
}
async function query(path,token,{count=false}={}){
 const response=await fetch(BASE+"/rest/v1/"+path,{
  headers:{"apikey":KEY,"Authorization":"Bearer "+token,...(count?{"Prefer":"count=exact"}:{})},
  cache:"no-store"
 });
 if(!response.ok){
  const payload=await response.json().catch(()=>null);
  throw Error(payload?.message||"Consulta no disponible ("+response.status+").");
 }
 if(count){
  const range=response.headers.get("content-range")||"";
  const total=range.match(/\/(\d+)$/);
  if(!total)throw Error("No se recibió un conteo completo de pedidos.");
  return Number(total[1]);
 }
 const rows=await response.json();
 if(!Array.isArray(rows))throw Error("Respuesta inesperada.");
 return rows;
}
function clearPrivate(){
 generation++;
 put("sales","—","Requiere sesión de administrador");
 put("orders","—","Requiere una sesión de personal");
 put("stock","—","Requiere sesión de administrador");
 priority("orders","—","Inicia sesión para revisar pedidos.");
 priority("stock","—","Inicia sesión para revisar existencias.");
 priority("sales","—","Inicia sesión para revisar el corte Arrow.");
 setNotice("Sin sesión administrativa. Los indicadores no muestran datos públicos.");
}
async function refresh(){
 if(!allowRefresh||busy||document.hidden)return;
 busy=true;
 const current=++generation;
 const refreshButton=$("admin-kpi-refresh");
 if(refreshButton)refreshButton.disabled=true;
 setNotice("Consultando fuentes autorizadas…");
 try{
  const role=await window.FillerCloud?.staffRole?.();
  if(current!==generation)return;
  lastRole=role||null;
  if(role!=="admin"&&role!=="cocina"){
   clearPrivate();return;
  }
  const token=await FillerCloud.accessToken();
  if(!token)throw Error("La sesión caducó. Ingresa nuevamente.");
  if(current!==generation)return;
  const fecha=todayMexico();
  // Los administradores pueden consultar datos financieros y de almacén.
  // El personal de cocina solo ve el conteo de pedidos, sin importar montos del TPV.
  const work=[
   {id:"orders",action:()=>query("filler_orders?select=id&status=in.(Nuevo,Preparando,Listo)&limit=1",token,{count:true})}
  ];
  if(role==="admin"){
   work.push({id:"sales",action:()=>query("ocs_filler_sales_days?select=sale_date,amount&sale_date=eq."+fecha+"&limit=1",token)});
   work.push({id:"stock",action:()=>query("filler_inventory_items?select=id,quantity,min_quantity&limit=1000",token)});
  }
  const finished=await Promise.allSettled(work.map(x=>x.action()));
  if(current!==generation)return;
  const data=new Map(work.map((x,i)=>[x.id,finished[i]]));
  const order=data.get("orders");
  if(order?.status==="fulfilled"){
   const count=order.value;
   put("orders",whole(count),"Pedidos digitales con estado Nuevo, Preparando o Listo",count>0?"attention":"");
   priority("orders",count?whole(count)+" activos":"Sin pendientes","Revisar nuevos pedidos y órdenes en preparación.",count>0?"attention":"");
  }else{
   put("orders","Sin datos","No se pudo obtener el conteo de pedidos","warning");
   priority("orders","Sin datos","Consulta no disponible; revisar en Pedidos.","warning");
  }
  if(role==="admin"){
   const sales=data.get("sales");
   if(sales?.status==="fulfilled"){
    const rows=sales.value;
    if(rows.length===0){
     put("sales","Sin corte","Arrow TPV · "+fecha+" · aún no hay registro");
     priority("sales","Sin corte","Verifica si falta capturar el corte del "+fecha+".","attention");
    }else if(rows.length===1&&Number.isFinite(Number(rows[0].amount))){
     put("sales",cash(rows[0].amount),"Corte TPV Arrow del "+fecha);
     priority("sales","Corte disponible","Venta Arrow de "+fecha+" registrada.");
    }else{
     put("sales","Sin datos","Hay datos de venta que requieren revisión","warning");
     priority("sales","Revisar","Importe del corte no válido o duplicado.","warning");
    }
   }else{
    put("sales","Sin datos","No se pudo consultar el corte Arrow","warning");
    priority("sales","Sin datos","Consulta Arrow no disponible.","warning");
   }
   const inv=data.get("stock");
   if(inv?.status==="fulfilled"){
    const rows=inv.value;
    if(rows.length>=1000){
     put("stock","Sin datos","Inventario supera el límite de consulta","warning");
     priority("stock","Revisar","La lectura del inventario podría estar incompleta.","warning");
    }else{
     const low=rows.filter(i=>Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity)).length;
     put("stock",whole(low),"Insumos en mínimo o debajo · inventario sin conciliar",low>0?"attention":"");
     priority("stock",low?whole(low)+" por revisar":"Sin alertas de mínimo","Validar existencias físicas antes de reponer.",low>0?"attention":"");
    }
   }else{
    put("stock","Sin datos","No se pudo consultar el inventario","warning");
    priority("stock","Sin datos","Revisar permisos y conexión de almacén.","warning");
   }
  }else{
   put("sales","Restringido","Ventas solo para administración");
   put("stock","Restringido","Inventario solo para administración");
   priority("sales","Restringido","Disponible para el administrador");
   priority("stock","Restringido","Disponible para el administrador");
  }
  setNotice("Consultado: "+new Intl.DateTimeFormat("es-MX",{timeZone:"America/Mexico_City",dateStyle:"short",timeStyle:"short"}).format(new Date())+" · Datos desde fuentes originales; no se mezclan pedidos y ventas.");
 }catch(e){
  if(current!==generation)return;
  clearPrivate();
  setNotice("No fue posible actualizar los indicadores: "+e.message);
 }finally{
  busy=false;
  if(refreshButton)refreshButton.disabled=false;
 }
}
$("admin-kpi-refresh")?.addEventListener("click",refresh);
window.addEventListener("fiiller-admin:logout",()=>{
 allowRefresh=false;lastRole=null;clearPrivate();
 put("messages","—","La sesión se cerró en esta pestaña");
});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&allowRefresh)refresh()});
window.setInterval(()=>{if(allowRefresh&&lastRole&& !document.hidden)refresh()},120000);
initMessageBadge();
refresh();
})();