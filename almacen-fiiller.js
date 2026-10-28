/* Nuevo Almacén Fiiller. Operación protegida por rol admin y RPC en Supabase. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co",KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN"});
const nfmt=n=>Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:3});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let inventory=[],movements=[];
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
function render(){
 const low=inventory.filter(i=>Number(i.quantity)<=Number(i.min_quantity));
 const exp=inventory.filter(i=>{let d=expiryDays(i.expiration_date);return d!==null&&d<=7;});
 $("k-items").textContent=inventory.length;$("k-low").textContent=low.length;$("k-exp").textContent=exp.length;
 $("k-value").textContent=money(inventory.reduce((a,i)=>a+Number(i.quantity)*Number(i.unit_cost),0));
 const filter=$("search").value.trim().toLocaleLowerCase("es-MX");
 const family=$("family-filter")?.value||"";
 const status=$("status-filter")?.value||"";
 const results=inventory.filter(i=>{
  if(!(i.name+" "+i.code+" "+i.category).toLocaleLowerCase("es-MX").includes(filter))return false;
  if(family&&i.category!==family)return false;
  const low=Number(i.quantity)<=Number(i.min_quantity);
  const d=expiryDays(i.expiration_date);
  if(status==="low"&&!low)return false;
  if(status==="expiry"&&!(d!==null&&d<=7))return false;
  if(status==="ok"&&(low||(d!==null&&d<=7)))return false;
  return true;
 });
 $("inventory-list").innerHTML=results.map(i=>{
   const d=expiryDays(i.expiration_date);
   const label=d!==null&&d<0?"Caducado":d!==null&&d<=7?"Caduca pronto":Number(i.quantity)<=Number(i.min_quantity)?"Bajo mínimo":"Correcto";
   const cls=d!==null&&d<=7?"exp":Number(i.quantity)<=Number(i.min_quantity)?"low":"";
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
 movements:["Movimientos","Registro y trazabilidad de entradas y salidas."],
 expiry:["Caducidades","Prioridad a productos próximos a vencer."],
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
 return inventory.filter(i=>Number(i.quantity)<Number(i.min_quantity)).map(i=>({
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
 $("family-summary").innerHTML=[...famCount].sort((a,b)=>b[1]-a[1]).map(([name,count])=>
 '<div class="summary-row"><span>'+escape(name)+'</span><strong>'+count+' insumos</strong></div>').join("")
 ||'<div class="empty-state"><strong>Aún no hay insumos registrados</strong>Agrega el primer producto desde Inventario general.</div>';
 const low=inventory.filter(i=>Number(i.quantity)<=Number(i.min_quantity));
 const expired=inventory.filter(i=>{const days=expiryDays(i.expiration_date);return days!==null&&days<0});
 const soon=inventory.filter(i=>{const days=expiryDays(i.expiration_date);return days!==null&&days>=0&&days<=7});
 $("priority-alerts").innerHTML=[
  '<div class="summary-row"><span>🔴 Caducados</span><strong>'+expired.length+'</strong></div>',
  '<div class="summary-row"><span>🟠 Caducan en 7 días</span><strong>'+soon.length+'</strong></div>',
  '<div class="summary-row"><span>⚠️ Bajo mínimo o agotados</span><strong>'+low.length+'</strong></div>',
  '<div class="summary-row"><span>✓ Insumos registrados</span><strong>'+inventory.length+'</strong></div>'
 ].join("");
 const expiring=inventory.filter(i=>expiryDays(i.expiration_date)!==null).sort((a,b)=>a.expiration_date.localeCompare(b.expiration_date));
 const label=i=>{const days=expiryDays(i.expiration_date);return days<0?"Caducado hace "+Math.abs(days)+" días":days===0?"Caduca hoy":"En "+days+" días";};
 $("upcoming-expiry").innerHTML=expiring.slice(0,5).map(i=>
 '<div class="summary-row"><span>'+escape(i.name)+'<br><small>'+escape(i.expiration_date)+'</small></span><strong class="'+(expiryDays(i.expiration_date)<=7?"is-danger":"")+'">'+label(i)+'</strong></div>').join("")
 ||'<div class="empty-state"><strong>Sin caducidades registradas</strong>Agrega la fecha al crear cada insumo.</div>';
 const filter=$("expiry-filter").value;
 const dayLimit=filter==="all"?Infinity:Number(filter);
 $("expiry-items").innerHTML=expiring.filter(i=>expiryDays(i.expiration_date)<=dayLimit).map(i=>
 '<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · '+nfmt(i.quantity)+' '+escape(i.unit)+'</small></span><span class="'+(expiryDays(i.expiration_date)<=7?"is-danger":"")+'">'+label(i)+'</span></div>').join("")
 ||'<div class="empty-state"><strong>Sin insumos en este rango</strong>Cuando captures fechas de caducidad aparecerán aquí.</div>';
 const purchases=recommendations();
 const purchaseRow=i=>'<div class="summary-row"><span><strong>'+escape(i.name)+'</strong><br><small>'+escape(i.code)+' · Actual: '+nfmt(i.have)+' · Mínimo: '+nfmt(i.minimum)+'</small></span><strong>'+nfmt(i.needed)+' '+escape(i.unit)+'</strong></div>';
 $("overview-purchases").innerHTML=purchases.slice(0,5).map(purchaseRow).join("")
 ||'<div class="empty-state"><strong>Sin reposiciones sugeridas</strong>Los mínimos definidos están cubiertos.</div>';
 $("purchase-list").innerHTML=purchases.map(purchaseRow).join("")
 ||'<div class="empty-state"><strong>Sin compras urgentes</strong>Los insumos están por encima de su mínimo.</div>';
}
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

async function load(){
 const [i,m]=await Promise.all([call("filler_inventory_items?select=*&order=name.asc&limit=1000"),call("filler_inventory_movements?select=id,item_id,type,quantity_change,note,created_at&order=created_at.desc&limit=30")]);
 inventory=i||[];movements=m||[];renderExtra();render();message("Datos del almacén actualizados.");
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