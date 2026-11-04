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
 const colWidth=64,barWidth=49,left=78,right=20,top=24,bottom=48,height=296;
 const width=Math.max(580,left+right+entries.length*colWidth),plotHeight=height-top-bottom;
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


// Referencia importada del TPV octubre 2026: venta NETA de columna Importe, con movimientos positivos y negativos.
// Cantidad Presentación no es una venta monetaria; líneas negativas compensan operaciones, según documentos.
const OCTOBER_TPV_POSITIVE={"2026-10-01":7233,"2026-10-02":845,"2026-10-05":5372,"2026-10-06":5449,"2026-10-07":8635,"2026-10-08":5079,"2026-10-09":1570,"2026-10-12":3840,"2026-10-13":8056,"2026-10-14":10714,"2026-10-15":4722,"2026-10-16":936,"2026-10-19":5192,"2026-10-20":8584,"2026-10-21":9312,"2026-10-22":3093,"2026-10-23":781,"2026-10-26":3101,"2026-10-27":5786,"2026-10-28":4482,"2026-10-29":3429,"2026-10-30":611};
async function showOctoberReconciliation(token){
 const q=await fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte.2026-10-01&sale_date=lte.2026-10-31&order=sale_date.asc",{headers:{"apikey":KEY,"Authorization":"Bearer "+token},cache:"no-store"});
 if(!q.ok)throw Error("No fue posible consultar los cortes de octubre para la conciliación.");
 const rows=await q.json();
 const stored=new Map(rows.map(r=>[r.sale_date,Number(r.amount)]));
 const days=Object.entries(OCTOBER_TPV_POSITIVE);
 const reference=days.reduce((s,[,n])=>s+n,0);
 let matched=0,matchedReference=0,matchedStored=0;
 const missing=[],different=[];
 const lines=days.map(([date,tpv])=>{
  const has=stored.has(date), app=has?stored.get(date):null;
  if(has){matched++;matchedReference+=tpv;matchedStored+=app;if(Math.abs(tpv-app)>0.009)different.push(date);}else missing.push(date);
  const delta=has?tpv-app:null;
  const issue=!has?"Sin corte":Math.abs(delta)>0.009?"Diferencia":"Coincide";
  return '<tr><td>'+escape(date)+'</td><td style="text-align:right">'+money(tpv)+'</td><td style="text-align:right">'+(has?money(app):"Pendiente")+'</td><td style="text-align:right">'+(has?money(delta):"—")+'</td><td>'+issue+'</td></tr>';
 });
 const unexpected=[...stored.keys()].filter(date=>!Object.prototype.hasOwnProperty.call(OCTOBER_TPV_POSITIVE,date));
 $("oct-tpv-total").textContent=money(reference);
 $("oct-app-total").textContent=money([...stored.values()].reduce((a,b)=>a+b,0));
 $("oct-compared-days").textContent=matched+" de "+days.length;
 $("oct-matched-difference").textContent=money(matchedReference-matchedStored);
 $("oct-sales-rows").innerHTML=lines.join("");
 $("oct-reconciliation-note").textContent="La diferencia corresponde únicamente a los "+matched+" días con corte en ambas fuentes. "+(missing.length?"Sin corte para "+missing.length+" día(s): "+missing.join(", ")+". ":"")+(unexpected.length?"Fechas adicionales en la app: "+unexpected.join(", ")+". ":"")+"Movimientos negativos aplicados: −$14,461. La versión anterior de Supabase se preserva en fiiller_sales_reconciliation_audit.";
 $("oct-reconciliation-status").textContent=missing.length||different.length||unexpected.length?"Requiere conciliación: "+different.length+" día(s) con diferencias; "+missing.length+" sin corte.":"Todos los días disponibles coinciden con el reporte TPV neto.";
}


async function renderTpvProductRanking(token,firstDay){
 const res=await fetch(BASE+"/rest/v1/fiiller_tpv_product_monthly?select=product_code,product_name,net_units,net_amount&sale_month=eq."+firstDay+"&order=net_amount.desc&limit=1000",{headers:{"apikey":KEY,"Authorization":"Bearer "+token},cache:"no-store"});
 if(!res.ok)throw Error("No se pudieron consultar los movimientos de productos del TPV.");
 const items=await res.json();
 const active=items.filter(p=>Number(p.net_units)>0 && Number(p.net_amount)>0);
 const total=items.reduce((a,p)=>a+Number(p.net_amount),0);
 $("tpv-product-count").textContent=fmt(active.length)+" productos con movimiento neto";
 $("tpv-products-total").textContent=money(total);
 $("tpv-products-month").textContent=new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
 const byAmount=[...active].sort((a,b)=>Number(b.net_amount)-Number(a.net_amount)).slice(0,10);
 const byUnits=[...active].sort((a,b)=>Number(b.net_units)-Number(a.net_units)).slice(0,10);
 function renderRanking(id,records,key,unit){
   const max=Math.max(1,...records.map(p=>Number(p[key])));
   $(id).innerHTML=records.map((p,i)=>{
    const val=Number(p[key]);
    return '<div class="list-line"><span class="num">'+(i+1)+'</span><span class="name"><strong>'+escape(p.product_name)+'</strong><br><span class="small">'+escape(p.product_code)+'</span></span><div class="bar"><div class="fill" style="width:'+Math.max(1,Math.round(100*val/max))+'%"></div></div><span style="min-width:85px;text-align:right;font-weight:800">'+(unit==="money"?money(val):fmt(val)+" uds.")+'</span></div>';
   }).join("")||'<p class="small">Sin movimientos de productos TPV en el mes elegido. Selecciona octubre de 2026 para ver el histórico conciliado.</p>';
 }
 renderRanking("tpv-products-income",byAmount,"net_amount","money");
 renderRanking("tpv-products-units",byUnits,"net_units","units");
 $("tpv-products-note").textContent=items.length?"Fuente: TPV Arrow, importes y unidades netas; no incluye pedidos digitales.":"Todavía no hay archivo detallado de artículos del TPV para este mes. No se asume que las ventas sean cero.";
}


