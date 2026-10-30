/* Fiiller Café: editor protegido por Supabase RLS. */
(()=>{
"use strict";
const BASE="https://qwxydjotwhniahaovrff.supabase.co";
const KEY="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const TABLE="filler_storefront_features";
const $=id=>document.getElementById(id), form=$("feature-form");
let records=[];
function message(s,error=false){$("message").textContent=s;$("message").classList.toggle("error",error);}
function session(){try{return JSON.parse(sessionStorage.getItem("filler_staff_session_v1")||"null")}catch{return null}}
async function api(path,{method="GET",body}={}){
 const token=session()?.access_token;
 if(!token)throw Error("Sesión no disponible. Inicia sesión nuevamente.");
 const res=await fetch(BASE+"/rest/v1/"+path,{method,headers:{apikey:KEY,Authorization:"Bearer "+token,Accept:"application/json",...(body!==undefined?{"Content-Type":"application/json",Prefer:"return=representation"}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(data?.message||"No se pudo completar la operación ("+res.status+").");
 return data;
}
function imageAllowed(url){return !url||/^https:\/\/[^\s]+$/.test(url)||/^assets\/[A-Za-z0-9_./-]+$/.test(url)}
let catalogProducts=[];
async function loadCatalog(){
 const products=await FillerCloud.catalog();
 catalogProducts=(products||[]).filter(x=>Number(x.stock)>0).sort((a,b)=>String(a.cat).localeCompare(String(b.cat),"es")||String(a.name).localeCompare(String(b.name),"es"));
 const select=form.elements.product_id,prior=select.value;
 select.replaceChildren(new Option("Sin producto vinculado · anuncio informativo",""));
 for(const p of catalogProducts){
  select.add(new Option(p.cat+" · "+p.name+" · $"+Number(p.price).toFixed(2)+" · "+p.stock+" disp.",p.id));
 }
 if(catalogProducts.some(p=>p.id===prior))select.value=prior;
}
function toggleProductField(){
 const active=form.elements.kind.value==="promotion";
 $("feature-product-field").hidden=!active;
 form.elements.product_id.disabled=!active;
 if(!active)form.elements.product_id.value="";
}
form.elements.kind.addEventListener("change",toggleProductField);
function clear(){HTMLFormElement.prototype.reset.call(form);toggleProductField();form.elements.id.value="";form.elements.sort_order.value="100";$("editor-heading").textContent="Nuevo anuncio";preview();}
function preview(){
 const d=new FormData(form),url=String(d.get("image_url")||"").trim();
 $("preview-title").textContent=String(d.get("title")||"").trim()||"Tu nuevo anuncio";
 $("preview-tag").textContent=String(d.get("eyebrow")||"").trim()||"Próximamente";
 $("preview-description").textContent=String(d.get("description")||"").trim()||"Así se mostrará el contenido.";
 const img=$("preview-img");img.classList.toggle("visible",Boolean(url&&imageAllowed(url)));
 if(url&&imageAllowed(url))img.src=url;else img.removeAttribute("src");
}
form.addEventListener("input",preview);form.addEventListener("change",preview);
$("upload-photo").addEventListener("click",async()=>{
 const file=$("image-file").files?.[0],btn=$("upload-photo");
 if(!file){message("Selecciona primero una fotografía.",true);return;}
 const mime={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 if(!mime[file.type]){message("Solo se permiten fotos JPG, PNG o WebP.",true);return;}
 if(file.size>3*1024*1024){message("La fotografía no debe superar 3 MB.",true);return;}
 btn.disabled=true;
 try{
  if(await FillerCloud.staffRole()!=="admin")throw Error("Necesitas acceso de administrador.");
  const token=session()?.access_token;if(!token)throw Error("Inicia sesión otra vez.");
  const name="marketing/"+crypto.randomUUID()+"."+mime[file.type];
  const res=await fetch(BASE+"/storage/v1/object/filler-product-images/"+name,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":file.type,"x-upsert":"false"},body:file});
  if(!res.ok){const err=await res.json().catch(()=>({}));throw Error(err.message||"No fue posible subir la fotografía.");}
  form.elements.image_url.value=BASE+"/storage/v1/object/public/filler-product-images/"+name;
  $("image-file").value="";preview();message("Foto cargada. Guarda el anuncio para vincularla.");
 }catch(e){message(e.message,true)}finally{btn.disabled=false}
});
$("reset").addEventListener("click",clear);$("reload").addEventListener("click",()=>load().catch(e=>message(e.message,true)));
async function load(){
 records=await api(TABLE+"?select=id,kind,title,description,image_url,eyebrow,starts_on,ends_on,sort_order,is_published,product_id,created_at&order=sort_order.asc,created_at.desc&limit=100");
 const list=$("feature-list");list.replaceChildren();
 if(!records.length){list.textContent="Aún no hay anuncios. Crea el primero.";return;}
 for(const r of records){
  const article=document.createElement("article");article.className="item";
  const title=document.createElement("div");title.className="item-title";title.textContent=r.title;
  const info=document.createElement("div");info.className="item-meta";
  info.textContent=(r.kind==="promotion"?"Promoción":"Próximos")+" · "+(r.is_published?"Publicado":"Borrador")+" · Orden "+r.sort_order;
  const dates=document.createElement("div");dates.className="item-meta";dates.textContent=(r.starts_on||"Sin fecha inicial")+" → "+(r.ends_on||"Sin fecha final");
  const actions=document.createElement("div");actions.className="actions";
  const edit=document.createElement("button");edit.type="button";edit.className="secondary";edit.textContent="Editar";edit.addEventListener("click",()=>editRecord(r));
  const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary";toggle.textContent=r.is_published?"Ocultar":"Publicar";toggle.addEventListener("click",()=>togglePublish(r));
  actions.append(edit,toggle);article.append(title,info,dates,actions);list.append(article);
 }
}
function editRecord(r){
 for(const key of ["id","kind","title","description","eyebrow","image_url","starts_on","ends_on","sort_order"])form.elements[key].value=r[key]??"";
 toggleProductField();
 if(r.product_id && !catalogProducts.some(p=>p.id===r.product_id))form.elements.product_id.add(new Option("Producto no disponible: "+r.product_id,r.product_id));
 form.elements.product_id.value=r.product_id||"";
 form.elements.is_published.checked=Boolean(r.is_published);
 $("editor-heading").textContent="Editar anuncio";preview();form.scrollIntoView({behavior:"smooth",block:"start"});
}
async function togglePublish(r){
 if(!window.confirm((r.is_published?"Ocultar":"Publicar")+" «"+r.title+"»?"))return;
 try{await api(TABLE+"?id=eq."+encodeURIComponent(r.id),{method:"PATCH",body:{is_published:!r.is_published,updated_at:new Date().toISOString()}});await load();message("Visibilidad actualizada.");}
 catch(e){message(e.message,true);}
}
form.addEventListener("submit",async e=>{
 e.preventDefault();const button=$("save");button.disabled=true;
 try{
  if(await FillerCloud.staffRole()!=="admin")throw Error("Acceso exclusivo para administración.");
  const d=new FormData(form);
  const url=String(d.get("image_url")||"").trim(),start=d.get("starts_on")||null,end=d.get("ends_on")||null;
  if(!imageAllowed(url))throw Error("La foto debe usar https:// o una ruta de assets/.");
  if(start&&end&&end<start)throw Error("La fecha final debe ser posterior a la inicial.");
  const data={kind:d.get("kind"),title:String(d.get("title")||"").trim(),eyebrow:String(d.get("eyebrow")||"").trim(),description:String(d.get("description")||"").trim(),image_url:url||null,starts_on:start,ends_on:end,sort_order:Number(d.get("sort_order")),is_published:form.elements.is_published.checked,updated_at:new Date().toISOString()};
  const productId=d.get("kind")==="promotion" ? String(d.get("product_id")||"") : "";
  if(productId&&!catalogProducts.some(p=>p.id===productId))throw Error("Selecciona un producto activo y con existencia.");
  data.product_id=productId||null;
  const id=d.get("id"),user=session()?.user?.id;
  if(id){await api(TABLE+"?id=eq."+encodeURIComponent(id),{method:"PATCH",body:data});}
  else{await api(TABLE,{method:"POST",body:{...data,created_by:user}});}
  clear();await load();message("Anuncio guardado. "+(data.is_published?"Se mostrará cuando esté dentro de sus fechas.":"Permanece como borrador."));
 }catch(err){message(err.message,true)}finally{button.disabled=false}
});
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();const btn=e.currentTarget.querySelector("button");btn.disabled=true;
 try{const fd=new FormData(e.currentTarget);await FillerCloud.login(fd.get("username"),fd.get("password"));await init();}
 catch(err){message(err.message,true)}finally{btn.disabled=false}
});
async function init(){
 const role=await FillerCloud.staffRole(),admin=role==="admin";
 $("login-card").hidden=admin;$("workspace").hidden=!admin;
 if(!admin){message(role?"Tu cuenta no tiene permiso de administración.":"Inicia sesión para administrar anuncios.",!!role);return}
 await loadCatalog();await load();toggleProductField();message("Panel conectado. Puedes crear borradores y publicar anuncios.");
}
init().catch(err=>message(err.message,true));preview();
})();