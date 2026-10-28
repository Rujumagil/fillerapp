/* Dashboard de KPIs privados: cifras reales, fuentes sin mezclar. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co", KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
const fmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:0});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(s,error=false){$("status").textContent=s;$("status").classList.toggle("error",error);}
async function show(){
 const role=await FillerCloud.staffRole();
 if(role!=="admin"){$("login-card").hidden=false;$("dashboard").hidden=true;status(role?"Este tablero requiere acceso de administrador.":"Inicia sesión con tu cuenta de administrador.");return;}
 const session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
 if(!session?.access_token)throw Error("La sesión caducó.");
 const response=await fetch(BASE+"/rest/v1/rpc/filler_operations_kpis",{method:"POST",headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:"{}",cache:"no-store"});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.message||"No se pudieron consultar los KPIs.");
 const manual=await fetch(BASE+"/rest/v1/filler_arrow_ticket_counts?select=sale_date,ticket_count",{headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token},cache:"no-store"});if(!manual.ok)throw Error("No se pudieron leer los tickets Arrow.");const rows=await manual.json();const min=new Date(Date.now()-29*86400000).toLocaleDateString("sv-SE",{timeZone:"America/Mexico_City"});const actualTickets=rows.filter(x=>x.sale_date>=min).reduce((a,x)=>a+Number(x.ticket_count),0);const sales=data.sales||{},orders=data.orders||{},inventory=data.inventory||{},feedback=data.feedback||{};
 $("login-card").hidden=true;$("dashboard").hidden=false;
 $("sales-amount").textContent=money(sales.amount);
 $("sales-tickets").textContent=fmt(actualTickets);
 $("ticket-average").textContent=actualTickets>0?money(Number(sales.amount)/actualTickets):"—";
 $("latest-day").textContent=sales.last_day||"Sin cortes";
 $("orders-total").textContent=fmt(orders.total);
 $("orders-open").textContent=fmt(orders.open);
 $("orders-delivered").textContent=fmt(orders.delivered);
 $("orders-value").textContent=money(orders.ordered_value);
 $("inventory-items").textContent=fmt(inventory.items);
 $("inventory-low").textContent=fmt(inventory.low);
 $("inventory-expiry").textContent=fmt(inventory.expiring);
 $("inventory-value").textContent=money(inventory.value);
 $("rating").textContent=feedback.rating===null?"Sin respuestas":Number(feedback.rating).toFixed(1)+" / 5";
 $("responses").textContent=fmt(feedback.responses);
 const days=(data.sales_days||[]).slice(-10);
 const maxDay=Math.max(...days.map(d=>Number(d.amount||0)),1);
 $("sales-chart").innerHTML=days.map(d=>'<div class="day-line"><span>'+escape(d.date)+'</span><div class="bar"><div class="fill" style="width:'+Math.round(100*Number(d.amount||0)/maxDay)+'%"></div></div><strong>'+money(d.amount)+'</strong></div>').join("")||'<p class="small">Todavía no hay cortes Arrow en el período.</p>';
 const products=data.top_products||[];
 const maxQ=Math.max(...products.map(d=>Number(d.qty||0)),1);
 $("top-products").innerHTML=products.map((d,i)=>'<div class="list-line"><span class="num">'+(i+1)+'</span><span class="name">'+escape(d.name)+'<br><span class="small">'+fmt(d.qty)+' unidades</span></span><div class="bar"><div class="fill" style="width:'+Math.round(100*Number(d.qty||0)/maxQ)+'%"></div></div></div>').join("")||'<p class="small">Aún no hay suficientes pedidos de la app para mostrar un ranking.</p>';
 $("updated").textContent="Actualizado: "+new Date(data.generated_at).toLocaleString("es-MX");
 status("✓ Indicadores actualizados desde Supabase. Ventas Arrow y pedidos de la app se mantienen separados.");
}
$("refresh").addEventListener("click",()=>show().catch(e=>status(e.message,true)));
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{if(f.elements.username.value.trim().toLowerCase()!=="admin")throw Error("Ingresa con el usuario admin.");await FillerCloud.login("admin",f.elements.password.value);await show();}
 catch(err){status(err.message,true);}finally{b.disabled=false;}
});
show().catch(e=>status(e.message,true));
})();