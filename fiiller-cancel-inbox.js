/* Bandeja de solicitudes de cancelación: solo administradores. */
(async function(){
const mount=document.getElementById("filler-cancellation-inbox");if(!mount)return;
const BASE="https://qwxydjotwhniahaovrff.supabase.co/rest/v1/",KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const heading=document.createElement("h2");heading.textContent="Solicitudes de cancelación";
const status=document.createElement("p");status.setAttribute("role","status");
const list=document.createElement("div");mount.append(heading,status,list);
function el(tag,txt){const node=document.createElement(tag);node.textContent=txt;return node}
async function req(path,options={}){const jwt=await FillerCloud.accessToken();if(!jwt)throw Error("Inicia sesión como administrador.");const r=await fetch(BASE+path,{...options,headers:{apikey:KEY,Authorization:"Bearer "+jwt,...(options.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={}}if(!r.ok)throw Error(data.message||"No fue posible consultar la solicitud.");return data}
async function refresh(){
const role=await FillerCloud.staffRole();if(role!=="admin"){status.textContent="Entra como administrador para revisar autorizaciones.";return}
const rows=await req("filler_cancel_requests?select=id,order_id,item_id,reason,created_at,item_name,item_qty,filler_orders(public_code,status)&status=eq.pendiente&order=created_at.asc&limit=50");
list.replaceChildren();status.textContent=rows.length?rows.length+" solicitud(es) pendiente(s).":"Sin solicitudes pendientes.";
for(const x of rows){
 const card=el("article","");card.style.cssText="border:1px solid #d7e6d9;border-radius:14px;padding:13px;margin:10px 0;background:#f9fcf9";
 card.append(el("strong",(x.filler_orders?.public_code||"Pedido")+" · "+(x.item_qty||"")+" × "+(x.item_name||"Producto")));
 card.append(el("p","Motivo: "+x.reason));
 const controls=el("div","");controls.style.cssText="display:flex;gap:10px;flex-wrap:wrap";
 for(const [approve,label] of [[true,"Aprobar cancelación"],[false,"Rechazar solicitud"]]){
  const b=el("button",label);b.type="button";b.style.cssText="cursor:pointer;background:"+(approve?"#b64235":"#006241")+";color:white;padding:10px 12px;border:0;border-radius:10px;font-weight:800";
  b.onclick=async()=>{if(!confirm((approve?"¿Aprobar cancelación y ajustar total y existencias?":"¿Rechazar solicitud sin cambiar el pedido?")))return;for(const child of controls.children)child.disabled=true;try{await req("rpc/filler_decide_item_cancellation",{method:"POST",body:JSON.stringify({p_request_id:x.id,p_approve:approve})});await refresh()}catch(e){status.textContent=e.message;for(const child of controls.children)child.disabled=false}};
  controls.append(b)
 }
 card.append(controls);list.append(card)
}
}
try{await refresh()}catch(e){status.textContent=e.message}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh().catch(e=>status.textContent=e.message)});
setInterval(()=>{if(!document.hidden)refresh().catch(e=>status.textContent=e.message)},30000)
})();