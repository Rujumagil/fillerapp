/* Fiiller Café · navegación de catálogo tipo app (sin alterar pedidos ni datos).
 * El catálogo permanece en Supabase; estas vistas son solamente presentación.
 */
(()=>{
 "use strict";
 let view="home";
 let visible=8;
 const pageSize=8;
 const $=id=>document.getElementById(id);
 const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const labels={
   "De la plancha":"Desayunos","Sándwiches y más":"Sándwiches",
   "Bebidas calientes":"Café","Bebidas frías":"Bebidas preparadas",
   "Frutas y bowls":"Fruta y bowls","Panadería":"Panadería",
   "Ensaladas":"Ensaladas","Galletas y repostería":"Repostería",
   "Bebidas embotelladas":"Bebidas embotelladas","Botanas y dulces":"Botanas"
 };
 const icons={
   "Todos":"✦","De la plancha":"🍳","Sándwiches y más":"🥪",
   "Bebidas calientes":"☕","Bebidas frías":"🥤",
   "Ensaladas":"🥗","Frutas y bowls":"🍓","Panadería":"🥐",
   "Galletas y repostería":"🍪","Bebidas embotelladas":"🧃",
   "Botanas y dulces":"🍫"
 };
 function updateHead(){
   const heading=$("fiiller-catalog-heading"),sub=$("fiiller-catalog-subtitle"),all=$("fiiller-view-all");
   const searching=Boolean($("filler-product-search")?.value.trim());
   if(!heading||!sub||!all)return;
   const title=searching?"Resultados de búsqueda":view==="favorites"?"Mis favoritos":
      view==="category"?(labels[state.category]||state.category):
      view==="menu"?"Menú de preparados":"Preparados destacados";
   heading.textContent=title;
   sub.textContent=searching?"Encuentra exactamente lo que buscas.":
     view==="favorites"?"Tus productos guardados para pedir más rápido.":
     view==="category"?"Elige tu favorito, personalízalo y recógelo sin hacer fila.":
     view==="menu"?"Explora nuestras especialidades, sin recorrer un catálogo interminable.":
     "Nuestros favoritos de cocina, listos para ti.";
   all.hidden=view!=="home"||searching;
 }
 function updateNav(){
   document.querySelectorAll("[data-fiiller-view]").forEach(el=>{
     const active=el.dataset.fiillerView===view;
     el.classList.toggle("is-active",active);
     if(active)el.setAttribute("aria-current","page");
     else el.removeAttribute("aria-current");
   });
 }
 function setView(next,{scroll=true,renderNow=true}={}){
   if(!["home","menu","category","favorites"].includes(next))return;
   view=next;
   visible=pageSize;
   if(next!=="category")state.category="Todos";
   updateHead();updateNav();
   if(renderNow&&typeof render==="function")render();
   if(scroll){
     const target=next==="home"?$("inicio"):$("comprar-rapido");
     target?.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
   }
 }
 function more(){
   visible+=pageSize;
   if(typeof renderMenu==="function")renderMenu();
 }
 const api=Object.freeze({
   getView:()=>view,
   setView,
   getVisibleCount:()=>visible,
   pageSize,
   loadMore:more,
   resetPagination:()=>{visible=pageSize;},
   label:category=>labels[category]||category,
   icon:category=>icons[category]||"🍽️",
   updateHead,
   updateNav
 });
 window.FiillerAppExperience=api;
 document.addEventListener("click",event=>{
   const nav=event.target.closest("[data-fiiller-view]");
   if(nav){
     event.preventDefault();
     if(nav.dataset.fiillerView==="favorites"&&!window.FiillerFavoriteIds?.signedIn()){
       // Se puede consultar la vista; allí se ofrece entrar a Mi Fiiller.
       setView("favorites");
       return;
     }
     setView(nav.dataset.fiillerView);
     return;
   }
   if(event.target.closest("[data-fiiller-view-all]")){
     event.preventDefault();setView("menu");
   }
 });
 window.addEventListener("fiiller:favorites-updated",()=>{
   if(view==="favorites"&&typeof renderMenu==="function")renderMenu();
 });
 window.addEventListener("pageshow",updateNav);
 updateHead();updateNav();
})();
