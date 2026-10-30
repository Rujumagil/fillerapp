/* Fiiller Café: anuncios públicos; jamás modifica precios, carrito o pedidos. */
(()=>{
"use strict";
const base="https://qwxydjotwhniahaovrff.supabase.co";
const key="sb_publishable_17NekbDHp_ssL_Pf-CnqPg_v0acxqn3";
const photosafe=url=>typeof url==="string"&&(/^https:\/\/[^\s]+$/.test(url)||/^assets\/[A-Za-z0-9_./-]+$/.test(url));
function make(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;}
function card(r){
 const article=make("article","fiiller-feature-card");article.setAttribute("data-symbol",r.kind==="promotion"?"☕":"✨");
 if(photosafe(r.image_url)){
   const img=make("img","fiiller-feature-photo");img.src=r.image_url;img.alt=r.title;img.loading="lazy";img.decoding="async";
   img.addEventListener("error",()=>img.remove());article.append(img);article.classList.add("has-photo");
 }
 const body=make("div","fiiller-feature-text"),label=make("span","fiiller-feature-tag",r.eyebrow||(r.kind==="promotion"?"Promoción":"Novedad"));
 const title=make("h3","",r.title),desc=make("p","",r.description||"Descubre más en Fiiller Café.");
 body.append(label,title,desc);article.append(body);
 if(r.kind==="promotion" && typeof r.product_id==="string" && r.product_id){
  const choose=make("button","fiiller-feature-buy","Elegir producto →");
  choose.type="button";
  choose.addEventListener("click",()=>{
    document.dispatchEvent(new CustomEvent("fiiller:promo-product",{detail:{productId:r.product_id}}));
  });
  article.append(choose);
 }else{
  const link=make("a","",r.kind==="promotion"?"Explorar menú →":"Ver menú →");
  link.href="#menu-list";article.append(link);
 }
 return article;
}
async function load(){
 const res=await fetch(base+"/rest/v1/filler_storefront_features?select=kind,title,description,eyebrow,image_url,sort_order,product_id&order=sort_order.asc&limit=18",{
 headers:{apikey:key,Accept:"application/json"},cache:"no-store"});
 if(!res.ok)return;
 const rows=await res.json();if(!Array.isArray(rows))return;
 const promo=rows.filter(x=>x.kind==="promotion"),upcoming=rows.filter(x=>x.kind==="upcoming");
 const promoGrid=document.querySelector("#promociones .fiiller-discovery-grid");
 if(promoGrid){
   const intro=document.querySelector("#promociones .fiiller-discovery-head p");
   if(promo.length){
     promoGrid.replaceChildren(...promo.map(card));
     if(intro)intro.textContent="Descubre las ofertas disponibles en Fiiller Café.";
   }else{
     // Las tarjetas de diseño son ejemplos, no ofertas. Eliminarlas al recibir respuesta válida.
     const empty=make("div","fiiller-promos-empty");
     const heading=make("h3","","Pronto tendremos nuevas Fiiller Promos");
     const description=make("p","","Mientras preparamos las siguientes promociones, puedes pedir tus favoritos del menú.");
     const link=make("a","","Explorar menú →");link.href="#menu-list";
     empty.append(heading,description,link);
     promoGrid.replaceChildren(empty);
     if(intro)intro.textContent="Estamos preparando nuevas sorpresas para ti.";
   }
 }
 const upcomingWrap=document.querySelector("#proximos");
 if(upcomingWrap&&upcoming.length){
   const old=upcomingWrap.querySelector(".fiiller-coming");
   if(old){const grid=make("div","fiiller-discovery-grid");grid.append(...upcoming.map(card));old.replaceWith(grid);}
   const intro=upcomingWrap.querySelector(".fiiller-discovery-head p");if(intro)intro.textContent="Descubre lo nuevo que pronto encontrarás en Fiiller.";
 }
}
load().catch(()=>{/* Las tarjetas editoriales predeterminadas permanecen visibles sin conexión. */});
})();