async function renderGoals(token,firstDay,monthEnd,dates,salesByDate,ticketByDate,monthNow){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const targetResponse=await fetch(BASE+"/rest/v1/fiiller_monthly_targets?select=effective_month,sales_target,tickets_target,avg_ticket_target&effective_month=lte."+firstDay+"&order=effective_month.desc&limit=1",{headers,cache:"no-store"});
 if(!targetResponse.ok)throw Error("No se pudieron consultar las metas mensuales.");
 const targets=await targetResponse.json();
 const target=targets[0];
 const nowMonth=monthNow.slice(0,7),selected=firstDay.slice(0,7),future=selected>nowMonth,current=selected===nowMonth;
 const amount=[...salesByDate.values()].reduce((a,v)=>a+v,0);
 const ticketDays=dates.filter(d=>ticketByDate.has(d));
 const ticketCount=ticketDays.reduce((a,d)=>a+ticketByDate.get(d),0);
 const matched=dates.filter(d=>ticketByDate.get(d)>0&&salesByDate.has(d));
 const matchedTickets=matched.reduce((a,d)=>a+ticketByDate.get(d),0);
 const matchedSales=matched.reduce((a,d)=>a+salesByDate.get(d),0);
 const average=matchedTickets?matchedSales/matchedTickets:null;
 const observedDates=dates.filter(d=>salesByDate.has(d));
 const missingSales=dates.filter(d=>!salesByDate.has(d));
 const missingTickets=dates.filter(d=>!ticketByDate.has(d));
 const targetSales=Number(target?.sales_target||0),targetTickets=Number(target?.tickets_target||0),targetAvg=Number(target?.avg_ticket_target||0);
 const salesPct=targetSales?100*amount/targetSales:0;
 const ticketsPct=targetTickets?100*ticketCount/targetTickets:0;
 $("goal-period").textContent=new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
 $("goal-configuration").textContent=target?(target.effective_month===firstDay?"Metas configuradas para este mes":"Metas vigentes desde "+target.effective_month):"No hay una meta configurada para este mes";
 const put=(id,text)=>$(id).textContent=text;
 put("goal-sales",target?money(targetSales):"Sin meta");
 put("goal-tickets",target?fmt(targetTickets):"Sin meta");
 put("goal-average",target?money(targetAvg):"Sin meta");
 put("goal-sales-actual",observedDates.length?money(amount):"Sin cortes");
 put("goal-tickets-actual",ticketDays.length?fmt(ticketCount):"Pendiente");
 put("goal-average-actual",average===null?"Pendiente":money(average));
 put("goal-sales-remaining",target&&observedDates.length?money(Math.max(0,targetSales-amount)):"—");
 put("goal-tickets-remaining",target&&ticketDays.length?fmt(Math.max(0,targetTickets-ticketCount)):"—");
 put("goal-average-gap",target&&average!==null?money(targetAvg-average):"—");
 put("goal-sales-progress",target&&observedDates.length?Math.round(salesPct)+"%":"—");
 put("goal-tickets-progress",target&&ticketDays.length?Math.round(ticketsPct)+"%":"—");
 $("goal-sales-bar").style.width=(target&&observedDates.length?Math.min(100,salesPct):0)+"%";
 $("goal-tickets-bar").style.width=(target&&ticketDays.length?Math.min(100,ticketsPct):0)+"%";
 put("goal-coverage",observedDates.length+" de "+dates.length+" días hábiles con corte; "+ticketDays.length+" con tickets. Los pendientes NO equivalen a ventas cero.");
 const previous=new Date(firstDay+"T12:00:00Z");previous.setUTCMonth(previous.getUTCMonth()-1);
 const prevFirst=previous.toISOString().slice(0,10);const prevNext=firstDay;
 const prevResponse=await fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte."+prevFirst+"&sale_date=lt."+prevNext,{headers,cache:"no-store"});
 if(!prevResponse.ok)throw Error("No se pudieron consultar las ventas históricas.");
 const prevRows=await prevResponse.json();
 const priorAll=prevRows.reduce((a,r)=>a+Number(r.amount),0);
 const cutDay=Number(monthNow.slice(-2));
 const priorComparable=prevRows.filter(r=>!current||Number(r.sale_date.slice(-2))<=cutDay);
 const priorValue=priorComparable.reduce((a,r)=>a+Number(r.amount),0);
 const isPriorComplete=prevRows.length>0;
 const comparable=current?priorValue:priorAll;
 put("goal-previous-value",isPriorComplete?money(comparable):"Sin histórico");
 put("goal-previous-label",current?"Mes anterior, hasta el día "+cutDay:"Mes anterior completo");
 put("goal-comparison",isPriorComplete&&observedDates.length&&comparable>0?((amount/comparable-1)*100).toFixed(1)+"% frente al periodo de referencia":"Comparación pendiente");
 const completeCurrent=missingSales.length===0&&observedDates.length>=3;
 const workdaysInMonth=(()=>{let n=0;for(let i=1;i<=Number(new Date(Date.UTC(Number(firstDay.slice(0,4)),Number(firstDay.slice(5,7)),0)).getUTCDate());i++){const day=new Date(Date.UTC(Number(firstDay.slice(0,4)),Number(firstDay.slice(5,7))-1,i)).getUTCDay();if(day!==0&&day!==6)n++;}return n;})();
 const forecast=current&&completeCurrent?amount/observedDates.length*workdaysInMonth:null;
 put("goal-forecast",forecast!==null?money(forecast):current?"Pendiente":future?"Mes futuro":"Mes histórico");
 put("goal-forecast-note",forecast!==null?"Proyección: promedio por día hábil × "+workdaysInMonth+" días hábiles. No es una venta confirmada.":current?"Se requieren por lo menos 3 días hábiles con cortes completos para pronosticar.":future?"El periodo todavía no inicia.":"Las proyecciones se reservan para el mes en curso.");
 const goalNarrative=!target?"No hay objetivos definidos para este mes.":future?"Mes futuro: solo objetivos, sin ventas observadas.":!observedDates.length?"Todavía no hay cortes del TPV para este mes. No se interpreta como venta de $0.":missingSales.length?"Hay "+missingSales.length+" días hábiles sin corte: avance parcial de "+money(amount)+" y pronóstico suspendido.":("Ventas registradas: "+money(amount)+" ("+Math.round(salesPct)+"% de meta). "+(forecast!==null?(forecast>=targetSales?"La proyección alcanza la meta.":"La proyección queda por debajo de la meta."):""));
 put("goal-summary",goalNarrative+(missingTickets.length?" Faltan tickets en "+missingTickets.length+" día(s).":""));
}


