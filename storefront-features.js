/* Fiiller Café · Promociones y lanzamientos reales.
 * Ningún anuncio genérico se publica sin registro vigente y artículo disponible.
 */
(()=>{
"use strict";
const endpoint="https://qwxydjotwhniahaovrff.supabase.co/rest/v1/filler_storefront_features";
const key="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const $=id=>document.getElementById(id);
const promoSection=$("promociones"),comingSection=$("proximos");
if(!promoSection||!comingSection)return;
promoSection.hidden=true;comingSection.hidden=true;
let rows=[],loaded=false,lastSignature="";
const esc=s=>String(s??"").slice(0,200);
const safeImage=url=>typeof url==="string"&&(/^(https:\/\/[^\s"'<>]+|assets\/[A-Za-z0-9_./-]+)$/.test(url));
function make(tag,cls,content){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(content!==undefined)e.textContent=esc(content);
 return e;
}
const currentProducts=()=>Array.isArray(state?.menu)?state.menu:[];
function productFor(promo){
 const id=String(promo.product_id||"");
 if(!id)return null;
 const p=currentProducts().find(item=>String(item.id)===id);
 if(!p||!Number.isFinite(Number(p.price))||!Number.isFinite(Number(p.stock))||Number(p.stock)<=0)return null;
 if(window.FiillerAvailability?.isDiscontinuedProduct?.(p)||window.FiillerAvailability?.isChilaquiles?.(p))return null;
 if(typeof fiillerMenuPermitido==="function"&&!fiillerMenuPermitido(p))return null;
 return p;
}
const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2}).format(Number(n));
function image(r,product){
 const url=safeImage(r.image_url)?r.image_url:(safeImage(product?.image)?product.image:null);
 if(!url)return null;
 const photo=make("img","fiiller-feature-photo");
 photo.src=url;photo.alt="Foto de "+esc(product?.name||r.title);
 photo.loading="lazy";photo.decoding="async";
 return photo;
}
function promoCard(r,p){
 const card=make("article","fiiller-feature-card");
 const photo=image(r,p);
 if(photo){card.append(photo);card.classList.add("has-photo");}
 const body=make("div","fiiller-feature-text");
 const tag=make("span","fiiller-feature-tag","Fiiller Promos");
 const title=make("h3","",r.title||p.name);
 const desc=make("p","",r.description||p.name);
 const price=make("strong","fiiller-promo-price",money(p.price));
 body.append(tag,title,desc,price);
 const add=make("button","fiiller-feature-buy","+ Agregar");
 add.type="button";add.setAttribute("aria-label","Elegir "+p.name+" desde la promoción");
 add.addEventListener("click",()=>{
  const fresh=productFor(r);
  if(!fresh||!window.FillerOnlineActive){
   if(typeof toast==="function")toast("Este producto ya no está disponible.");
   update();return;
  }
  // La misma ruta de menú valida extras, presentaciones, stock y precio en el checkout.
  document.dispatchEvent(new CustomEvent("fiiller:promo-product",{detail:{productId:fresh.id}}));
 });
 card.append(body,add);
 return card;
}
function comingCard(r){
 const card=make("article","fiiller-feature-card");
 const photo=image(r,null);
 if(!photo)return null; // Fecha sin imagen no está expuesta por el esquema actual.
 card.classList.add("has-photo");
 const body=make("div","fiiller-feature-text");
 body.append(make("span","fiiller-feature-tag","Próximamente"),make("h3","",r.title),make("p","",r.description||"Conoce nuestras novedades próximamente."));
 card.append(photo,body);
 return card;
}
function update(){
 if(!loaded||!window.FillerOnlineActive){promoSection.hidden=true;comingSection.hidden=true;return;}
 const validPromos=rows.filter(r=>r.kind==="promotion").map(r=>({r,p:productFor(r)})).filter(x=>x.p);
 const upcoming=rows.filter(r=>r.kind==="upcoming"&&safeImage(r.image_url)).map(comingCard).filter(Boolean);
 const signature=JSON.stringify({promos:validPromos.map(x=>[x.r.product_id,x.r.title,x.p.price,x.p.stock]),upcoming:rows.filter(r=>r.kind==="upcoming"&&safeImage(r.image_url)).map(r=>[r.title,r.image_url])});
 if(signature===lastSignature)return;
 lastSignature=signature;
 const grid=promoSection.querySelector(".fiiller-discovery-grid");
 if(grid)grid.replaceChildren(...validPromos.map(x=>promoCard(x.r,x.p)));
 promoSection.hidden=validPromos.length===0;
 const comingGrid=comingSection.querySelector(".fiiller-discovery-grid");
 const old=comingSection.querySelector(".fiiller-coming");
 if(upcoming.length){
  if(comingGrid)comingGrid.replaceChildren(...upcoming);
  else if(old){const fresh=make("div","fiiller-discovery-grid");fresh.append(...upcoming);old.replaceWith(fresh);}
  comingSection.hidden=false;
 }else comingSection.hidden=true;
}
async function load(){
 try{
  const res=await fetch(endpoint+"?select=kind,title,description,eyebrow,image_url,sort_order,product_id&is_published=eq.true&order=sort_order.asc&limit=18",{
   headers:{apikey:key,Accept:"application/json"},cache:"no-store"
  });
  if(!res.ok)throw Error("Anuncios no disponibles");
  const data=await res.json();
  rows=Array.isArray(data)?data.filter(r=>r&&typeof r.title==="string"):[];
  loaded=true;update();
 }catch{loaded=false;promoSection.hidden=true;comingSection.hidden=true;}
}
window.addEventListener("fiiller:catalog-ready",update);
load();
})();