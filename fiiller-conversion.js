/* Fiiller Café · Compra rápida v1.
 * Aprovecha catálogo, extras, carrito y checkout oficiales. No crea pedidos ni cambia precios.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const search=$("filler-product-search"),clear=$("filler-clear-search"),categories=$("fiiller-quick-categories");
const status=$("fiiller-shop-search-status");
const menu=$("menu-list"),cart=$("filler-cart"),cartLines=$("cart-lines");
if(!search||!clear||!categories||!menu||!cart||!cartLines)return;
const clean=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").trim();
const unit=n=>Number(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:2});
let lastCategories="",syncing=false;
const currentProducts=()=>Array.isArray(state?.menu)?state.menu:[];
const allowed=p=>{
 if(!p||!Number.isFinite(Number(p.stock))||Number(p.stock)<=0)return false;
 if(typeof fiillerMenuPermitido==="function"&&!fiillerMenuPermitido(p))return false;
 if(window.FiillerAvailability?.isChickenProduct?.(p))return false;
 // Las recomendaciones no reactivan campañas ni productos temporalmente retirados.
 const name=clean(p.name),cat=clean(p.cat||p.category);
 if(/chilaquiles|\btortas?\b|\blonches?\b/.test(name+" "+cat))return false;
 return Number.isFinite(Number(p.price))&&Number(p.price)>=0;
};
const categoryLabels=["Bebidas calientes","Bebidas frías","De la plancha","Sándwiches y más","Panadería","Bebidas embotelladas","Frutas y bowls"];
function availableCategories(){
 const types=new Set(currentProducts().filter(allowed).map(x=>String(x.cat||"")));
 return ["Todos",...categoryLabels.filter(x=>types.has(x))];
}
function drawCategories(){
 const available=availableCategories();
 const signature=available.join("|");
 if(lastCategories!==signature){
  categories.replaceChildren(...available.map(category=>{
   const button=document.createElement("button");
   button.type="button";button.textContent=category;button.dataset.quickCategory=category;
   button.setAttribute("aria-pressed","false");
   return button;
  }));
  lastCategories=signature;
 }
 categories.querySelectorAll("[data-quick-category]").forEach(button=>
  button.setAttribute("aria-pressed",String(state.category===button.dataset.quickCategory))
 );
}
function updateSearchStatus(){
 const query=search.value.trim();
 const count=menu.querySelectorAll(".item").length;
 const loading=!window.FillerOnlineActive;
 status.textContent=loading?"Verificando el menú disponible…":
   query?(count?count+" opción"+(count===1?"":"es")+" para «"+query.slice(0,40)+"».":"No encontramos ese producto. Prueba otra palabra o categoría."):
   state.category==="Todos"?"Elige una categoría o busca por nombre para pedir más rápido.":
   "Mostrando "+state.category+". Selecciona un producto para personalizarlo.";
}
function gotoMenu(){
 const section=$("pedido")||menu;
 section.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
categories.addEventListener("click",e=>{
 const chip=e.target.closest("[data-quick-category]");
 if(!chip)return;
 const cat=chip.dataset.quickCategory;
 if(!availableCategories().includes(cat))return;
 state.category=cat;
 if(search.value){
  search.value="";
  search.dispatchEvent(new Event("input",{bubbles:true}));
 }
 render();
 gotoMenu();
});
search.addEventListener("input",()=>{
 // El buscador explora todo el menú, no únicamente la categoría previa.
 if(search.value.trim()&&state.category!=="Todos"){state.category="Todos";render();}
 drawCategories();updateSearchStatus();
});
search.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();gotoMenu();}});
clear.addEventListener("click",()=>{updateSearchStatus();drawCategories();});

const note=document.createElement("div");
note.className="fiiller-empty-cart-note";
const title=document.createElement("strong");
title.textContent="Tu próximo antojo empieza en el menú";
const explanation=document.createElement("span");
explanation.textContent="Agrega un producto para elegir la hora de recolección y confirmar tus datos.";
const link=document.createElement("a");
link.href="#comprar-rapido";link.textContent="Explorar productos";
link.addEventListener("click",()=>{
 if(document.body.classList.contains("filler-cart-open"))window.closeFillerCart?.();
});
note.append(title,explanation,link);
cartLines.after(note);

const upsell=document.createElement("section");
upsell.className="fiiller-cart-upsell";upsell.hidden=true;
upsell.setAttribute("aria-label","Productos para complementar tu pedido");
cartLines.after(upsell);
function currentCart(){
 const lines=typeof cartItems==="function"?cartItems():[];
 return Array.isArray(lines)?lines:[];
}
function suggestions(){
 if(!window.FillerOnlineActive)return [];
 const cartProducts=currentCart();
 if(!cartProducts.length)return [];
 const chosen=new Set(cartProducts.map(p=>String(p.id)));
 const beverage=cartProducts.some(p=>/bebidas?|frapp|cafe|chocolate|jugo/.test(clean((p.cat||"")+" "+p.name)));
 const preferred=beverage?["Panadería","Galletas y repostería","De la plancha","Sándwiches y más"]:
  ["Bebidas calientes","Bebidas frías","Bebidas embotelladas","Panadería"];
 const options=currentProducts().filter(p=>allowed(p)&&!chosen.has(String(p.id)));
 options.sort((a,b)=>{
  const rank=p=>{const at=preferred.indexOf(p.cat);return at<0?999:at;};
  return rank(a)-rank(b)||String(a.name).localeCompare(String(b.name),"es");
 });
 return options.slice(0,2);
}
function drawSuggestions(){
 const offers=suggestions();
 upsell.hidden=offers.length===0;
 upsell.replaceChildren();
 if(!offers.length)return;
 const heading=document.createElement("h3");
 heading.textContent="¿Quieres complementar tu pedido?";
 const subtitle=document.createElement("p");
 subtitle.textContent="Estas opciones están en el menú actual. Puedes añadirlas si te apetecen.";
 upsell.append(heading,subtitle);
 for(const p of offers){
  const row=document.createElement("div");row.className="fiiller-cart-upsell-item";
  const details=document.createElement("span");
  const label=document.createElement("strong");label.textContent=String(p.name||"Producto");
  const price=document.createElement("small");price.textContent=unit(p.price)+" · "+String(p.cat||"");
  details.append(label,price);
  const add=document.createElement("button");add.type="button";add.textContent="+ Añadir";
  add.setAttribute("aria-label","Añadir "+p.name+" a mi pedido");
  add.addEventListener("click",()=>{
   if(!window.FillerOnlineActive){toast("Estamos comprobando el menú. Intenta nuevamente.");return;}
   const fresh=currentProducts().find(item=>String(item.id)===String(p.id));
   if(!allowed(fresh)){toast("Este producto ya no está disponible.");drawSuggestions();return;}
   // Misma ruta que utiliza el catálogo: respeta extras, tamaño y validación de existencias.
   addToCart(fresh.id);
  });
  row.append(details,add);upsell.append(row);
 }
}
if(typeof renderCart==="function"){
 const original=renderCart;
 renderCart=function(...args){
  const result=original.apply(this,args);
  drawSuggestions();
  return result;
 };
}
if(typeof render==="function"){
 const original=render;
 render=function(...args){
  const result=original.apply(this,args);
  drawCategories();
  updateSearchStatus();
  return result;
 };
}
drawCategories();
updateSearchStatus();
drawSuggestions();
})();