async function renderTrendComparisons(token,firstDay,monthEnd,dates,salesByDate,ticketByDate){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const displayMonth=d=>new Date(d+"T12:00:00Z").toLocaleDateString("es-MX",{month:"short",year:"numeric",timeZone:"UTC"});
 const allDays=dates;
 // Weeks are Monday-Sunday, but sum only actual TPV cuts; never impute missing cuts as zero.
 const weeks=new Map();
 for(const day of allDays){
  const dt=new Date(day+"T12:00:00Z");
  const mon=new Date(dt.getTime()-((dt.getUTCDay()+6)%7)*86400000).toISOString().slice(0,10);
  if(!weeks.has(mon))weeks.set(mon,{start:mon,sum:0,observed:0,expected:0});
  const w=weeks.get(mon);w.expected++;
  if(salesByDate.has(day)){w.observed++;w.sum+=Number(salesByDate.get(day));}
 }
 const weekly=[...weeks.values()];
 const maxWeekly=Math.max(1,...weekly.map(w=>w.sum));
 $("weekly-sales").innerHTML=weekly.map((w,i)=>'<div class="weekly-line"><div><strong>Semana '+(i+1)+'</strong><span class="small">'+escape(w.start)+' · '+w.observed+'/'+w.expected+' días</span></div><div class="trend-track"><div class="trend-fill" style="width:'+(100*w.sum/maxWeekly).toFixed(1)+'%"></div></div><strong>'+ (w.observed?money(w.sum):'Sin cortes') +'</strong></div>').join("")||'<p class="small">No hay días de operación para graficar.</p>';
 $("weekly-explain").textContent=weekly.some(w=>w.observed<w.expected)?"Las semanas con cortes faltantes son parciales; las barras no representan un cierre semanal completo.":"Las semanas muestran sus cortes diarios registrados.";

 const current=new Date(firstDay+"T12:00:00Z");
 current.setUTCMonth(current.getUTCMonth()-5);
 const windowStart=current.toISOString().slice(0,10);
 const res=await fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte."+windowStart+"&sale_date=lt."+monthEnd+"&order=sale_date.asc",{headers,cache:"no-store"});
 if(!res.ok)throw Error("No se pudo consultar el histórico mensual de ventas.");
 const history=await res.json();
 const byMonth=new Map();
 for(let d=new Date(windowStart+"T12:00:00Z");d<new Date(monthEnd+"T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+1)){
  byMonth.set(d.toISOString().slice(0,7),{amount:0,days:0});
 }
 for(const r of history){const m=r.sale_date.slice(0,7);if(byMonth.has(m)){const z=byMonth.get(m);z.amount+=Number(r.amount);z.days++;}}
 const months=[...byMonth.entries()];
 const maxMonthly=Math.max(1,...months.map(([,v])=>v.amount));
 $("month-comparison-bars").innerHTML=months.map(([m,v])=>{
  const label=displayMonth(m+"-01");
  return '<div class="month-column"><div class="month-bar-wrap"><div class="month-bar" style="height:'+(v.days?Math.max(4,100*v.amount/maxMonthly):0).toFixed(1)+'%" title="'+escape(label+': '+money(v.amount))+'"></div></div><strong>'+ (v.days?money(v.amount):"S/D") +'</strong><span>'+escape(label)+'</span><small>'+v.days+' cortes</small></div>';
 }).join("");
 $("month-comparison-note").textContent="Comparativo por mes calendario, sin sumar órdenes digitales. S/D significa sin cortes registrados; el mes en curso puede estar incompleto.";

 const points=allDays.filter(d=>salesByDate.has(d)&&ticketByDate.has(d)&&Number(ticketByDate.get(d))>0).map(d=>({d,avg:salesByDate.get(d)/ticketByDate.get(d)}));
 $("ticket-trend-count").textContent=points.length+" días comparables";
 if(!points.length){$("ticket-trend").innerHTML='<p class="small">Faltan cortes de venta y tickets positivos del mismo día. No se dibujan valores artificiales.</p>';return;}
 if(points.length<=3){
  const max=Math.max(100,...points.map(p=>p.avg));
  $("ticket-trend").innerHTML='<div class="ticket-compact">'+points.map(p=>'<div class="ticket-compact-item"><div class="ticket-compact-meta"><strong>\uD83D\uDCC5 Día '+Number(p.d.slice(-2))+'</strong><strong>'+money(p.avg)+'</strong></div><div class="ticket-compact-track"><div class="ticket-compact-fill" style="width:'+(100*p.avg/max).toFixed(1)+'%"></div></div></div>').join('')+'</div>';
  return;
 }
 const maxAvg=Math.max(100,...points.map(p=>p.avg))*1.15,w=Math.max(560,points.length*58+70),height=175,left=52,bottom=32,top=15,usable=height-bottom-top;
 const cx=i=>left+(w-left-22)*(points.length===1?.5:i/(points.length-1));
 const cy=v=>top+usable*(1-v/maxAvg);
 const path=points.map((p,i)=>(i?"L":"M")+cx(i).toFixed(1)+","+cy(p.avg).toFixed(1)).join(" ");
 const dots=points.map((p,i)=>'<circle cx="'+cx(i)+'" cy="'+cy(p.avg)+'" r="5" fill="#087650"><title>'+escape(p.d+": "+money(p.avg)+" por ticket")+'</title></circle><text x="'+cx(i)+'" y="'+(height-11)+'" text-anchor="middle" font-size="11" fill="#5c7465">'+Number(p.d.slice(-2))+'</text>').join("");
 $("ticket-trend").innerHTML='<svg viewBox="0 0 '+w+' '+height+'" style="min-width:'+w+'px;width:100%;height:auto" role="img" aria-label="Ticket promedio por fecha con corte y tickets registrados"><line x1="'+left+'" y1="'+(height-bottom)+'" x2="'+(w-10)+'" y2="'+(height-bottom)+'" stroke="#c9d9ce"/><text x="5" y="'+(top+8)+'" font-size="12" fill="#5c7465">'+escape(money(maxAvg))+'</text><path d="'+path+'" fill="none" stroke="#087650" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}


async function renderKitchenRetail(token,firstDay){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const [salesRes,classRes]=await Promise.all([
  fetch(BASE+"/rest/v1/fiiller_tpv_product_monthly?select=product_code,product_name,net_units,net_amount&sale_month=eq."+firstDay+"&limit=1000",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/fiiller_tpv_product_classification?select=product_code,product_type,classification_rule&limit=1000",{headers,cache:"no-store"})
 ]);
 if(!salesRes.ok||!classRes.ok)throw Error("No se pudo consultar la clasificación de productos TPV.");
 const items=await salesRes.json(),mapping=new Map((await classRes.json()).map(c=>[c.product_code,c]));
 const groups={cocina:{amount:0,qty:0,count:0,items:[]},retail:{amount:0,qty:0,count:0,items:[]},pendiente:{amount:0,qty:0,count:0,items:[]}};
 items.forEach(p=>{
  const type=mapping.get(p.product_code)?.product_type||"pendiente";
  const g=groups[type]||groups.pendiente;
  g.amount+=Number(p.net_amount);g.qty+=Number(p.net_units);g.count++;g.items.push(p);
 });
 const total=Object.values(groups).reduce((a,g)=>a+g.amount,0);
 const pct=value=>total>0?(value/total*100).toFixed(1)+"%":"—";
 $("kr-period").textContent=new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
 for(const type of ["cocina","retail","pendiente"]){
  const g=groups[type];
  $("kr-"+type+"-amount").textContent=items.length?money(g.amount):"S/D";
  $("kr-"+type+"-qty").textContent=items.length?fmt(g.qty)+" unidades · "+g.count+" códigos":"Sin detalle";
  $("kr-"+type+"-pct").textContent=pct(g.amount);
 }
 $("kr-combined-bar").innerHTML=total>0?["cocina","retail","pendiente"].map(type=>'<div class="kr-segment kr-'+type+'" style="width:'+(groups[type].amount/total*100)+'%" title="'+escape(type+": "+money(groups[type].amount))+'"></div>').join(""):"";
 function ranking(type){
  const records=groups[type].items.filter(p=>Number(p.net_amount)>0).sort((a,b)=>Number(b.net_amount)-Number(a.net_amount)).slice(0,5);
  const max=Math.max(1,...records.map(r=>Number(r.net_amount)));
  $("kr-"+type+"-leaders").innerHTML=records.map((p,i)=>'<div class="kr-leader"><span class="kr-rank">'+(i+1)+'</span><div class="kr-name">'+escape(p.product_name)+'<small>'+fmt(p.net_units)+' uds. · '+escape(p.product_code)+'</small><div class="kr-mini-track"><div class="kr-mini-fill" style="width:'+(Number(p.net_amount)/max*100).toFixed(1)+'%"></div></div></div><strong>'+money(p.net_amount)+'</strong></div>').join("")||'<p class="small">Sin productos de esta categoría en el mes elegido.</p>';
 }
 ranking("cocina");ranking("retail");
 const pending=groups.pendiente.items;
 $("kr-review").textContent=pending.length?"Por revisar: "+pending.map(p=>p.product_name+" ("+p.product_code+")").join("; ")+". No se asignan a cocina o retail hasta validarlos.":"Todos los productos de este periodo están clasificados.";
 $("kr-note").textContent=items.length?"Cifras netas por artículo del TPV Arrow. Cocina incluye bebidas preparadas y extras. No se agregan pedidos de la app ni se interpreta este desglose como utilidad.":"Aún no hay detalle de productos del TPV para este mes; S/D no equivale a $0 de ventas.";
}


async function renderExecutiveSummary(token,firstDay,dates,salesByDate,ticketByDate,monthNow){
 const headers={apikey:KEY,Authorization:"Bearer "+token},selected=firstDay.slice(0,7),current=monthNow.slice(0,7);
 const prev=new Date(firstDay+"T12:00:00Z");prev.setUTCMonth(prev.getUTCMonth()-1);
 const prevStart=prev.toISOString().slice(0,10);
 const [targetsResponse,prevResponse,productsResponse,classesResponse]=await Promise.all([
  fetch(BASE+"/rest/v1/fiiller_monthly_targets?select=effective_month,sales_target,tickets_target,avg_ticket_target&effective_month=lte."+firstDay+"&order=effective_month.desc&limit=1",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte."+prevStart+"&sale_date=lt."+firstDay,{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/fiiller_tpv_product_monthly?select=product_code,product_name,net_units,net_amount&sale_month=eq."+firstDay+"&limit=1000",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/fiiller_tpv_product_classification?select=product_code,product_type&limit=1000",{headers,cache:"no-store"})
 ]);
 if([targetsResponse,prevResponse,productsResponse,classesResponse].some(r=>!r.ok))throw Error("No se pudieron preparar los indicadores ejecutivos.");
 const [targetRows,prevRows,products,classes]=await Promise.all([targetsResponse.json(),prevResponse.json(),productsResponse.json(),classesResponse.json()]);
 const goal=targetRows[0]||null;
 const known=dates.filter(d=>salesByDate.has(d)),unknown=dates.filter(d=>!salesByDate.has(d));
 const ticketDates=dates.filter(d=>ticketByDate.has(d)),missingTickets=dates.filter(d=>!ticketByDate.has(d));
 const sales=known.reduce((a,d)=>a+salesByDate.get(d),0);
 const comparable=dates.filter(d=>ticketByDate.get(d)>0&&salesByDate.has(d));
 const ticketTotal=comparable.reduce((a,d)=>a+ticketByDate.get(d),0);
 const ticketAverage=ticketTotal?comparable.reduce((a,d)=>a+salesByDate.get(d),0)/ticketTotal:null;
 const result=[],action=[],risks=[];
 const add=(arr,subject,content)=>arr.push({subject,content});
 if(!known.length){
   add(result,"Sin cortes","No hay ventas TPV confirmadas para el periodo seleccionado; no equivale a cero ventas.");
   add(action,"Registrar cierres","Importar los cortes del TPV para activar comparaciones y recomendaciones basadas en ventas.");
 } else {
   add(result,"Ventas netas",money(sales)+" registradas en "+known.length+" días con corte del periodo.");
   if(goal){
    const pct=100*sales/Number(goal.sales_target);
    add(result,"Meta mensual",pct.toFixed(1)+"% del objetivo de "+money(goal.sales_target)+", con "+money(Math.max(0,Number(goal.sales_target)-sales))+" por alcanzar.");
   }
 }
 if(unknown.length) add(risks,"Cortes pendientes",unknown.length+" día(s) hábiles sin corte. Evitar interpretar el total parcial como cierre del periodo.");
 if(missingTickets.length) add(risks,"Tickets incompletos",missingTickets.length+" día(s) hábiles sin tickets registrados; el promedio sólo contempla días comparables.");
 if(ticketAverage!==null && goal){
  const difference=ticketAverage-Number(goal.avg_ticket_target);
  add(result,"Ticket promedio comparable",money(ticketAverage)+" en "+comparable.length+" día(s) con venta y tickets capturados.");
  if(difference<0)add(action,"Mejorar venta por ticket","Brecha de "+money(-difference)+" frente a la meta. Probar recomendaciones de complementos y medir su efecto.");
  else add(result,"Objetivo por ticket","El ticket promedio comparable alcanza o supera la meta por "+money(difference)+".");
 }
 const prior=prevRows.reduce((a,r)=>a+Number(r.amount),0);
 if(known.length && prior>0){
   const priorComparable=selected===current?prevRows.filter(r=>Number(r.sale_date.slice(-2))<=Number(monthNow.slice(-2))).reduce((a,r)=>a+Number(r.amount),0):prior;
   if(priorComparable>0)add(result,"Referencia anterior",money(priorComparable)+" en el "+(selected===current?"mismo tramo calendario del":"total registrado del")+" mes anterior. No constituye una comparación completa si faltan cortes.");
 }
 const map=new Map(classes.map(c=>[c.product_code,c.product_type]));
 const typed={cocina:0,retail:0,pendiente:0};
 for(const p of products)typed[map.get(p.product_code)||"pendiente"]+=Number(p.net_amount);
 if(products.length){
  const winner=products.filter(p=>Number(p.net_units)>0).sort((a,b)=>Number(b.net_amount)-Number(a.net_amount))[0];
  if(winner)add(result,"Producto líder",winner.product_name+" aporta "+money(winner.net_amount)+" ("+Number(winner.net_units)+" unidades netas).");
  if(typed.cocina+typed.retail+typed.pendiente>0){
   add(result,"Participación por área","Cocina "+(typed.cocina/(typed.cocina+typed.retail+typed.pendiente)*100).toFixed(1)+"%; retail "+(typed.retail/(typed.cocina+typed.retail+typed.pendiente)*100).toFixed(1)+"% de ingresos netos.");
   if(typed.retail>0)add(action,"Impulsar complementos","Probar venta cruzada con artículos retail junto a los productos preparados más solicitados; aún no contamos con márgenes para confirmar rentabilidad.");
   if(typed.pendiente>0)add(risks,"Clasificación incompleta",money(typed.pendiente)+" de artículos no asignados a cocina ni retail.");
  }
 }else if(known.length){
  add(risks,"Sin detalle por producto","Hay cortes de ventas, pero falta el archivo de artículos del periodo. No se deduce el mix de producto.");
 }
 if(selected>current)add(risks,"Periodo futuro","No se emite diagnóstico de ventas futuras.");
 if(!risks.length)add(risks,"Sin alertas de integridad","No se detectaron faltantes en las fuentes revisadas para este periodo; esto no sustituye el cierre de caja.");
 const draw=(id,items)=>{$(id).innerHTML=items.map(it=>'<div class="executive-line"><strong>'+escape(it.subject)+'</strong><p>'+escape(it.content)+'</p></div>').join("");};
 draw("executive-results",result);draw("executive-actions",action.length?action:[{subject:"Seguimiento",content:"Mantener los cortes y tickets diarios actualizados antes de definir acciones comerciales adicionales."}]);draw("executive-risks",risks);
 $("executive-period").textContent=new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
 $("executive-source").textContent="Lectura automática basada en TPV, tickets capturados, metas y productos del mes elegido. No es una predicción de IA ni un cierre bancario.";
}


async function renderCostAndInventory(token,firstDay){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const [salesRes,costRes,invRes]=await Promise.all([
  fetch(BASE+"/rest/v1/fiiller_tpv_product_monthly?select=product_code,product_name,net_units,net_amount&sale_month=eq."+firstDay+"&limit=1000",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/fiiller_tpv_product_costs?select=product_code,cost_per_unit,cost_source,verified_at&limit=1000",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/filler_inventory_items?select=code,name,quantity,min_quantity,unit,unit_cost,expiration_date&limit=1000",{headers,cache:"no-store"})
 ]);
 if(!salesRes.ok||!costRes.ok||!invRes.ok)throw Error("No fue posible consultar costos o existencias con permisos de administrador.");
 const products=await salesRes.json(),costs=await costRes.json(),inventory=await invRes.json();
 const byCost=new Map(costs.filter(c=>c.cost_per_unit!==null&&c.cost_source&&c.verified_at).map(c=>[c.product_code,Number(c.cost_per_unit)]));
 const sold=products.filter(p=>Number(p.net_units)>0);
 const priced=sold.filter(p=>byCost.has(p.product_code));
 const verifiedRevenue=priced.reduce((sum,p)=>sum+Number(p.net_amount),0);
 const verifiedCosts=priced.reduce((sum,p)=>sum+Number(p.net_units)*byCost.get(p.product_code),0);
 const totalRevenue=products.reduce((sum,p)=>sum+Number(p.net_amount),0);
 $("cost-covered").textContent=priced.length+" de "+sold.length+" códigos con venta neta";
 $("cost-coverage-pct").textContent=sold.length?(100*priced.length/sold.length).toFixed(1)+"%":"—";
 $("cost-verified-revenue").textContent=priced.length?money(verifiedRevenue):"Pendiente";
 $("cost-verified-margin").textContent=priced.length?money(verifiedRevenue-verifiedCosts):"No calculable";
 $("cost-margin-note").textContent=priced.length?"Margen bruto parcial únicamente de "+priced.length+" productos con costo comprobado. No representa la utilidad total ni incluye gastos operativos.":"Todavía no hay costos unitarios de productos TPV verificados; no se atribuye utilidad a los "+money(totalRevenue)+" de venta neta del periodo.";
 const withUnitCost=inventory.filter(x=>Number(x.unit_cost)>0).length;
 const lows=inventory.filter(x=>x.min_quantity!==null&&Number(x.quantity)<=Number(x.min_quantity));
 const expired=inventory.filter(x=>x.expiration_date&&x.expiration_date<new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
 $("inv-cost-coverage").textContent=withUnitCost+" de "+inventory.length+" insumos con costo positivo";
 $("inv-low-count").textContent=String(lows.length);
 $("inv-expired-count").textContent=String(expired.length);
 const greatest=lows.sort((a,b)=>(Number(b.min_quantity)-Number(b.quantity))-(Number(a.min_quantity)-Number(a.quantity))).slice(0,8);
 $("inv-low-list").innerHTML=greatest.map(x=>'<div class="cost-alert"><strong>'+escape(x.name)+'</strong><span>'+escape(x.code||"Sin código")+' · '+fmt(x.quantity)+' '+escape(x.unit||"")+" disponibles / mínimo "+fmt(x.min_quantity)+'</span></div>').join("")||'<p class="small">No se detectaron insumos en mínimo o por debajo de él.</p>';
 $("cost-pending-products").innerHTML=sold.filter(p=>!byCost.has(p.product_code)).sort((a,b)=>Number(b.net_amount)-Number(a.net_amount)).slice(0,7).map(p=>'<div class="cost-alert"><strong>'+escape(p.product_name)+'</strong><span>'+escape(p.product_code)+" · "+money(p.net_amount)+" vendido · falta costo unitario verificado</span></div>").join("")||'<p class="small">Todos los productos vendidos de este mes tienen costo verificado.</p>';
 $("inventory-scope-note").textContent="Inventario físico actual, no histórico de "+firstDay.slice(0,7)+". No se descuenta automáticamente por ventas TPV sin recetas y equivalencias comprobadas.";
}


async function renderRecipeCosting(token){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const [rr,lr,ir]=await Promise.all([
  fetch(BASE+"/rest/v1/fiiller_recipe_costing?select=recipe_id,recipe_name,recipe_type,tpv_code,yield_quantity,yield_unit,yield_verified,operational_overhead_pct&status=eq.confirmed&order=recipe_id.asc",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/fiiller_recipe_costing_lines?select=recipe_id,line_number,ingredient_name,required_quantity,required_unit,subrecipe_id,candidate_inventory_code,mapping_status,conversion_status,quantity_per_inventory_unit&order=recipe_id.asc,line_number.asc",{headers,cache:"no-store"}),
  fetch(BASE+"/rest/v1/filler_inventory_items?select=code,name,unit_cost,unit_cost_source,unit_cost_verified_at&limit=1000",{headers,cache:"no-store"})
 ]);
 if(!rr.ok||!lr.ok||!ir.ok)throw Error("No fue posible cargar los vínculos de recetas e insumos.");
 const recipes=await rr.json(),allLines=await lr.json(),stock=await ir.json();
 const activeIds=new Set(recipes.map(r=>r.recipe_id));
 const lines=allLines.filter(l=>activeIds.has(l.recipe_id));
 const byStock=new Map(stock.map(x=>[x.code,x])),byRecipe=new Map(recipes.map(x=>[x.recipe_id,x]));
 const fmtAmount=value=>Number(value).toLocaleString("es-MX",{maximumFractionDigits:2});
 const costCache=new Map();
 function compute(id,stack=new Set()){
  if(costCache.has(id))return costCache.get(id);
  const recipe=byRecipe.get(id),detail=lines.filter(x=>x.recipe_id===id);
  if(!recipe||!detail.length||stack.has(id))return null;
  const next=new Set(stack);next.add(id);
  if(recipe.recipe_type==="subrecipe"&&!recipe.yield_verified)return null;
  let sum=0;
  for(const l of detail){
   if(l.subrecipe_id){
    const sub=byRecipe.get(l.subrecipe_id),subcost=compute(l.subrecipe_id,next);
    if(subcost===null||!sub||l.required_unit!==sub.yield_unit)return null;
    sum+=(Number(l.required_quantity)/Number(sub.yield_quantity))*subcost;
   }else{
    const item=byStock.get(l.candidate_inventory_code);
    if(l.mapping_status!=="verified"||l.conversion_status!=="verified"||!item||l.quantity_per_inventory_unit===null||Number(l.quantity_per_inventory_unit)<=0||!(Number(item.unit_cost)>0)||!item.unit_cost_source||!item.unit_cost_verified_at)return null;
    sum+=(Number(l.required_quantity)/Number(l.quantity_per_inventory_unit))*Number(item.unit_cost);
   }
  }
  costCache.set(id,sum);return sum;
 }
 const withCost=recipes.filter(r=>compute(r.recipe_id)!==null);
 $("recipe-coverage").textContent=withCost.length+" de "+recipes.length+" recetas con costo completamente verificable";
 $("recipe-links-count").textContent=lines.filter(l=>l.mapping_status==="verified").length+" de "+lines.filter(l=>!l.subrecipe_id).length+" ingredientes vinculados y validados";
 $("recipe-rows").innerHTML=recipes.map(r=>{
  const detail=lines.filter(l=>l.recipe_id===r.recipe_id),verified=detail.filter(l=>l.mapping_status==="verified").length,proposed=detail.filter(l=>l.mapping_status==="candidate").length;
  const cost=compute(r.recipe_id);
  const perUnit=cost===null?null:cost/Number(r.yield_quantity), overhead=r.recipe_type==="sale"?Number(r.operational_overhead_pct||0)/100:0;
  const label=perUnit===null?"Costo de ingredientes pendiente · Recargo operativo "+(overhead*100).toFixed(0)+"% configurado (sin calcular)": "Ingredientes: "+money(perUnit)+" · Operación CEDIS OCS ("+(overhead*100).toFixed(0)+"%): "+money(perUnit*overhead)+" · Costo completo por "+escape(r.yield_unit)+": "+money(perUnit*(1+overhead));
  const yieldStatus=r.recipe_type==="subrecipe"&&!r.yield_verified?" · Rendimiento físico pendiente":"";
  return '<div class="cost-alert"><strong>'+escape(r.recipe_id+" · "+r.recipe_name)+'</strong><span>'+detail.length+' componentes · '+verified+' SKU confirmados · '+proposed+' propuestas'+yieldStatus+'</span><span>'+label+'</span></div>';
 }).join("")||'<p class="small">No hay recetas registradas para este costeo.</p>';
 $("recipe-proposals").innerHTML=lines.filter(l=>l.mapping_status!=="verified").map(l=>{
  const item=byStock.get(l.candidate_inventory_code);
  return '<div class="cost-alert"><strong>'+escape(l.recipe_id+" · "+l.ingredient_name)+'</strong><span>'+fmtAmount(l.required_quantity)+" "+escape(l.required_unit)+(item?" · SKU sugerido "+escape(item.code)+" ("+escape(item.name)+")":" · Falta identificar SKU")+(l.subrecipe_id?" · Subreceta "+escape(l.subrecipe_id):"")+'</span></div>';
 }).join("")||'<p class="small">Todos los ingredientes vinculados.</p>';
 $("recipe-caution").textContent="El 25% de operación de CEDIS OCS es un recargo interno sobre el costo de ingredientes, NO un margen de utilidad. Se aplica una sola vez al producto final; subrecetas no lo duplican. Los códigos propuestos NO se descuentan del almacén. El costo queda pendiente hasta validar el SKU, la equivalencia de unidades, el costo de compra y, cuando aplique, el rendimiento real del lote. Las recetas inactivas no aparecen en el panel ni se contabilizan en los pendientes.";
}



let flyChatContext=null;
function flyChatAdd(message,author){
 const node=document.createElement("div");
 node.className="fly-bubble "+(author==="user"?"fly-user":"fly-bot");
 node.textContent=String(message).slice(0,2400);
 $("fly-chat").appendChild(node);
 while($("fly-chat").children.length>14)$("fly-chat").removeChild($("fly-chat").firstChild);
 $("fly-chat").scrollTop=$("fly-chat").scrollHeight;
}
function flyChatAnswer(question){
 const d=flyChatContext;
 if(!d)return "El reporte todavía está cargando. Comprueba que iniciaste sesión como administrador y actualiza los indicadores.";
 const q=String(question).toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const period=d.period;
 if(/recet|cost|margen|cedis|utilidad|ingrediente/.test(q))
  return "Recetas: REC-045 tiene 6 ingredientes y sus equivalencias verificadas. El costo por porción sigue pendiente porque no hay precios de compra comprobados. El cargo operativo de CEDIS OCS es 25% sobre el costo de ingredientes, no utilidad. No mostraré precios internos ni estimaré márgenes. Revisa «Validar recetas y costos» en el menú.";
 if(/invent|almacen|stock|reponer|compra|insumo|caduc/.test(q))
  return "Inventario actual: "+(Number.isFinite(d.low)?fmt(d.low)+" insumos en su mínimo o por debajo":"sin lectura disponible")+". Esta cifra no es histórica del mes "+period+". Acción recomendada: comprobar existencias, caducidades y prioridades antes de solicitar reposición a CEDIS.";
 if(/ticket|promedio|venta por|complemento/.test(q))
  return d.avg===null?"Ticket promedio "+period+": no calculable porque faltan ventas y tickets comparables del mismo día.":
   "Ticket promedio "+period+": "+money(d.avg)+" en "+d.comparable+" días comparables"+(d.avgGoal!==null?", frente a la meta de "+money(d.avgGoal)+(d.avg<d.avgGoal?" (brecha "+money(d.avgGoal-d.avg)+").":" (objetivo alcanzado)."):" (sin meta configurada).")+". No mezcla pedidos digitales con TPV.";
 if(/corte|falt|pendient|registro|calidad|quality|anomali/.test(q))
  return "Calidad de datos "+period+": "+d.missingCuts+" días hábiles sin corte confirmado y "+d.missingTickets+" días sin tickets capturados. Ninguno se considera venta $0. Fly Quality debe comprobar el origen antes de validar un cierre.";
 if(/meta|venta|ingreso|factur|avance|objetivo|recaud/.test(q))
  return "Ventas oficiales TPV Arrow "+period+": "+(d.cutDays?money(d.sales)+" de "+d.cutDays+" días con corte":"sin cortes confirmados")+(d.salesGoal!==null?"; meta "+money(d.salesGoal)+", avance "+(100*d.sales/d.salesGoal).toFixed(1)+"%.":"; meta no configurada.")+" Hay "+d.missingCuts+" día(s) hábiles sin corte. Los pedidos de la app se mantienen separados para evitar duplicaciones.";
 if(/prior|recomend|accion|hacer|fly|resumen|reporte|operac/.test(q))
  return "Prioridades para "+period+": "+d.priorities.join("; ")+". Para revisión supervisada usa «Copiar reporte para Compás Fly» y regístralo en Compás Eco. Esta conversación no envía datos a los agentes ni ejecuta acciones.";
 return "Puedo consultar ventas, metas, tickets, cortes pendientes, inventario, recetas y prioridades del mes "+period+". Prueba una de las preguntas rápidas. Para análisis libre con IA, primero se necesita un endpoint autorizado de Compás Evolution.";
}
let flyLastAnswer="";
let flyBusy=false;
const FLY_ENDPOINT="https://eco.proyectocompas.app/api/evolution/fly-ops/fiiller-chat";
async function flyChatAsk(question) {
 if(!$("dashboard")||$("dashboard").hidden||flyBusy)return;
 const selected=$("fly-agent-selector").value;
 const useAI=$("fly-ai-enabled").checked;
 flyChatAdd(question,"user");
 if(!useAI){
  const answer=flyChatAnswer(question);
  flyLastAnswer=answer;
  flyChatAdd(answer+"\n\nModo: análisis local por reglas.","bot");
  $("fly-copy-answer").disabled=false;
  return;
 }
 if(!flyOpsReportText){
  flyChatAdd("Primero actualiza los indicadores para generar el contexto real del reporte.","bot");
  return;
 }
 flyBusy=true;
 $("fly-chat-send").disabled=true;
 $("fly-generate-report").disabled=true;
 $("fly-ai-status").textContent="Consultando al agente supervisado de Compás Evolution…";
 try{
  let jwt=await FillerCloud.accessToken();
  if(!jwt)throw Error("Tu sesión expiró. Inicia sesión nuevamente como administrador de Fiiller.");
  const requestBody=JSON.stringify({agent:selected,question,report:flyOpsReportText});
  const send=access=>fetch(FLY_ENDPOINT,{
    method:"POST",cache:"no-store",signal:AbortSignal.timeout(24000),
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+access},
    body:requestBody
  });
  let res=await send(jwt);
  if(res.status===401){
    jwt=await FillerCloud.accessToken({forceRefresh:true});
    if(!jwt)throw Error("Tu sesión caducó y no pudo renovarse. Vuelve a iniciar sesión como administrador.");
    res=await send(jwt);
  }
  const payload=await res.json().catch(()=>({}));
  if(!res.ok){
    if(res.status===401||res.status===403)throw Error("No tienes una sesión administrativa válida. Vuelve a iniciar sesión.");
    if(res.status===429)throw Error("Se alcanzó el límite diario de consultas. Puedes usar el análisis local por reglas.");
    if(res.status>=500)throw Error("Compás Fly no está disponible temporalmente; los KPIs locales siguen accesibles.");
    throw Error(payload.error||"El agente rechazó la consulta ("+res.status+").");
  }
  if(!payload.saved||!payload.answer)throw Error("La respuesta no fue registrada en el historial de auditoría.");
  flyLastAnswer=payload.answer;
  flyChatAdd(payload.answer+"\n\n"+(selected==="fly_quality"?"Fly Quality":"Fly Delivery")+" · IA supervisada · Historial registrado.","bot");
  $("fly-copy-answer").disabled=false;
  $("fly-ai-status").textContent="Respuesta guardada en Compás Evolution · Sin acciones ejecutadas.";
 }catch(err){
  const message=err?.name==="TimeoutError"||err?.name==="AbortError"?"La IA superó el tiempo de respuesta. Intenta de nuevo; no se han realizado cambios.":String(err?.message||err);
  flyChatAdd("No fue posible consultar la IA: "+message+" Puedes desactivar «Usar IA supervisada» para consultar los datos locales.","bot");
  $("fly-ai-status").textContent="Servicio IA no disponible; el dashboard y las reglas locales siguen funcionando.";
 }finally{
  flyBusy=false;
  $("fly-chat-send").disabled=false;
  $("fly-generate-report").disabled=!flyOpsReportText;
 }
}

let flyOpsReportText="";
async function renderFlySemaforo(token,firstDay,dates,salesByDate,ticketByDate,inventory){
 const headers={apikey:KEY,Authorization:"Bearer "+token};
 const res=await fetch(BASE+"/rest/v1/fiiller_monthly_targets?select=avg_ticket_target,sales_target&effective_month=lte."+firstDay+"&order=effective_month.desc&limit=1",{headers,cache:"no-store"});
 const targetsAvailable=res.ok;
 const target=targetsAvailable?(await res.json())[0]:null;
 const cuts=dates.filter(d=>salesByDate.has(d));
 const missing=dates.length-cuts.length;
 const missingTickets=dates.filter(d=>!ticketByDate.has(d)).length;
 const pairs=dates.filter(d=>salesByDate.has(d)&&Number(ticketByDate.get(d))>0);
 const tickets=pairs.reduce((n,d)=>n+Number(ticketByDate.get(d)),0);
 const average=tickets?pairs.reduce((n,d)=>n+Number(salesByDate.get(d)),0)/tickets:null;
 const results=[];
 const add=(title,state,detail,note)=>results.push({title,state,detail,note});
 add("Cortes y tickets",missing||missingTickets?"warn":dates.length?"good":"unknown",missing+" días sin corte · "+missingTickets+" días sin tickets","Los registros ausentes no representan ventas cero.");
 if(average===null||!target||!Number(target.avg_ticket_target))add("Ticket promedio","unknown","Sin comparación","Faltan datos comparables o meta.");
 else {
  const ratio=average/Number(target.avg_ticket_target);
  add("Ticket promedio",ratio>=1?"good":ratio>=.9?"warn":"bad",money(average)+" / "+money(target.avg_ticket_target),ratio>=1?"Objetivo alcanzado.":"Revisar venta de complementos.");
 }
 if(!target||!Number(target.sales_target)||!cuts.length)add("Meta de ventas","unknown","Sin avance suficiente","Necesita cortes y meta.");
 else {
  const sum=cuts.reduce((n,d)=>n+Number(salesByDate.get(d)),0);
  const pct=100*sum/Number(target.sales_target);
  const year=Number(firstDay.slice(0,4)),month=Number(firstDay.slice(5,7));
  const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
  let planned=0;
  for(let i=1;i<=lastDay;i++){const weekday=new Date(Date.UTC(year,month-1,i)).getUTCDay();if(weekday!==0&&weekday!==6)planned++;}
  const calendarPct=planned?dates.length/planned*100:0;
  const ratio=calendarPct?pct/calendarPct:0;
  const grade=missing?"unknown":ratio>=.95?"good":ratio>=.8?"warn":"bad";
  add("Meta de ventas",grade,pct.toFixed(1)+"% del objetivo",missing?"Faltan cortes; ritmo sin calificar.":ratio>=.95?"Avance acorde al calendario hábil.":"Avance inferior a los días hábiles transcurridos.");
 }
 const low=inventory?.low===null||inventory?.low===undefined?NaN:Number(inventory.low);
 add("Abastecimiento",!Number.isFinite(low)?"unknown":low>0?(low>=20?"bad":"warn"):"good",Number.isFinite(low)?fmt(low)+" insumos en mínimo o por debajo":"Sin dato de inventario","Revisar reposición con el almacén de Fiiller.");
 $("fly-grid").innerHTML=results.map(r=>'<div class="fly-box '+r.state+'"><h3>'+escape(r.title)+'</h3><p>'+escape(r.detail)+'</p><small>'+escape(r.note)+'</small></div>').join("");
 $("fly-period").textContent=new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{month:"long",year:"numeric",timeZone:"UTC"});
 const actionItems=[];
 const task=(priority,owner,title,evidence,action,done)=>actionItems.push({priority,owner,title,evidence,action,done});
 if(missing>0||missingTickets>0)task("Alta","Fly Quality","Completar registros de ventas y tickets",
  missing+" días hábiles sin corte y "+missingTickets+" sin captura de tickets en el periodo.",
  "Revisar los reportes TPV Arrow y cargar solamente los datos confirmados.",
  "Los cortes y tickets de todas las fechas operativas evaluadas están conciliados, sin inventar ceros.");
 if(Number.isFinite(low)&&low>0)task(low>=20?"Alta":"Media","Fly Delivery","Priorizar reposición de inventario",
  fmt(low)+" insumos en mínimo o por debajo según el inventario actual.",
  "Revisar el listado de insumos críticos, caducidades y disponibilidad real con CEDIS OCS.",
  "La revisión humana registra necesidades de compra y confirma las existencias.");
 if(average!==null&&target&&Number(target.avg_ticket_target)>0&&average<Number(target.avg_ticket_target))task("Media","Fly Delivery","Elevar el ticket promedio",
  money(average)+" contra meta "+money(target.avg_ticket_target)+" en "+pairs.length+" días comparables.",
  "Evaluar venta cruzada con complementos y comparar resultados tras nuevos cortes.",
  "El ticket promedio se vuelve a medir con tickets y ventas confirmados del mismo día.");
 if(!target||!Number(target.sales_target))task("Media","Fly Quality","Comprobar metas configuradas",
  targetsAvailable?"No se encontró una meta de ventas aplicable.":"No se pudo consultar la fuente de metas (dato no disponible).",
  "Verificar vigencia y configuración administrativa de metas.",
  "Se confirma una meta activa y documentada para el mes seleccionado.");
 if(!actionItems.length)task("Seguimiento","Fly Quality","Mantener monitoreo preventivo",
  "No se generaron prioridades por las reglas evaluadas.",
  "Revisar integridad de datos e inventario en la próxima actualización.",
  "Los indicadores conservan fuentes completas y verificables.");
 const top=actionItems.slice(0,3);
 flyChatContext={
  period:firstDay.slice(0,7),
  sales:cuts.reduce((n,d)=>n+Number(salesByDate.get(d)),0),
  cutDays:cuts.length,missingCuts:missing,missingTickets,
  avg:average,comparable:pairs.length,
  salesGoal:target&&Number(target.sales_target)>0?Number(target.sales_target):null,
  avgGoal:target&&Number(target.avg_ticket_target)>0?Number(target.avg_ticket_target):null,
  low:Number.isFinite(low)?low:null,
  priorities:top.map(t=>t.title)
 };

 $("fly-action-list").innerHTML='<div class="fly-action-list">'+top.map((t,i)=>'<article class="fly-task"><span class="fly-owner">'+escape(t.owner)+' · '+escape(t.priority)+'</span><h4>'+(i+1)+'. '+escape(t.title)+'</h4><p><strong>Evidencia:</strong> '+escape(t.evidence)+'</p><p><strong>Acción:</strong> '+escape(t.action)+'</p><small><strong>Cierre:</strong> '+escape(t.done)+'</small></article>').join("")+'</div>';
 const period=firstDay.slice(0,7);
 const salesTotal=cuts.reduce((sum,d)=>sum+Number(salesByDate.get(d)),0);
 const monthSalesTarget=target&&Number(target.sales_target)>0?Number(target.sales_target):null;
 const avgTarget=target&&Number(target.avg_ticket_target)>0?Number(target.avg_ticket_target):null;
 const lines=[
  "FIILLER CAFÉ · REPORTE PARA COMPÁS FLY OPS",
  "Periodo de ventas: "+period,
  "Emitido: "+new Date().toISOString(),
  "Fuente: cortes oficiales TPV Arrow y tickets manuales de las mismas fechas; inventario actual separado.",
  "Tipo: reporte operativo de solo lectura basado en registros comprobables. Revisión humana pendiente.",
  "",
  "INDICADORES VERIFICABLES",
  "Ventas TPV Arrow confirmadas: "+money(salesTotal)+" (MXN; "+cuts.length+" fechas con corte).",
  "Tickets Arrow registrados: "+fmt(dates.reduce((sum,d)=>sum+Number(ticketByDate.get(d)||0),0))+" (pueden incluir fechas sin corte de venta).",
  "Ticket promedio comparable: "+(average===null?"NO CALCULABLE":money(average))+" en "+pairs.length+" fechas con venta y tickets válidos del mismo día.",
  "Meta de ventas: "+(monthSalesTarget===null?(targetsAvailable?"NO CONFIGURADA":"FUENTE NO DISPONIBLE"):money(monthSalesTarget))+".",
  "Meta de ticket promedio: "+(avgTarget===null?(targetsAvailable?"NO CONFIGURADA":"FUENTE NO DISPONIBLE"):money(avgTarget))+".",
  "Días hábiles evaluados: "+dates.length+". Días con cortes pendientes: "+missing+". Días sin tickets: "+missingTickets+".",
  "Fechas sin corte confirmado: "+(dates.filter(d=>!salesByDate.has(d)).join(", ")||"ninguna")+".",
  "Fechas sin tickets capturados: "+(dates.filter(d=>!ticketByDate.has(d)).join(", ")||"ninguna")+".",
  "Inventario actual en mínimo o debajo: "+(Number.isFinite(low)?fmt(low)+" insumos":"DATO NO DISPONIBLE")+". No es un saldo histórico del mes.",
  "Pedidos digitales: NO SE SUMAN a ventas TPV y no se presentan como cobros.",
  "Costos y márgenes: NO DETERMINADOS sin facturas y costeo validado.",
  "",
  "SEMÁFORO"
 ];
 results.forEach(r=>lines.push("- "+r.title+" ["+r.state+"]: "+r.detail+". "+r.note));
 lines.push("","PRIORIDADES");
 top.forEach((t,i)=>lines.push(
  (i+1)+". "+t.title+" | Responsable sugerido: "+t.owner+" | Prioridad: "+t.priority,
  "Evidencia: "+t.evidence,
  "Acción: "+t.action,
  "Criterio de cierre: "+t.done
 ));
 lines.push("","CONTROL: No se han ejecutado cambios de inventario, ventas, compras ni recetas. Días faltantes NO significan ventas de $0. Las metas ausentes y fuentes no consultables se identifican explícitamente.");
 flyOpsReportText=lines.join("\n");
 $("fly-generate-report").disabled=false;
 $("fly-copy-report").disabled=false;

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
 const monthControl=$("report-month");
 // Mes actual por defecto; el histórico de octubre se consulta con el selector.
 const firstDay=(monthControl.value||monthNow.slice(0,7))+"-01";
 const nextMonth=new Date(firstDay+"T12:00:00Z");nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
 const monthEnd=nextMonth.toISOString().slice(0,10);
 const monthRequest=await fetch(BASE+"/rest/v1/ocs_filler_sales_days?select=sale_date,amount&sale_date=gte."+firstDay+"&sale_date=lt."+monthEnd+"&order=sale_date.asc",{headers:{"apikey":KEY,"Authorization":"Bearer "+session.access_token},cache:"no-store"});
 if(!monthRequest.ok)throw Error("No se pudieron cargar las ventas del mes.");
 const monthSales=await monthRequest.json();
 const salesByDate=new Map(monthSales.map(x=>[x.sale_date,Number(x.amount)]));
 const ticketByDate=new Map(rows.map(x=>[x.sale_date,Number(x.ticket_count)]));
 const dayOfMonth=firstDay.slice(0,7)===monthNow.slice(0,7)?Number(monthNow.slice(-2)):Number(new Date(Date.UTC(Number(firstDay.slice(0,4)),Number(firstDay.slice(5,7)),0)).getUTCDate());
 const dates=Array.from({length:dayOfMonth},(_,i)=>firstDay.slice(0,8)+String(i+1).padStart(2,"0")).filter(day=>{const weekday=new Date(day+"T12:00:00Z").getUTCDay();return weekday!==0&&weekday!==6;});
 renderSalesTrend(dates,salesByDate,firstDay);
 await renderGoals(session.access_token,firstDay,monthEnd,dates,salesByDate,ticketByDate,monthNow);
 await renderTrendComparisons(session.access_token,firstDay,monthEnd,dates,salesByDate,ticketByDate);
 const monthTickets=dates.reduce((sum,d)=>sum+(ticketByDate.get(d)||0),0);
 const monthAmount=dates.reduce((sum,d)=>sum+(salesByDate.get(d)||0),0);
 const monthBoth=dates.filter(d=>salesByDate.has(d)&&ticketByDate.has(d)&&ticketByDate.get(d)>0);
 const comparableTicketCount=monthBoth.reduce((sum,d)=>sum+ticketByDate.get(d),0);
 const comparableAmount=monthBoth.reduce((sum,d)=>sum+salesByDate.get(d),0);
 $("month-average").textContent=comparableTicketCount>0?money(comparableAmount/comparableTicketCount):"—";
 $("month-average-note").textContent="Promedio calculado solo con "+monthBoth.length+" día(s) con venta y tickets capturados en la misma fecha.";
 $("month-table-title").textContent="Ventas diarias · "+new Date(firstDay+"T12:00:00Z").toLocaleDateString("es-MX",{timeZone:"UTC",month:"long",year:"numeric"});
 $("monthly-sales-rows").innerHTML=dates.map(d=>'<tr style="border-bottom:1px solid #e7ece5"><td style="padding:11px">'+escape(d)+'</td><td style="padding:11px;text-align:right">'+(ticketByDate.has(d)?fmt(ticketByDate.get(d)):'<span class="small">Pendiente</span>')+'</td><td style="padding:11px;text-align:right">'+(salesByDate.has(d)?money(salesByDate.get(d)):'<span class="small">Sin corte</span>')+'</td><td style="padding:11px;text-align:right">'+(ticketByDate.get(d)>0&&salesByDate.has(d)?money(salesByDate.get(d)/ticketByDate.get(d)):'<span class="small">—</span>')+'</td></tr>').join("");
 $("monthly-tickets-total").textContent=fmt(monthTickets)+" registrados";
 $("monthly-sales-total").textContent=money(monthAmount);
 $("monthly-sales-note").textContent="Tickets manuales capturados: "+dates.filter(d=>ticketByDate.has(d)).length+" días. Cortes importados: "+dates.filter(d=>salesByDate.has(d)).length+" días. Los días pendientes no se consideran ventas de $0.";
 await showOctoberReconciliation(session.access_token);
 await renderTpvProductRanking(session.access_token,firstDay);
 await renderKitchenRetail(session.access_token,firstDay);
 await renderExecutiveSummary(session.access_token,firstDay,dates,salesByDate,ticketByDate,monthNow);
 await renderCostAndInventory(session.access_token,firstDay);
 await renderRecipeCosting(session.access_token);
 await renderFlySemaforo(session.access_token,firstDay,dates,salesByDate,ticketByDate,data.inventory||{});
 const sales=data.sales||{},orders=data.orders||{},inventory=data.inventory||{},feedback=data.feedback||{};
 $("login-card").hidden=true;$("dashboard").hidden=false;
 $("sales-amount").textContent=monthSales.length?money(monthAmount):"Sin cortes";
 $("sales-tickets").textContent=dates.some(d=>ticketByDate.has(d))?fmt(monthTickets):"Pendiente";
 $("ticket-average").textContent=comparableTicketCount>0?money(comparableAmount/comparableTicketCount):"—";
 $("latest-day").textContent=monthSales.length?monthSales[monthSales.length-1].sale_date:"Sin cortes";
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
$("report-month").value=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit"}).format(new Date()).slice(0,7);
$("report-month").addEventListener("change",()=>{$("report-month").dataset.userSelected="yes";show().catch(e=>status(e.message,true));});
$("refresh").addEventListener("click",()=>show().catch(e=>status(e.message,true)));
const viewGroups={
 resumen:new Set([3,5,6]),
 fly:new Set([4]),
 ventas:new Set([7,8,9,11,12]),
 operacion:new Set([10,13,14,15])
};
const viewDescriptions={
 resumen:"Resumen ejecutivo · indicadores, metas y alertas de negocio",
 fly:"Compás Fly · semáforo y prioridades. Abre la burbuja para hablar con el agente.",
 ventas:"Ventas y tendencias · evolución y registro diario del TPV",
 operacion:"Operación · cocina y retail, inventario, recetas y satisfacción"
};
let activeView="resumen";
function switchDashboardView(view){
 if(!viewGroups[view])return;
 activeView=view;
 const children=Array.from($("dashboard").children);
 children.forEach((node,index)=>{
  if(index<=2||node.id==="updated"||node.id==="fly-floating-root")return;
  node.classList.toggle("dashboard-view-hidden",!viewGroups[view].has(index));
 });
 document.querySelectorAll("[data-dashboard-view]").forEach(button=>{
  button.setAttribute("aria-pressed",String(button.dataset.dashboardView===view));
 });
 $("dashboard-view-caption").textContent=viewDescriptions[view];
}
document.querySelectorAll("[data-dashboard-view]").forEach(button=>button.addEventListener("click",()=>switchDashboardView(button.dataset.dashboardView)));
function toggleFlyDrawer(open){
 const drawer=$("fly-assistant-section");
 drawer.hidden=!open;
 $("fly-floating-trigger").setAttribute("aria-expanded",String(open));
 $("fly-floating-trigger").setAttribute("aria-label",open?"Cerrar conversación con Compás Fly":"Abrir conversación con Compás Fly");
 if(open)$("fly-chat-input").focus();
 else $("fly-floating-trigger").focus();
}
$("fly-floating-trigger").addEventListener("click",()=>toggleFlyDrawer($("fly-assistant-section").hidden));
$("fly-dialog-close").addEventListener("click",()=>toggleFlyDrawer(false));
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!$("fly-assistant-section").hidden)toggleFlyDrawer(false);
});
$("fly-nav-link").addEventListener("click",event=>{
 event.preventDefault();
 switchDashboardView("fly");
 $("fly-ops-panel").scrollIntoView({behavior:"smooth",block:"start"});
});
$("fly-generate-report").addEventListener("click",()=>{
 const prompt="Genera un reporte ejecutivo del periodo con los principales hallazgos, riesgos, datos pendientes y tres acciones priorizadas con criterios de verificación.";
 flyChatAsk(prompt);
});
$("fly-copy-answer").addEventListener("click",async()=>{
 if(!flyLastAnswer)return;
 try{
  await navigator.clipboard.writeText(flyLastAnswer);
  $("fly-ai-status").textContent="Último análisis copiado al portapapeles.";
 }catch{$("fly-ai-status").textContent="No se pudo copiar. Revisa los permisos del navegador.";}
});
switchDashboardView("resumen");
document.querySelectorAll("[data-fly-question]").forEach(button=>{
 button.addEventListener("click",()=>{
 const questions={
 ventas:"Analiza las ventas, avances y metas del mes seleccionado.",
 tickets:"Analiza el ticket promedio y la integridad de los tickets.",
 inventario:"Evalúa el abastecimiento e indica riesgos del inventario.",
 prioridades:"Genera tres prioridades operativas para el periodo.",
 recetas:"Revisa qué sabemos sobre recetas, costos y datos faltantes."
 };
 flyChatAsk(questions[button.dataset.flyQuestion]||"Resume los indicadores disponibles.");
});
});
$("fly-chat-form").addEventListener("submit",event=>{
 event.preventDefault();
 const input=$("fly-chat-input"),question=input.value.trim();
 if(!question)return;
 input.value="";
 flyChatAsk(question);
});
$("fly-copy-report").addEventListener("click",async()=>{
 if(!flyOpsReportText)return;
 try{
  await navigator.clipboard.writeText(flyOpsReportText);
  $("fly-copy-state").textContent="Reporte copiado. Puedes consultarlo y generar análisis sin salir de Fiiller en la pestaña Compás Fly IA.";
 }catch(error){
  $("fly-copy-state").textContent="No se pudo acceder al portapapeles en este navegador. Revisa los permisos del sitio.";
 }
});

$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{if(f.elements.username.value.trim().toLowerCase()!=="admin")throw Error("Ingresa con el usuario admin.");await FillerCloud.login("admin",f.elements.password.value);await show();}
 catch(err){status(err.message,true);}finally{b.disabled=false;}
});
show().catch(e=>status(e.message,true));
})();