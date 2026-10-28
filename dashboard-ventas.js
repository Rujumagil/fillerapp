/* Dashboard de KPIs privados: cifras reales, fuentes sin mezclar. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co", KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
const fmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:0});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(s,error=false){$("status").textContent=s;$("status").classList.toggle("error",error);}

function renderSalesTrend(dates,salesByDate,firstDay){
 const node=$("sales-trend-chart");
 const entries=dates.map(date=>({date,value:salesByDate.has(date)?Number(salesByDate.get(date)):null}));
 const valid=entries.filter(e=>e.value!==null&&Number.isFinite(e.value));
 if(!valid.length){node.textContent="Todavía no hay ventas confirmadas este mes.";return;}
 const total=valid.reduce((n,e)=>n+e.value,0),average=total/valid.length;
 const highest=valid.reduce((a,b)=>b.value>a.value?b:a);
 $("trend-average").textContent=money(average);
 $("trend-high").textContent=money(highest.value);
 $("trend-high-date").textContent="Día "+Number(highest.date.slice(-2));
 $("trend-days").textContent=fmt(valid.length);
 const pending=entries.filter(e=>e.value===null);
 $("trend-pending").textContent=pending.length?"Días sin corte confirmado: "+pending.map(e=>Number(e.date.slice(-2))).join(", ")+". No representan ventas de $0.":"Todos los días del periodo tienen corte.";
 const colWidth=64,barWidth=49,left=78,right=20,top=30,bottom=63,height=390;
 const width=Math.max(1020,left+right+entries.length*colWidth),plotHeight=height-top-bottom;
 const maximum=Math.max(1000,Math.ceil(Math.max(...valid.map(e=>e.value))*1.12/1000)*1000);
 const y=v=>top+plotHeight*(1-v/maximum),base=y(0);
 const avgY=y(average);
 let grid="";
 for(let i=0;i<=4;i++){const value=maximum*i/4,gy=y(value);grid+='<line x1="'+left+'" y1="'+gy+'" x2="'+(width-right)+'" y2="'+gy+'" stroke="#e2ece6" stroke-width="1"/><text x="'+(left-10)+'" y="'+(gy+4)+'" text-anchor="end" font-size="12" fill="#63796b">'+escape("$"+fmt(value))+'</text>';}
 const avg='<line x1="'+left+'" y1="'+avgY+'" x2="'+(width-right)+'" y2="'+avgY+'" stroke="#d79c31" stroke-width="2" stroke-dasharray="7 6"/>';
 const bars=entries.map((e,i)=>{
   const cx=left+colWidth*(i+.5),x=cx-barWidth/2,day=Number(e.date.slice(-2));
   const dateText='<text x="'+cx+'" y="'+(height-31)+'" text-anchor="middle" font-size="12" font-weight="750" fill="#234d39">'+day+'</text>';
   if(e.value===null)return '<g><rect x="'+x+'" y="'+(base-30)+'" width="'+barWidth+'" height="30" rx="7" fill="#f3f5f2" stroke="#bdcbc0" stroke-dasharray="4 4"/><text x="'+cx+'" y="'+(base-12)+'" text-anchor="middle" font-size="10" fill="#718275">S/D</text>'+dateText+'<title>'+escape(e.date+": sin corte")+'</title></g>';
   const isMax=e.date===highest.date;
   const realHeight=base-y(e.value);
   const displayHeight=Math.max(28,realHeight);
   const topY=base-displayHeight;
   const color=isMax?"#ca9027":"#087650";
   const amount="$"+fmt(e.value);
   const fontSize=amount.length>6?10:11.5;
   return '<g><rect x="'+x+'" y="'+topY+'" width="'+barWidth+'" height="'+displayHeight+'" rx="6" fill="'+color+'"/><text x="'+cx+'" y="'+(topY+displayHeight/2+fontSize*.35)+'" text-anchor="middle" font-size="'+fontSize+'" font-weight="850" fill="#ffffff">'+escape(amount)+'</text>'+dateText+'<title>'+escape(e.date+": "+money(e.value))+'</title></g>';
 }).join("");
 node.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ventas diarias oficiales mostradas en barras verdes con importes centrados. Fechas pendientes sin venta confirmada se muestran como S/D." style="display:block;min-width:'+width+'px;width:100%;height:auto">'+grid+avg+bars+'<text x="'+(width/2)+'" y="'+(height-8)+'" text-anchor="middle" font-size="12" fill="#63796b">Día del mes</text></svg>';
 $("sales-trend-title").textContent="Ventas por día · "+new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
}

async function show(){
 const role=await FillerCloud.staffRole();
 if(role!=="admin"){$("login-card").hidden=false;$("dashboard").hidden=true;status(role?"Este tablero requiere acceso de administrador.":"Inicia sesión con tu cuenta de administrador.");return;}
 const session=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
 if(!session?.access_token)throw Error("La sesión caducó.");
 const response=await fetch(BASE+"/rest/v1/rpc/filler_operations_kpis",{method:"POST",headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:"{}",cache:"no-store"});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.message||"No se pudieron consultar los KPIs.");
 const manual=await fetch(BASE+"/rest/v1/filler_arrow_ticket_counts?select=sale_date,ticket_count",{headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token},cache:"no-store"});if(!manual.ok)throw Error("No se pudieron leer los tickets Arrow.");const rows=await manual.json();const min=new Date(Date.now()-29*86400000).toLocaleDateString("sv-SE",{timeZone:"America/Mexico_City"});const actualTickets=rows.filter(x=>x.sale_date>=min).reduce((a,x)=>a+Number(x.ticket_count),0);const monthNow=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const firstDay=monthNow.slice(0,7)+"-01";
 const nextMonth=new Date(firstDay+"T12:00:00Z");nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
 const monthEnd=nextMonth.toISOString().slice(0,10);
 const monthRequest=await fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte."+firstDay+"&sale_date=lt."+monthEnd+"&order=sale_date.asc",{headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token},cache:"no-store"});
 if(!monthRequest.ok)throw Error("No se pudieron cargar las ventas del mes.");
 const monthSales=await monthRequest.json();
 const salesByDate=new Map(monthSales.map(x=>[x.sale_date,Number(x.amount)]));
 const ticketByDate=new Map(rows.map(x=>[x.sale_date,Number(x.ticket_count)]));
 const dayOfMonth=Number(monthNow.slice(-2));
 const dates=Array.from({length:dayOfMonth},(_,i)=>firstDay.slice(0,8)+String(i+1).padStart(2,"0")).filter(day=>{const weekday=new Date(day+"T12:00:00Z").getUTCDay();return weekday!==0&&weekday!==6;});
 renderSalesTrend(dates,salesByDate,firstDay);
 const monthTickets=dates.reduce((sum,d)=>sum+(ticketByDate.get(d)||0),0);
 const monthAmount=dates.reduce((sum,d)=>sum+(salesByDate.get(d)||0),0);
 $("month-table-title").textContent="Ventas diarias · "+new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{timeZone:"UTC",month:"long",year:"numeric"});
 $("monthly-sales-rows").innerHTML=dates.map(d=>'<tr style="border-bottom:1px solid #e7ece5"><td style="padding:11px">'+escape(d)+'</td><td style="padding:11px;text-align:right">'+(ticketByDate.has(d)?fmt(ticketByDate.get(d)):'<span class="small">Pendiente</span>')+'</td><td style="padding:11px;text-align:right">'+(salesByDate.has(d)?money(salesByDate.get(d)):'<span class="small">Sin corte</span>')+'</td></tr>').join("");
 $("monthly-tickets-total").textContent=fmt(monthTickets)+" registrados";
 $("monthly-sales-total").textContent=money(monthAmount);
 $("monthly-sales-note").textContent="Tickets manuales capturados: "+dates.filter(d=>ticketByDate.has(d)).length+" días. Cortes importados: "+dates.filter(d=>salesByDate.has(d)).length+" días. Los días pendientes no se consideran ventas de $0.";
 const sales=data.sales||{},orders=data.orders||{},inventory=data.inventory||{},feedback=data.feedback||{};
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