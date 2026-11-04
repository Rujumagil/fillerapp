(()=>{"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co",KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3",$=id=>document.getElementById(id);
let recipes=[],lines=[],items=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const msg=(id,s,error=false)=>{const n=$(id);n.textContent=s;n.classList.toggle("error",error)};
function session(){try{return JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null")}catch{return null}}
async function api(path,{method="GET",body}={}){const s=session();if(!s?.access_token)throw Error("La sesión ha vencido.");const headers={apikey:KEY,Authorization:"Bearer "+s.access_token,Accept:"application/json"};if(body!==undefined){headers["Content-Type"]="application/json";headers.Prefer="return=representation"}const res=await fetch(BASE+"/rest/v1/"+path,{method,headers,cache:"no-store",body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.message||"Error de base de datos "+res.status);return data}
const skuOptions=(selected="")=>'<option value="">Seleccionar producto</option>'+items.map(x=>'<option value="'+esc(x.code)+'" '+(x.code===selected?"selected":"")+'>'+esc(x.code+" · "+x.name+" ["+x.unit+"]")+'</option>').join("");
function render(){
 const verified=lines.filter(x=>x.mapping_status==="verified").length,candidate=lines.filter(x=>x.mapping_status==="candidate").length;
 $("stats").innerHTML='<span>'+recipes.length+' recetas</span><span>'+verified+' SKU confirmados</span><span>'+candidate+' SKU sugeridos</span><span>'+(lines.length-verified)+' componentes pendientes</span>';
 const sub=recipes.find(x=>x.recipe_id==="SUB-002");
 if(!sub){$("yield-form").closest("section").hidden=true;}else{$("yield-form").closest("section").hidden=false;$("yield-qty").value=sub.yield_quantity;$("yield-confirm").value=sub.yield_verified?"yes":"no";msg("yield-status",sub.yield_verified?"Rendimiento físicamente confirmado.":"Rendimiento estimado; comprobación pendiente.");}
 $("recipe-lines").innerHTML=recipes.map(r=>'<div><h3>'+esc(r.recipe_id+" · "+r.recipe_name)+'</h3>'+lines.filter(x=>x.recipe_id===r.recipe_id).map(l=>{
  if(l.subrecipe_id)return '<div class="line"><h3>'+esc(l.ingredient_name)+' <span>'+esc(l.required_quantity+" "+l.required_unit)+" · "+esc(l.subrecipe_id)+'</span></h3><p class="muted">Subreceta vinculada. No se descuenta su materia prima por segunda vez.</p></div>';
  return '<form class="line" data-recipe="'+esc(l.recipe_id)+'" data-line="'+l.line_number+'"><h3>'+esc(l.ingredient_name)+' <span>'+esc(l.required_quantity+" "+l.required_unit)+' por receta</span></h3><div class="line-grid"><label>SKU de inventario<select name="sku" required>'+skuOptions(l.candidate_inventory_code||"")+'</select></label><label>Equivalencia: '+esc(l.required_unit)+' / 1 unidad de almacén<input name="factor" type="number" min="0.000001" step="any" value="'+esc(l.quantity_per_inventory_unit??"")+'" required placeholder="Ej. 1000"></label><label>Estado<select name="state"><option value="candidate" '+(l.mapping_status==="verified"?"":"selected")+'>Propuesta sin validar</option><option value="verified" '+(l.mapping_status==="verified"?"selected":"")+'>Confirmado tras comprobar</option></select></label><button>Guardar</button></div><p class="flag '+(l.mapping_status==="verified"?"ok":"")+'">'+(l.mapping_status==="verified"?"Confirmado":l.mapping_status==="candidate"?"SKU sugerido, no aprobado":"Sin asignación")+'</p></form>';
 }).join("")+'</div>').join("");
 const active=lines.filter(l=>l.recipe_id==="REC-045"&&!l.subrecipe_id);
 const linked=active.filter(l=>l.candidate_inventory_code).length;
 const converted=active.filter(l=>l.mapping_status==="verified"&&l.conversion_status==="verified"&&Number(l.quantity_per_inventory_unit)>0).length;
 const priced=active.filter(l=>{const item=items.find(i=>i.code===l.candidate_inventory_code);return item&&Number(item.unit_cost)>0&&item.unit_cost_source}).length;
 $("rec045-cost-summary").innerHTML='<span>'+linked+'/'+active.length+' SKU identificados</span><span>'+converted+'/'+active.length+' equivalencias verificadas</span><span>'+priced+'/'+active.length+' costos con fuente registrada</span>';
 $("cost-sku").innerHTML=skuOptions();
}
async function load(){
 if(await FillerCloud.staffRole()!=="admin"){$("login").hidden=false;$("private").hidden=true;return}
 $("login").hidden=true;$("private").hidden=false;
 [recipes,lines,items]=await Promise.all([
 api("fiiller_recipe_costing?select=recipe_id,recipe_name,recipe_type,yield_quantity,yield_unit,yield_verified&status=eq.confirmed&order=recipe_id.asc"),
 api("fiiller_recipe_costing_lines?select=recipe_id,line_number,ingredient_name,required_quantity,required_unit,subrecipe_id,candidate_inventory_code,mapping_status,conversion_status,quantity_per_inventory_unit&order=recipe_id.asc,line_number.asc"),
 api("filler_inventory_items?select=code,name,unit,unit_cost,unit_cost_source&order=name.asc&limit=1000")
 ]);
 items=items.filter(x=>x.code);render()
}
$("recipe-lines").addEventListener("submit",async e=>{
 const form=e.target.closest("form[data-recipe]");if(!form)return;e.preventDefault();
 const recipe=form.dataset.recipe,line=Number(form.dataset.line),sku=form.elements.sku.value,factor=Number(form.elements.factor.value),state=form.elements.state.value;
 if(!items.some(x=>x.code===sku)||!Number.isFinite(factor)||factor<=0){msg("global-message","Selecciona un SKU válido y su equivalencia positiva.",true);return}
 const b=form.querySelector("button");b.disabled=true;
 try{
  await api("fiiller_recipe_costing_lines?recipe_id=eq."+encodeURIComponent(recipe)+"&line_number=eq."+line,{method:"PATCH",body:{candidate_inventory_code:sku,quantity_per_inventory_unit:factor,mapping_status:state,conversion_status:state==="verified"?"verified":"pending"}});
  msg("global-message",state==="verified"?"SKU y equivalencia confirmados para "+recipe+".":"Propuesta guardada para "+recipe+".");
  await load();
 }catch(err){msg("global-message",err.message,true)}finally{b.disabled=false}
});
$("yield-form").addEventListener("submit",async e=>{
 e.preventDefault();const qty=Number($("yield-qty").value),confirmed=$("yield-confirm").value==="yes";if(!(qty>0)){msg("yield-status","Ingresa un rendimiento positivo.",true);return}
 const b=e.target.querySelector("button");b.disabled=true;
 try{await api("fiiller_recipe_costing?recipe_id=eq.SUB-002",{method:"PATCH",body:{yield_quantity:qty,yield_verified:confirmed,updated_at:new Date().toISOString()}});await load();msg("yield-status",confirmed?"Rendimiento físico registrado.":"Estimación guardada, sin verificación.")}catch(err){msg("yield-status",err.message,true)}finally{b.disabled=false}
});
$("cost-form").addEventListener("submit",async e=>{
 e.preventDefault();const sku=$("cost-sku").value,value=Number($("cost-value").value),source=$("cost-source").value.trim();if(!items.some(x=>x.code===sku)||!(value>0)||!source){msg("cost-message","Selecciona SKU, costo positivo y fuente verificable.",true);return}
 const b=e.target.querySelector("button");b.disabled=true;
 try{
  await api("filler_inventory_items?code=eq."+encodeURIComponent(sku),{method:"PATCH",body:{unit_cost:value,unit_cost_source:source,unit_cost_verified_at:new Date().toISOString()}});
  msg("cost-message","Costo de "+sku+" registrado con fuente comprobable. No se modificaron existencias.");
  await load();
 }catch(err){msg("cost-message",err.message,true)}finally{b.disabled=false}
});
$("login-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.target.querySelector("button");b.disabled=true;try{await FillerCloud.login("admin",e.target.elements.password.value);await load()}catch(err){alert(err.message)}finally{b.disabled=false}});
load().catch(e=>msg("global-message",e.message,true));
})();