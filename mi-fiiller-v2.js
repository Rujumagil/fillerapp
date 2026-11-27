/* Mi Fiiller V2 · navegación visual, sin duplicar autenticación ni pedidos */
(()=>{
"use strict";
const screens=new Map(["inicio","pedidos","favoritos","cuenta"].map(name=>[name,document.querySelector('[data-mi-screen="'+name+'"]')]));
const nav=document.getElementById("mi-v2-nav");
const member=document.getElementById("member");
if(!nav||!member||[...screens.values()].some(node=>!node))return;
const hashToView={"#mi-inicio":"inicio","#mi-pedidos":"pedidos","#mi-favoritos":"favoritos","#mi-cuenta":"cuenta"};
const viewToHash=Object.fromEntries(Object.entries(hashToView).map(([hash,v])=>[v,hash]));
const reduceMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
let selected="inicio";
function choose(view,{writeHistory=true,focus=false}={}){
 if(!screens.has(view))return;
 selected=view;
 for(const [name,node] of screens)node.hidden=name!==view;
 nav.querySelectorAll("[data-mi-view]").forEach(button=>{
   if(button.dataset.miView===view)button.setAttribute("aria-current","page");
   else button.removeAttribute("aria-current");
 });
 if(writeHistory&&location.hash!==viewToHash[view])history.replaceState(history.state,"",location.pathname+location.search+viewToHash[view]);
 if(focus){
   const destination=screens.get(view)?.querySelector(".mi-v2-screen-head h2, .mi-v2-home-label h3");
   if(destination){
     destination.setAttribute("tabindex","-1");
     destination.focus({preventScroll:true});
   }
   const target=member.getBoundingClientRect().top+window.scrollY-10;
   window.scrollTo({top:Math.max(0,target),behavior:reduceMotion()?"auto":"smooth"});
 }
}
member.addEventListener("click",event=>{
 const button=event.target.closest("[data-mi-view]");
 if(!button)return;
 event.preventDefault();
 choose(button.dataset.miView,{focus:true});
});
window.addEventListener("hashchange",()=>{
 const view=hashToView[location.hash];
 if(view&&member.hidden===false)choose(view,{writeHistory:false,focus:false});
});
window.addEventListener("fiiller:member-ready",()=>{
 document.body.classList.add("mi-v2-authenticated");
 choose(hashToView[location.hash]||selected,{writeHistory:false});
});
window.addEventListener("fiiller:member-logout",()=>{
 document.body.classList.remove("mi-v2-authenticated");
 choose("inicio",{writeHistory:false});
});
window.addEventListener("fiiller:my-favorites-count",event=>{
 const count=document.getElementById("mi-v2-favorites-count");
 if(!count)return;
 const n=Number(event.detail?.count)||0;
 count.textContent=n?n+" producto"+(n===1?"":"s")+" guardado"+(n===1?"":"s"):"Guarda tus productos preferidos";
});
if(!member.hidden)document.body.classList.add("mi-v2-authenticated");
choose(hashToView[location.hash]||"inicio",{writeHistory:false});
window.MiFiillerView=Object.freeze({open:view=>choose(view,{focus:true}),current:()=>selected});
})();
