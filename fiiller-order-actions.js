/* Fiiller: acciones seguras sobre pedidos del cliente (cuenta autenticada). */
(function(){
const anchor=document.getElementById("member-orders-list");if(!anchor)return;
const panel=document.createElement("section");panel.className="mi-v2-change-orders";panel.hidden=true;
panel.innerHTML='<h3 style="margin:0 0 8px">Modificar productos de mis pedidos</h3><p style="font-size:13px;color:#5d7062">Puedes retirar un producto mientras el pedido siga en Recibido. Si ya se prepara, solicita la cancelación por mensajes.</p><div id="fiiller-change-orders"></div>';
anchor.after(panel);
const root=panel.querySelector("#fiiller-change-orders");
const BASE="https://qwxydjotwhniahaovrff.supabase.co/rest/v1/",KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
// El token y la identidad se validan con FillerCustomerAuth; no leer sesiones obsoletas del almacenamiento.
async function api(path,init={}){const auth=await window.FillerCustomerAuth?.getSession();const token=auth?.access_token;if(!token)throw Error("Inicia sesión en Mi Fiiller.");const response=await fetch(BASE+path,{...init,headers:{apikey:KEY,Authorization:"Bearer "+token,...(init.body?{"Content-Type":"application/json"}:{})},cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||"No pudimos realizar la operación");return data}
const el=(t,s)=>{const n=document.createElement(t);n.textContent=s;return n};
async function load(){
  const auth=await window.FillerCustomerAuth?.getSession?.();
  if(!auth?.user?.id){panel.hidden=true;root.replaceChildren();return;}
  const userId=auth.user.id;
root.textContent="Consultando…";try{
const orders=await api("filler_orders?select=id,public_code,status,total,filler_order_items(id,name,qty,price)&customer_user_id=eq."+encodeURIComponent(userId)+"&status=in.(Nuevo,Preparando)&order=created_at.desc&limit=20");
const requests=await api("filler_cancel_requests?select=item_id,status,created_at&customer_user_id=eq."+encodeURIComponent(userId)+"&order=created_at.desc&limit=100");
const latestRequest=new Map();for(const entry of requests){if(!latestRequest.has(String(entry.item_id)))latestRequest.set(String(entry.item_id),entry.status)}
root.replaceChildren();if(!orders.length){panel.hidden=true;return}panel.hidden=false;
for(const order of orders){const card=el("div","");card.style.cssText="padding:13px 0;border-top:1px solid #e1eae1";const title=el("strong",order.public_code+" · "+order.status+" · $"+Number(order.total).toFixed(2));card.append(title);
for(const item of order.filler_order_items||[]){const line=el("div","");line.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0";
line.append(el("span",item.qty+" × "+item.name));
if(order.status==="Preparando"){const existing=latestRequest.get(String(item.id));const btn=el("button",existing==="pendiente"?"Pendiente de aprobación":existing==="rechazada"?"Solicitud rechazada":"Solicitar cancelación");btn.type="button";btn.disabled=Boolean(existing);btn.style.cssText="border-radius:10px;background:#d99a28;color:#231900;padding:9px;font-size:12px";btn.onclick=async()=>{const reason=prompt("¿Por qué deseas cancelar "+item.name+"?","Ya no lo necesito");if(reason===null)return;btn.disabled=true;try{await api("rpc/filler_request_item_cancellation",{method:"POST",body:JSON.stringify({p_order_id:order.id,p_item_id:item.id,p_reason:reason})});btn.textContent="Solicitud enviada";alert("Solicitud enviada. Fiiller debe aprobarla; el importe aún no cambia.")}catch(e){alert(e.message);btn.disabled=false}};line.append(btn)}
if(order.status==="Nuevo"){const btn=el("button","Cancelar producto");btn.type="button";btn.style.cssText="border-radius:10px;background:#b64235;color:white;padding:9px;font-size:12px";
btn.onclick=async()=>{if(!confirm("¿Cancelar "+item.qty+" × "+item.name+"? Esta acción no se puede deshacer."))return;btn.disabled=true;try{await api("rpc/filler_cancel_order_item",{method:"POST",body:JSON.stringify({p_order_id:order.id,p_item_id:item.id})});await load();document.getElementById("refresh-my-orders")?.click()}catch(e){alert(e.message);btn.disabled=false}};
line.append(btn)}card.append(line)}
const chat=document.createElement("a");chat.href="./atencion.html?pedido="+encodeURIComponent(order.id);chat.textContent=order.status==="Nuevo"?"Chat sobre este pedido":"Solicitar cancelación a Fiiller";chat.style.cssText="display:inline-block;color:#006241;font-weight:800;margin-top:7px";card.append(chat);root.append(card)}
}catch(e){panel.hidden=false;root.textContent=e.message}}
window.addEventListener("fiiller:member-ready",load);
window.addEventListener("fiiller:member-logout",()=>{panel.hidden=true;root.replaceChildren()});
if(!document.getElementById("member")?.hidden)load();
document.getElementById("refresh-my-orders")?.addEventListener("click",load);
})();