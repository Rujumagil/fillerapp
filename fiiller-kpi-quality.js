/* Fiiller Café · Calidad de datos y seguimiento local de acciones.
 * Solo lectura de fuentes Supabase. Los estados se guardan en este navegador;
 * NO alteran cifras TPV ni se consideran cambios confirmados en el servidor.
 */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const money=n=>Number(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
const clean=s=>String(s??"").trim().slice(0,180);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statuses={pendiente:"Pendiente",curso:"En curso",hecho:"Realizado · sin verificación de datos"};
let revision=0,period="",items=[],quality=null;
function readSaved(month){
 try{
  const v=JSON.parse(localStorage.getItem("fiiller_kpis_action_v1_"+month)||"{}");
  return v&&typeof v==="object"&&!Array.isArray(v)?v:{};
 }catch{return {};}
}
function save(){
 if(!period)return false;
 const object={};
 items.forEach(i=>object[i.id]={status:i.status,owner:i.owner,note:i.note,updatedAt:i.updatedAt});
 try{localStorage.setItem("fiiller_kpis_action_v1_"+period,JSON.stringify(object));return true}
 catch{return false}
}
function action(id,title,reason,owner){
 return {id,title,reason,owner,status:"pendiente",note:"",updatedAt:""};
}
function buildActions(info){
 const rows=[];
 if(info.pendingCuts.length)rows.push(action("cuts","Conciliar días sin corte",info.pendingCuts.join(", "),"Administración / Arrow"));
 if(info.pendingTickets.length)rows.push(action("tickets","Completar conteos de tickets",info.pendingTickets.join(", "),"Administración / Arrow"));
 if(info.unclassified===null)rows.push(action("source","Verificar acceso a clasificación TPV","La consulta de códigos y categorías no estuvo disponible. No se interpreta como cero pendientes.","Administración"));
 else if(info.unclassified.length)rows.push(action("classification","Validar cocina y retail",info.unclassified.length+" códigos sin clasificar · "+money(info.unclassifiedAmount)+" en detalle TPV","Control Fiiller"));
 if(info.avgGap!==null&&info.avgGap>0)rows.push(action("average","Probar complementos y medir ticket", "Brecha de "+money(info.avgGap)+" respecto a la meta, en fechas con venta y tickets comparables.","Fiiller · Comercial"));
 if(!rows.length)rows.push(action("followup","Revisión preventiva del periodo","Sin alertas detectadas en las fuentes consultadas. Comprobar cierre administrativo.","Administración"));
 const saved=readSaved(info.month);
 return rows.map(row=>{
  const previous=saved[row.id];
  if(previous){
   row.status=Object.keys(statuses).includes(previous.status)?previous.status:"pendiente";
   row.owner=clean(previous.owner||row.owner).slice(0,65);
   row.note=clean(previous.note||"").slice(0,180);
   row.updatedAt=String(previous.updatedAt||"").slice(0,30);
  }
  return row;
 });
}
function renderQuality(){
 if(!quality)return;
 const {month,working,pendingCuts,pendingTickets,unclassified,unclassifiedAmount,readErrors}=quality;
 $("quality-period").textContent=month;
 $("quality-coverage").textContent=(working.length-pendingCuts.length)+"/"+working.length+" cortes";
 $("quality-tickets").textContent=pendingTickets.length+" fechas sin tickets";
 $("quality-classification").textContent=unclassified===null?"Sin datos":unclassified.length+" código"+(unclassified.length===1?"":"s")+" · "+money(unclassifiedAmount);
 const details=working.filter(d=>pendingCuts.includes(d)||pendingTickets.includes(d));
 $("quality-dates-count").textContent=details.length+" fecha"+(details.length===1?"":"s");
 $("quality-dates").innerHTML=details.length?details.map(d=>{
  const cut=pendingCuts.includes(d),ticket=pendingTickets.includes(d);
  return '<div class="kpi-quality-line"><strong>'+esc(d)+'</strong><span>'+
   (cut?'<span class="kpi-mini-flag">Sin corte</span>':'<span class="kpi-mini-ok">Corte registrado</span>')+
   (ticket?'<span class="kpi-mini-flag">Sin tickets</span>':'<span class="kpi-mini-ok">Tickets registrados</span>')+
   '</span></div>';
 }).join(""):'<p class="small">No se detectan fechas con corte o tickets faltantes en el periodo evaluado.</p>';
 if(unclassified===null)$("quality-products").innerHTML='<p class="small">No se pudo comprobar la clasificación: '+esc(readErrors.join("; ")||"consulta no disponible")+'. No equivale a cero artículos pendientes.</p>';
 else $("quality-products").innerHTML=unclassified.length?unclassified.map(p=>
  '<div class="kpi-quality-line"><span><strong>'+esc(p.product_name)+'</strong><small>Código '+esc(p.product_code)+' · '+esc(Number(p.net_units).toLocaleString("es-MX"))+' uds.</small></span><b>'+money(p.net_amount)+'</b></div>'
 ).join(""):'<p class="small">Todos los artículos disponibles en el detalle TPV tienen clasificación.</p>';
 $("quality-class-count").textContent=unclassified===null?"No disponible":unclassified.length+" código"+(unclassified.length===1?"":"s");
 $("quality-notice").textContent=readErrors.length?readErrors.join(". "):"Las fechas sin corte no se convierten en ventas $0. Los importes digitales no se suman al TPV.";
 $("quality-csv").disabled=unclassified===null||unclassified.length===0;
}
function renderActions(){
 const done=items.filter(x=>x.status==="hecho").length, all=items.length;
 $("quality-action-progress").textContent=done+"/"+all+" marcadas · "+(all?Math.round(100*done/all):0)+"%";
 $("quality-action-list").innerHTML=items.map(x=>
  '<div class="kpi-action-row" data-quality-id="'+esc(x.id)+'">'+
  '<div><strong>'+esc(x.title)+'</strong><p>'+esc(x.reason)+'</p><small>Responsable sugerido</small><input data-field="owner" maxlength="65" value="'+esc(x.owner)+'" aria-label="Responsable de '+esc(x.title)+'"></div>'+
  '<div class="kpi-action-fields"><label>Estado<select data-field="status" aria-label="Estado de '+esc(x.title)+'">'+
  Object.entries(statuses).map(([v,label])=>'<option value="'+v+'"'+(x.status===v?' selected':'')+'>'+esc(label)+'</option>').join("")+'</select></label>'+
  '<label>Nota de avance<input data-field="note" maxlength="180" placeholder="Referencia o próximo paso" value="'+esc(x.note)+'"></label>'+
  '<small>'+(x.updatedAt?'Editado '+esc(x.updatedAt):'Sin avances registrados')+'</small></div></div>'
 ).join("");
}
function exportText(){
 if(!period||!quality)return "";
 return "\n\nSEGUIMIENTO ADMINISTRATIVO MANUAL · "+period+
  "\nOrigen de avances: almacenamiento local en este navegador, NO tarea verificada en Supabase."+
  "\nFechas sin corte: "+(quality.pendingCuts.join(", ")||"ninguna")+"."+
  "\nFechas sin tickets: "+(quality.pendingTickets.join(", ")||"ninguna")+"."+
  "\nProductos sin clasificar: "+(quality.unclassified===null?"FUENTE NO DISPONIBLE":quality.unclassified.length+" códigos, "+money(quality.unclassifiedAmount))+
  "\n"+items.map(x=>"- "+x.title+" | "+statuses[x.status]+" | Responsable: "+x.owner+" | Evidencia: "+x.reason+" | Nota: "+(x.note||"Sin nota")).join("\n")+
  "\nLas marcas manuales de avance no reemplazan la conciliación de cortes, tickets ni códigos de producto.";
}
async function query(path,token){
 const r=await fetch(BASE+"/rest/v1/"+path,{headers:{apikey:KEY,Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok)throw Error("No se pudieron leer los artículos del TPV ("+r.status+").");
 const data=await r.json();
 if(!Array.isArray(data))throw Error("Formato de productos inesperado.");
 return data;
}
async function accept(event){
 const detail=event.detail||{},my=++revision;
 const working=Array.isArray(detail.working)?detail.working:[];
 if(!/^\d{4}-\d{2}$/.test(detail.month||"")||!working.length)return;
 period=detail.month;
 $("quality-notice").textContent="Verificando datos del periodo…";
 const sales=new Set(detail.cutDates||[]),tickets=new Set(detail.ticketDates||[]);
 const pendingCuts=working.filter(d=>!sales.has(d)),pendingTickets=working.filter(d=>!tickets.has(d));
 let unclassified=null,unclassifiedAmount=0,readErrors=[],avgGap=null;
 try{
  const token=await window.FillerCloud?.accessToken?.();
  if(!token)throw Error("Sesión administrativa no disponible.");
  const [products,classes,targets]=await Promise.all([
   query("fiiller_tpv_product_monthly?select=product_code,product_name,net_units,net_amount&sale_month=eq."+detail.month+"-01&limit=1000",token),
   query("fiiller_tpv_product_classification?select=product_code,product_type&limit=1000",token),
   query("fiiller_monthly_targets?select=effective_month,avg_ticket_target&effective_month=lte."+detail.month+"-01&order=effective_month.desc&limit=1",token)
  ]);
  const known=new Map(classes.map(c=>[String(c.product_code),c.product_type]));
  unclassified=products.filter(p=>!["cocina","retail"].includes(known.get(String(p.product_code))));
  unclassifiedAmount=unclassified.reduce((a,p)=>a+Number(p.net_amount||0),0);
  const target=Number(targets[0]?.avg_ticket_target);
  if(Number.isFinite(target)&&target>0&&Number(detail.comparableTickets)>0){
   const actual=Number(detail.comparableAmount)/Number(detail.comparableTickets);
   if(Number.isFinite(actual))avgGap=Math.max(0,target-actual);
  }
 }catch(e){readErrors=[String(e.message||e)];}
 if(my!==revision)return;
 quality={month:detail.month,working,pendingCuts,pendingTickets,unclassified,unclassifiedAmount,avgGap,readErrors};
 items=buildActions(quality);
 renderQuality();renderActions();
}
$("quality-action-list")?.addEventListener("change",event=>{
 const input=event.target?.closest?.("[data-field]");
 const row=input?.closest?.("[data-quality-id]");
 if(!input||!row)return;
 const item=items.find(x=>x.id===row.dataset.qualityId);
 if(!item)return;
 if(input.dataset.field==="status")item.status=Object.hasOwn(statuses,input.value)?input.value:"pendiente";
 if(input.dataset.field==="owner")item.owner=clean(input.value).slice(0,65);
 if(input.dataset.field==="note")item.note=clean(input.value).slice(0,180);
 item.updatedAt=new Intl.DateTimeFormat("es-MX",{dateStyle:"short",timeStyle:"short",timeZone:"America/Mexico_City"}).format(new Date());
 const stored=save();
 $("quality-actions-note").textContent=stored?"Avance guardado en este navegador. No modifica cortes, ventas ni inventario.":"No se pudo guardar el avance (almacenamiento del navegador no disponible).";
 renderActions();
});
$("quality-csv")?.addEventListener("click",()=>{
 if(!quality?.unclassified?.length)return;
 const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
 const body=[["codigo","producto","unidades_netas","importe_neto_mxn"],...quality.unclassified.map(p=>[p.product_code,p.product_name,p.net_units,p.net_amount])].map(row=>row.map(q).join(",")).join("\r\n");
 const file=new Blob(["\uFEFF"+body],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(file);
 const a=document.createElement("a");a.href=url;a.download="fiiller-sin-clasificar-"+quality.month+".csv";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("quality-copy")?.addEventListener("click",async()=>{
 if(!period)return;
 try{
  await navigator.clipboard.writeText("FIILLER CAFÉ · CONTROL DE CALIDAD Y AVANCES"+exportText());
  $("quality-actions-note").textContent="Reporte de seguimiento copiado; puedes compartirlo con Compás Fly.";
 }catch{$("quality-actions-note").textContent="No se pudo copiar; revisa permisos del portapapeles.";}
});
$("quality-open-fly")?.addEventListener("click",()=>{
 const btn=$("fly-floating-trigger"),input=$("fly-chat-input"),picker=$("fly-agent-selector");
 if(!btn||!input)return;
 picker.value="fly_quality";
 if($("fly-assistant-section").hidden)btn.click();
 input.value="Evalúa la calidad de datos del mes, revisa los estados manuales adjuntos y propone los tres próximos pasos con responsables, sin ejecutar cambios.";
 input.focus();
 $("quality-actions-note").textContent="Consulta preparada para Compás Fly Quality. Revisa el texto y pulsa Consultar; no se envió automáticamente.";
});
window.FiillerKpiQuality=Object.freeze({exportText});
window.addEventListener("fiiller:kpis-ready",accept);
})();