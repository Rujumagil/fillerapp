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
 const results=inventory.filter(i=>(i.name+" "+i.code+" "+i.category).toLocaleLowerCase("es-MX").includes(filter));
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
async function load(){
 const [i,m]=await Promise.all([call("filler_inventory_items?select=*&order=name.asc&limit=1000"),call("filler_inventory_movements?select=id,item_id,type,quantity_change,note,created_at&order=created_at.desc&limit=30")]);
 inventory=i||[];movements=m||[];render();message("Datos del almacén actualizados.");
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