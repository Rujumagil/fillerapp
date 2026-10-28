/* Nuevo Almacén Fiiller. Operación protegida por rol admin y RPC en Supabase. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co",KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const nfmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:3});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let inventory=[],movements=[],counts=[],lots=[];
function message(s,bad=false){$("message").textContent=s;$("message").classList.toggle("danger",bad);}
async function call(path,{body,method="GET"}={}){
 const data=JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null");
 if(!data?.access_token)throw Error("Inicia sesión como administrador.");
 const res=await fetch(BASE+"/rest/v1/"+path,{method,headers:{apikey:KEY,Authorization:"Bearer "+data.access_token,"Content-Type":"application/json",...(method!=="GET"?{Prefer:"return=representation"}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const result=await res.json().catch(()=>null);
 if(!res.ok)throw Error(result?.message||"Error consultando almacén.");
 return result;
}
function today(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const p=k=>parts.find(a=>a.type===k)?.value||"";
 return p("year")+"-"+p("month")+"-"+p("day");
}
function expiryDays(iso){
 if(!iso)return null;
 const d=new Date(iso+"T12:00:00Z");
 const t=new Date(today()+"T12:00:00Z");
 return Math.round((d-t)/86400000);
}
// Identifica posibles errores de captura/unidad heredados de la hoja OCS.
function unusualMinimum(i){
 const qty=Number(i.quantity),min=Number(i.min_quantity),max=Number(i.max_quantity||0);
 return (i.unit==="kg" && min>=25) ||
   (i.unit==="g" && qty>0 && qty<10 && min>=20) ||
   (qty>0 && min>=20 && min/qty>=20) ||
   (max>0 && min>max);
}
function safePurchaseItems(){
 return inventory.filter(i=>!unusualMinimum(i) && Number(i.min_quantity)>0 &&
 Number(i.quantity)<Number(i.min_quantity));
}
function htmlSafe(s){return escape(s)}
function render(){
 const low=inventory.filter(i=>Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity));
 const missingExpiry=inventory.filter(i=>!i.expiration_date).length;
 const physicalCounted=new Set(counts.map(x=>x.item_id)).size;
 const priced=inventory.filter(i=>Number(i.unit_cost)>0);
 const estimated=priced.reduce((a,i)=>a+Number(i.quantity)*Number(i.unit_cost),0);
 $("k-items").textContent=inventory.length;
 $("k-low").textContent=low.length;
 $("k-noexpiry").textContent=missingExpiry;
 $("k-counted").textContent=physicalCounted+" / "+inventory.length;
 $("k-counted-sub").textContent=(inventory.length-physicalCounted)+" pendientes de conteo";
 $("k-value").textContent=priced.length?money(estimated):"Sin costos";
 $("k-value-note").textContent=priced.length?priced.length+" de "+inventory.length+" insumos con costo":"Captura costos para valorar inventario";
 $("k-items-detail").textContent=inventory.filter(i=>Number(i.quantity)>0).length+" con existencia positiva";
 const filter=$("search").value.trim().toLocaleLowerCase("es-MX");
 const family=$("family-filter")?.value||"";
 const status=$("status-filter")?.value||"";
 const results=inventory.filter(i=>{
  if(!(i.name+" "+i.code+" "+i.category).toLocaleLowerCase("es-MX").includes(filter))return false;
  if(family&&i.category!==family)return false;
  const low=(Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity));
  const d=expiryDays(i.expiration_date);
  if(status==="low"&&!low)return false;
  if(status==="expiry"&&!(d!==null&&d<=7))return false;
  if(status==="ok"&&(low||(d!==null&&d<=7)))return false;
  return true;
 });
 $("inventory-list").innerHTML=results.map(i=>{
   const d=expiryDays(i.expiration_date);
   const label=d!==null&&d<0?"Caducado":d!==null&&d<=7?"Caduca pronto":(Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity))?"Bajo mínimo":"Correcto";
   const cls=d!==null&&d<=7?"exp":(Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity))?"low":"";
   return '<tr><td><strong>'+escape(i.code)+'</strong></td><td>'+escape(i.name)+'</td><td>'+escape(i.category)+'</td><td>'+nfmt(i.quantity)+' '+escape(i.unit)+'</td><td>'+nfmt(i.min_quantity)+'</td><td>'+escape(i.expiration_date||"—")+'</td><td><span class="pill '+cls+'">'+label+'</span></td></tr>';
 }).join("")||'<tr><td colspan="7">Todavía no hay insumos registrados para esta búsqueda.</td></tr>';
 const previous=$("movement-item").value;
 $("movement-item").innerHTML='<option value="">Seleccionar insumo…</option>'+inventory.map(i=>'<option value="'+escape(i.id)+'">'+escape(i.name)+' ('+nfmt(i.quantity)+' '+escape(i.unit)+')</option>').join("");
 if(inventory.some(i=>i.id===previous))$("movement-item").value=previous;
 $("movements-list").innerHTML=movements.map(m=>{
   const item=inventory.find(i=>i.id===m.item_id);
   return '<div class="item"><div><strong>'+escape(item?.name||"Insumo")+'</strong><br><small>'+escape(m.type)+' · '+new Date(m.created_at).toLocaleString("es-MX")+'</small><br><small>'+escape(m.note||"Sin nota")+'</small></div><strong>'+((Number(m.quantity_change)>0)?"+":"")+nfmt(m.quantity_change)+'</strong></div>';
 }).join("")||'<p class="muted">Todavía no hay movimientos registrados.</p>';
}

const paneLabels={
 overview:["Resumen de almacén","Visibilidad total de existencias y alertas de cocina."],
 inventory:["Inventario general","Cada insumo en un solo lugar, con filtros y registro."],
 counts:["Conteo físico de hoy","Verifica cada insumo y registra las diferencias contra el sistema."],
 movements:["Movimientos","Registro y trazabilidad de entradas y salidas."],
 expiry:["Caducidades y lotes","Registra las fechas reales de vencimiento de cada lote."],
 purchase:["Compras sugeridas","Reposiciones calculadas con existencias y mínimos."],
 recipes:["Recetas y consumo","Conexión del menú con costos e ingredientes."]
};
function navigate(key){
 const chosen=paneLabels[key]?key:"overview";
 document.querySelectorAll("[data-pane]").forEach(b=>{b.classList.toggle("active",b.dataset.pane===chosen);b.setAttribute("aria-current",b.dataset.pane===chosen?"page":"false");});
 document.querySelectorAll("[data-view]").forEach(p=>p.classList.toggle("active",p.dataset.view===chosen));
 $("workspace-title").textContent=paneLabels[chosen][0];
 $("workspace-description").textContent=paneLabels[chosen][1];
 if(location.hash!=="#"+chosen)history.replaceState(null,"","#"+chosen);
}
document.querySelectorAll("[data-pane]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.pane)));
$("quick-product").addEventListener("click",()=>{navigate("inventory");$("create-form").scrollIntoView({behavior:"smooth",block:"start"});});
$("quick-movement").addEventListener("click",()=>{navigate("movements");$("movement-form").scrollIntoView({behavior:"smooth",block:"start"});});
window.addEventListener("hashchange",()=>navigate(location.hash.replace("#","")));
navigate(location.hash.replace("#",""));
function recommendations(){
 return safePurchaseItems().map(i=>({
  code:i.code,name:i.name,category:i.category,unit:i.unit,have:Number(i.quantity),
  minimum:Number(i.min_quantity),needed:Number(i.min_quantity)-Number(i.quantity),
  estimate:(Number(i.min_quantity)-Number(i.quantity))*Number(i.unit_cost)
 })).sort((a,b)=>b.needed-a.needed);
}
function renderExtra(){
 const families=[...new Set(inventory.map(i=>i.category))].sort((a,b)=>a.localeCompare(b,"es"));
 const fam=$("family-filter"),saved=fam.value;
 fam.innerHTML='<option value="">Todas las familias</option>'+families.map(x=>'<option value="'+escape(x)+'">'+escape(x)+'</option>').join("");
 if(families.includes(saved))fam.value=saved;
 const famCount=new Map();
 inventory.forEach(i=>famCount.set(i.category,(famCount.get(i.category)||0)+1));
 const peak=Math.max(...famCount.values(),1);
 $("family-summary").innerHTML=[...famCount].sort((a,b)=>b[1]-a[1]).map(([name,count])=>
 '<div class="family-row"><span class="family-name">'+escape(name)+'</span><strong class="family-number">'+count+'</strong><div class="family-track"><div class="family-fill" style="width:'+Math.round(100*count/peak)+'%"></div></div></div>').join("")
 ||'<div class="compact-empty"><strong>Aún no hay insumos</strong>Agrega productos en Inventario.</div>';
 const low=inventory.filter(i=>(Number(i.min_quantity)>0&&Number(i.quantity)<=Number(i.min_quantity)));
 const expired=inventory.filter(i=>{const days=expiryDays(i.expiration_date);return days!==null&&days<0});
 const soon=inventory.filter(i=>{const days=expiryDays(i.expiration_date);return days!==null&&days>=0&&days<=7});
 const suspect=inventory.filter(unusualMinimum);
 const withoutCost=inventory.filter(i=>Number(i.unit_cost)<=0).length;
 $("priority-alerts").innerHTML=[
  ['expiry','red','◷','Capturar fechas de caducidad',inventory.filter(i=>!i.expiration_date).length,'No se registraron vencimientos en la migración'],
  ['inventory','orange','!','Insumos bajo mínimo',low.length,'Revisar existencias y puntos de reposición','low'],
  ['purchase','orange','≋','Mínimos y unidades por validar',suspect.length,'No generar compras sin confirmar unidades'],
  ['counts','','✓','Conteo físico pendiente',inventory.length-new Set(counts.map(c=>c.item_id)).size,'Comparar cantidades reales con sistema']
 ].map(([pane,color,symbol,title,count,subtitle,filter])=>
 '<button type="button" class="priority-action" data-priority="'+pane+'" '+(filter?'data-filter="'+filter+'"':'')+'><span class="priority-symbol '+color+'">'+symbol+'</span><span class="priority-copy"><strong>'+title+'</strong><small>'+subtitle+'</small></span><strong class="priority-count">'+count+'</strong><span aria-hidden="true">›</span></button>').join("");
 $("priority-alerts").querySelectorAll("[data-priority]").forEach(button=>button.addEventListener("click",()=>{
   navigate(button.dataset.priority);
   if(button.dataset.filter && $("status-filter")){ $("status-filter").value=button.dataset.filter;render();}
 }));
 const done=new Set(counts.map(c=>c.item_id)).size;
 const percent=inventory.length?Math.round(100*done/inventory.length):0;
 $("dashboard-date").textContent=new Intl.DateTimeFormat("es-MX",{timeZone:"America/Mexico_City",day:"numeric",month:"long",year:"numeric"}).format(new Date());
 $("count-progress-pct").textContent=percent+"%";
 $("count-progress-fill").style.width=percent+"%";
 $("count-completed").textContent=done;
 $("count-remaining").textContent=inventory.length-done;
 $("data-quality").innerHTML='<strong>Calidad de datos:</strong> '+withoutCost+' insumos sin costo unitario registrado; '+suspect.length+' requieren revisar mínimos o unidades. Las compras sugeridas excluyen temporalmente los valores sospechosos. <button type="button" data-quality-action="purchase">Revisar prioridades →</button>';
 $("data-quality").querySelector("button").addEventListener("click",()=>navigate("purchase"));
 const expiring=inventory.filter(i=>expiryDays(i.expiration_date)!==null).sort((a,b)=>a.expiration_date.localeCompare(b.expiration_date));
 const label=i=>{const days=expiryDays(i.expiration_date);return days<0?"Caducado hace "+Math.abs(days)+" días":days===0?"Caduca hoy":"En "+days+" días";};
 $("upcoming-expiry").innerHTML=expiring.slice(0,4).map(i=>
 '<div class="compact-item"><span><strong>'+escape(i.name)+'</strong><small>'+escape(i.expiration_date)+'</small></span><span class="amount">'+label(i)+'</span></div>').join("")
 ||'<div class="compact-empty"><strong>Aún no hay caducidades capturadas</strong>Registra los lotes durante la revisión de hoy.</div>';
 const filter=$("expiry-filter").value;
 const dayLimit=filter==="all"?Infinity:Number(filter);
 $("expiry-items").innerHTML=expiring.filter(i=>expiryDays(i.expiration_date)<=dayLimit).map(i=>
 '<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · '+nfmt(i.quantity)+' '+escape(i.unit)+'</small></span><span class="'+(expiryDays(i.expiration_date)<=7?"is-danger":"")+'">'+label(i)+'</span></div>').join("")
 ||'<div class="empty-state"><strong>Sin insumos en este rango</strong>Cuando captures fechas de caducidad aparecerán aquí.</div>';
 const suspects=inventory.filter(unusualMinimum).sort((a,b)=>Number(b.min_quantity)-Number(a.min_quantity));
 $("suspicious-count").textContent=suspects.length+" por revisar";
 $("suspicious-list").innerHTML=suspects.map(i=>
 '<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · Existencia '+nfmt(i.quantity)+' '+escape(i.unit)+' · Mínimo '+nfmt(i.min_quantity)+' '+escape(i.unit)+'</small></span><span class="count-chip">Validar</span></div>').join("")
 ||'<div class="empty-state"><strong>Sin inconsistencias evidentes</strong>Confirma siempre la unidad de cada insumo durante el conteo.</div>';
 const purchases=recommendations();
 const purchaseRow=i=>'<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · Actual: '+nfmt(i.have)+' · Mínimo: '+nfmt(i.minimum)+'</small></span><strong>'+nfmt(i.needed)+' '+escape(i.unit)+'</strong></div>';
 $("overview-purchases").innerHTML=purchases.slice(0,4).map(i=>
 '<div class="compact-item"><span><strong>'+escape(i.name)+'</strong><small>Actual '+nfmt(i.have)+' · Mínimo '+nfmt(i.minimum)+'</small></span><span class="amount">+'+nfmt(i.needed)+' '+escape(i.unit)+'</span></div>').join("")
 ||'<div class="compact-empty"><strong>Sin reposiciones validadas</strong>Los mínimos heredados pueden requerir revisión.</div>';
 $("purchase-list").innerHTML=purchases.map(purchaseRow).join("")
 ||'<div class="empty-state"><strong>Sin compras urgentes</strong>Los insumos están por encima de su mínimo.</div>';
}
document.querySelectorAll("[data-jump]").forEach(button=>button.addEventListener("click",()=>{
 navigate(button.dataset.jump);
 if(button.dataset.setStatus && $("status-filter")){ $("status-filter").value=button.dataset.setStatus;render(); }
}));
$("source-info-toggle").addEventListener("click",()=>{
 const detail=$("source-info-detail"),open=detail.hidden;
 detail.hidden=!open;
 $("source-info-toggle").setAttribute("aria-expanded",String(open));
});
$("family-filter").addEventListener("change",render);
$("status-filter").addEventListener("change",render);
$("expiry-filter").addEventListener("change",renderExtra);
$("export-purchases").addEventListener("click",()=>{
 const items=recommendations();
 if(!items.length){message("No hay compras sugeridas por el momento.");return;}
 const csv=[["Código","Insumo","Familia","Existencia","Mínimo","Cantidad sugerida","Unidad","Costo estimado"],
 ...items.map(i=>[i.code,i.name,i.category,i.have,i.minimum,i.needed,i.unit,i.estimate])]
 .map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="fiiller-pedido-sugerido.csv";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});


function renderAudit(){
 const chosen=$("count-item").value,lotChosen=$("lot-item").value;
 const options='<option value="">Selecciona un insumo…</option>'+inventory.map(i=>
 '<option value="'+escape(i.id)+'">'+escape(i.code)+' · '+escape(i.name)+' ('+nfmt(i.quantity)+' '+escape(i.unit)+')</option>').join("");
 $("count-item").innerHTML=options;
 $("lot-item").innerHTML=options;
 if(inventory.some(i=>i.id===chosen))$("count-item").value=chosen;
 if(inventory.some(i=>i.id===lotChosen))$("lot-item").value=lotChosen;
 updateSystemQuantity();
 const doneIds=new Set(counts.map(x=>x.item_id));
 $("count-total").textContent=inventory.length;
 $("count-done").textContent=doneIds.size;
 $("count-pending").textContent=inventory.length-doneIds.size;
 const filter=$("count-filter").value;
 const countRows=inventory.filter(i=>filter==="all"||(filter==="done"?doneIds.has(i.id):!doneIds.has(i.id)));
 const countInfo=new Map();
 counts.forEach(c=>{if(!countInfo.has(c.item_id))countInfo.set(c.item_id,c);});
 $("count-list").innerHTML=countRows.map(i=>{
 const c=countInfo.get(i.id);
 return '<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · '+escape(i.category)+' · Sistema: '+nfmt(i.quantity)+' '+escape(i.unit)+'</small>'+(c?'<br><small>Último conteo: '+nfmt(c.physical_quantity)+' · Diferencia: '+nfmt(c.difference)+'</small>':'')+'</span><button type="button" class="secondary" data-count-select="'+escape(i.id)+'">'+(c?'Recontar':'Contar')+'</button></div>';
 }).join("")||'<div class="empty-state"><strong>No hay registros para este filtro.</strong></div>';
 $("count-list").querySelectorAll("[data-count-select]").forEach(b=>b.addEventListener("click",()=>{
  $("count-item").value=b.dataset.countSelect;updateSystemQuantity();
  $("count-form").scrollIntoView({behavior:"smooth",block:"start"});$("count-physical").focus();
 }));
 $("lot-count").textContent=lots.length+" lotes";
 $("lot-list").innerHTML=lots.map(l=>{
 const item=inventory.find(i=>i.id===l.item_id);
 const d=expiryDays(l.expiration_date);
 const status=d===null?"Sin fecha":d<0?"Caducado":d===0?"Caduca hoy":d<=7?"Próximo a vencer":"Vigente";
 return '<div class="summary-row"><span><strong>'+escape(item?.name||"Insumo")+'</strong><br><small>Lote '+escape(l.lot_code)+' · '+nfmt(l.quantity)+' '+escape(item?.unit||"")+' · '+escape(l.expiration_date||"Sin fecha")+'</small></span><span class="pill '+(d!==null&&d<=7?'exp':'')+'">'+status+'</span></div>';
 }).join("")||'<div class="empty-state"><strong>No hay lotes registrados</strong>Durante la revisión física captura el número de lote y la caducidad indicada en cada producto.</div>';
}
function updateSystemQuantity(){
 const item=inventory.find(i=>i.id===$("count-item").value);
 $("count-system").value=item?nfmt(item.quantity)+" "+item.unit:"Selecciona un insumo";
 $("count-physical").placeholder=item?"Cantidad en "+item.unit:"Cantidad encontrada";
}
$("count-item").addEventListener("change",updateSystemQuantity);
$("count-filter").addEventListener("change",renderAudit);
$("count-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{
 const d=new FormData(f),item=inventory.find(i=>i.id===d.get("item"));
 if(!item)throw Error("Selecciona un insumo válido.");
 const physical=Number(d.get("physical"));
 if(!Number.isFinite(physical)||physical<0)throw Error("Escribe la existencia física encontrada.");
 const current=Number(item.quantity),difference=physical-current;
 const answer=window.confirm("Confirmar conteo de "+item.name+"\nSistema: "+nfmt(current)+" "+item.unit+"\nFísico: "+nfmt(physical)+" "+item.unit+"\nDiferencia: "+nfmt(difference)+" "+item.unit+"\n\n¿Guardar el conteo y ajustar la existencia?");
 if(!answer)return;
 await call("rpc/filler_inventory_count",{method:"POST",body:{p_item:item.id,p_physical:physical,p_reason:String(d.get("reason")||"").trim()||"Conteo físico de cocina"}});
 f.elements.physical.value="";f.elements.reason.value="";
 await load();$("count-item").value=item.id;updateSystemQuantity();message("✓ Conteo guardado y existencia actualizada. Diferencia: "+nfmt(difference)+" "+item.unit);
 }catch(err){message(err.message,true);}finally{b.disabled=false;}
});
$("lot-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{
 const d=new FormData(f);
 if(!inventory.some(i=>i.id===d.get("item")))throw Error("Selecciona un insumo válido.");
 await call("rpc/filler_inventory_lot_save",{method:"POST",body:{p_item:d.get("item"),p_lot:String(d.get("lot")||"").trim(),p_expiry:d.get("expiry"),p_quantity:Number(d.get("quantity")),p_received:d.get("received")||null}});
 f.reset();await load();message("✓ Lote y caducidad registrados. Las existencias totales no se modificaron.");
 }catch(err){message(err.message,true);}finally{b.disabled=false;}
});
async function load(){
 const [i,m,c,l]=await Promise.all([call("filler_inventory_items?select=*&order=name.asc&limit=1000"),call("filler_inventory_movements?select=id,item_id,type,quantity_change,note,created_at&order=created_at.desc&limit=30"),call("filler_inventory_counts?select=id,item_id,system_quantity,physical_quantity,difference,count_date,counted_at&count_date=eq."+today()+"&order=counted_at.desc&limit=1000"),call("filler_inventory_lots?select=id,item_id,lot_code,expiration_date,quantity,received_at&order=expiration_date.asc.nullslast&limit=1000")]);
 inventory=i||[];movements=m||[];counts=c||[];lots=l||[];renderExtra();render();renderAudit();message("Datos del almacén actualizados.");
}
async function show(){
 const role=await FillerCloud.staffRole();
 $("login-card").hidden=role==="admin";$("dashboard").hidden=role!=="admin";
 if(role!=="admin"){message(role?"Acceso exclusivo para administración.":"Ingresa como administrador para usar el almacén.");return;}
 await load();
}
$("search").addEventListener("input",render);
$("refresh").addEventListener("click",()=>load().catch(e=>message(e.message,true)));
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{if(f.elements.username.value.trim().toLowerCase()!=="admin")throw Error("Usa tu cuenta administradora.");await FillerCloud.login("admin",f.elements.password.value);await show();}
 catch(err){message(err.message,true);}finally{b.disabled=false;}
});
$("create-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{
 const d=new FormData(f);
 await call("rpc/filler_inventory_create",{method:"POST",body:{p_code:String(d.get("code")).trim(),p_name:String(d.get("name")).trim(),p_category:d.get("category"),p_unit:d.get("unit"),p_min:Number(d.get("min")),p_cost:Number(d.get("cost")),p_expiry:d.get("expiry")||null}});
 f.reset();await load();message("✓ Insumo creado. Registra una entrada para alimentar su existencia.");
 }catch(err){message(err.message,true);}finally{b.disabled=false;}
});
$("movement-form").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;
 try{
 const d=new FormData(f);
 await call("rpc/filler_inventory_move",{method:"POST",body:{p_item:d.get("item"),p_type:d.get("type"),p_quantity:Number(d.get("qty")),p_note:String(d.get("note")||"").trim()||null}});
 f.elements.qty.value="";f.elements.note.value="";await load();message("✓ Movimiento de almacén guardado.");
 }catch(err){message(err.message,true);}finally{b.disabled=false;}
});
show().catch(err=>message(err.message,true));
})();