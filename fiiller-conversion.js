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
const categoryLabels=[
 {label:"Desayunos",value:"De la plancha"},
 {label:"Sándwiches",value:"Sándwiches y más"},
 {label:"Café",value:"Bebidas calientes"},
 {label:"Bebidas preparadas",value:"Bebidas frías"},
 {label:"Ensaladas",value:"Ensaladas"},
 {label:"Fruta y bowls",value:"Frutas y bowls"},
 {label:"Panadería",value:"Panadería"},
 {label:"Repostería",value:"Galletas y repostería"},
 {label:"Bebidas embotelladas",value:"Bebidas embotelladas"},
 {label:"Botanas y dulces",value:"Botanas y dulces"}
];
function availableCategories(){
 const types=new Set(currentProducts().filter(allowed).map(x=>String(x.cat||"")));
 return [...categoryLabels.filter(x=>types.has(x.value)),{label:"Ver todo",value:"Todos"}];
}
const fiillerIconPaths={
 "Todos":"M12 2v20 M2 12h20 M5 5l14 14 M19 5L5 19",
 "De la plancha":"M3 10a7 7 0 1 0 14 0 7 7 0 1 0-14 0 M15 15l6 6 M7 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
 "Sándwiches y más":"M2 10l10-7 10 7-10 7z M2 14l10 7 10-7 M5 13l4-2 4 2 5-2",
 "Bebidas calientes":"M3 7h14v7a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z M17 8h2a3 3 0 0 1 0 6h-2 M7 2v2 M12 2v2",
 "Bebidas frías":"M6 7h12l-2 14H8z M4 7h16 M12 7l2-5h4 M9 12h6",
 "Ensaladas":"M3 12h18a9 9 0 0 1-18 0 M7 12C2 4 10 3 12 12 M12 12C11 3 21 3 17 12",
 "Frutas y bowls":"M12 7c-8-7-14 6 0 15C26 13 20 0 12 7 M12 7l-3-5 M12 7l4-5 M8 11v1 M16 11v1 M12 15v1",
 "Panadería":"M3 17C0 7 8 2 12 7c4-5 12 0 9 10l-5-3-4 4-4-4z M8 5l2 9 M16 5l-2 9",
 "Galletas y repostería":"M20 8a9 9 0 1 1-9-5 5 5 0 0 0 9 5 M7 11h.1 M12 8h.1 M12 16h.1 M17 14h.1",
 "Bebidas embotelladas":"M9 3h6v5l3 4v9H6v-9l3-4z M9 3V1h6v2 M6 14h12",
 "Botanas y dulces":"M5 3h14v18H5z M5 9h14 M5 15h14 M12 3v18"
};
function fiillerCategoryIcon(value){
 const ns="http://www.w3.org/2000/svg";
 const svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");
 const path=document.createElementNS(ns,"path");path.setAttribute("d",fiillerIconPaths[value]||fiillerIconPaths.Todos);svg.append(path);return svg;
}

function drawCategories(){
 const available=availableCategories();
 const signature=available.map(x=>x.value).join("|");
 if(lastCategories!==signature){
  categories.replaceChildren(...available.map(category=>{
   const button=document.createElement("button");
   button.type="button";button.dataset.quickCategory=category.value;
   const symbol=document.createElement("span");symbol.className="fiiller-cat-icon";
   symbol.setAttribute("aria-hidden","true");
   symbol.append(fiillerCategoryIcon(category.value));
   const text=document.createElement("span");text.className="fiiller-cat-name";text.textContent=category.label;
   button.append(symbol,text);
   button.setAttribute("aria-label","Mostrar "+category.label);
   button.setAttribute("aria-pressed","false");
   return button;
  }));
  lastCategories=signature;
 }
 categories.querySelectorAll("[data-quick-category]").forEach(button=>
  button.setAttribute("aria-pressed",String(state.category===button.dataset.quickCategory && (button.dataset.quickCategory!=="Todos" || window.FiillerAppExperience?.getView()==="home")))
 );
}
function updateSearchStatus(){
 const query=search.value.trim();
 const count=menu.querySelectorAll(".item").length;
 const loading=!window.FillerOnlineActive;
 status.textContent=loading?"Verificando el menú disponible…":
   query?(count?count+(count===1?" opción":" opciones")+" para «"+query.slice(0,40)+"».":"No encontramos ese producto. Prueba otra palabra o categoría."):
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
 if(!availableCategories().some(c=>c.value===cat))return;
 if(search.value){
  search.value="";
  search.dispatchEvent(new Event("input",{bubbles:true}));
 }
 state.category=cat;
 window.FiillerAppExperience?.setView(cat==="Todos"?"home":"category",{scroll:false,renderNow:false});
 render();
 gotoMenu();
});
search.addEventListener("input",()=>{
 // El buscador explora todo el menú, no únicamente la categoría previa.
 if(search.value.trim()){
   state.category="Todos";
   window.FiillerAppExperience?.setView("menu",{scroll:false,renderNow:false});
   renderMenu();
 }
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
link.href="#comprar-rapido";link.textContent="Explorar el menú";
link.addEventListener("click",event=>{
 event.preventDefault();
 window.closeFillerCart?.(true);
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
 const priority=window.FiillerMenuPriority;
 const isRetail=p=>priority?.isComplementProduct(p)===true;
 const chosen=new Set(cartProducts.map(p=>String(p.id)));
 const preparedInCart=cartProducts.some(p=>!isRetail(p));
 const hasPreparedDrink=cartProducts.some(p=>!isRetail(p)&&
   /bebidas calientes|bebidas frias|frapp|cafe|chocolate|jugo/.test(clean((p.cat||"")+" "+p.name)));
 const preferred=hasPreparedDrink
   ? ["Panadería","De la plancha","Sándwiches y más","Frutas y bowls","Ensaladas","Galletas y repostería"]
   : ["Bebidas calientes","Bebidas frías","De la plancha","Sándwiches y más","Panadería","Frutas y bowls"];
 const available=currentProducts().filter(p=>allowed(p)&&!chosen.has(String(p.id)));
 const prepared=available.filter(p=>!isRetail(p));
 const retail=available.filter(isRetail);
 const compare=(a,b)=>{
  const rank=p=>{const i=preferred.indexOf(p.cat);return i<0?999:i;};
  return rank(a)-rank(b)||String(a.name).localeCompare(String(b.name),"es");
 };
 prepared.sort(compare);
 retail.sort((a,b)=>String(a.name).localeCompare(String(b.name),"es"));
 // Una oferta preparada primero; el retail ocupa solo la segunda sugerencia.
 if(preparedInCart){
  const first=prepared.slice(0,1),second=retail.slice(0,1);
  return [...first,...second,...prepared.slice(first.length,first.length+(second.length?0:1))].slice(0,2);
 }
 // Si el cliente solo eligió un producto empaquetado, invitarlo a probar cocina.
 return prepared.slice(0,2);
}

function drawSuggestions(){
 const offers=suggestions();
 upsell.hidden=offers.length===0;
 upsell.replaceChildren();
 if(!offers.length)return;
 const heading=document.createElement("h3");
 heading.textContent=currentCart().some(p=>window.FiillerMenuPriority?.isComplementProduct(p)!==true)
  ? "¿Le agregamos algo para acompañar?" : "¿Qué te preparamos para acompañarlo?";
 const subtitle=document.createElement("p");
 subtitle.textContent="Primero nuestros preparados; bebidas y botanas empaquetadas como extras opcionales.";
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
