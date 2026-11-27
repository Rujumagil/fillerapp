/* Fiiller Café · carruseles y microinteracciones v4
 * No reemplaza el render del catálogo, favoritos, extras ni el checkout.
 */
(()=>{
 "use strict";
 const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const $=id=>document.getElementById(id);
 const all=selector=>[...document.querySelectorAll(selector)];
 const queue=new WeakSet();
 let reveals=null;
 function updateSlider(track){
   if(!track?.isConnected)return;
   const items=[...track.children].filter(el=>el.classList.contains("item"));
   if(!items.length)return;
   const left=Math.max(0,track.scrollLeft);
   const end=Math.max(0,track.scrollWidth-track.clientWidth);
   const header=track.closest(".fiiller-slider-section");
   const buttons=[...(header?.querySelectorAll("[data-fiiller-slide]")||[])];
   for(const button of buttons)button.disabled=Number(button.dataset.fiillerSlide)<0?left<=3:left>=end-3;
   let closest=0,dist=Infinity;
   const start=items[0].offsetLeft;
   for(let i=0;i<items.length;i++){
     const distance=Math.abs(items[i].offsetLeft-start-left);
     if(distance<dist){dist=distance;closest=i;}
   }
   const page=all("[data-slider-page]").find(el=>el.dataset.sliderPage===track.id);
   if(page)page.textContent=(closest+1)+" / "+items.length;
   const meter=header?.querySelector(".fiiller-slider-meter-fill");
   if(meter)meter.style.transform="scaleX("+Math.max(.15,Math.min(1,(left+track.clientWidth)/Math.max(track.scrollWidth,1)))+")";
 }
 function schedule(track){
   if(queue.has(track))return;
   queue.add(track);
   requestAnimationFrame(()=>{
     queue.delete(track);
     updateSlider(track);
   });
 }
 function observeReveals(){
   if(reveals){reveals.disconnect();reveals=null;}
   const targets=all("#menu-list .fiiller-app-family, .fiiller-highlights");
   if(reduced()||typeof IntersectionObserver==="undefined"){
     document.documentElement.classList.remove("fiiller-motion-ready");
     targets.forEach(el=>el.classList.add("is-visible"));
     return;
   }
   document.documentElement.classList.add("fiiller-motion-ready");
   reveals=new IntersectionObserver(entries=>{
     for(const entry of entries){
       if(entry.isIntersecting){
         entry.target.classList.add("is-visible");
         reveals?.unobserve(entry.target);
       }
     }
   },{threshold:.06,rootMargin:"30px 0px 0px 0px"});
   targets.forEach(el=>{
     el.classList.add("fiiller-reveal");
     reveals.observe(el);
   });
 }
 function refresh(){
   for(const track of all('#menu-list [data-fiiller-slider="true"]')){
     if(!track.dataset.motionBound){
       track.dataset.motionBound="true";
       track.addEventListener("scroll",()=>schedule(track),{passive:true});
       track.addEventListener("keydown",event=>{
         if(event.target!==track||!["ArrowLeft","ArrowRight"].includes(event.key))return;
         event.preventDefault();
         move(track,event.key==="ArrowRight"?1:-1);
       });
     }
     const header=track.closest(".fiiller-slider-section");
     if(header&&!header.querySelector(".fiiller-slider-meter")){
       const meter=document.createElement("div");
       meter.className="fiiller-slider-meter";
       meter.setAttribute("aria-hidden","true");
       const fill=document.createElement("span");
       fill.className="fiiller-slider-meter-fill";
       meter.append(fill);
       track.after(meter);
     }
     schedule(track);
   }
   observeReveals();
 }
 function move(track,direction){
   if(!track)return;
   const first=track.querySelector(".item");
   const width=first?.getBoundingClientRect().width||track.clientWidth*.72;
   const gap=parseFloat(window.getComputedStyle(track).columnGap)||10;
   const step=Math.max(1,width+gap);
   track.scrollBy({left:direction*step,behavior:reduced()?"instant":"smooth"});
 }
 document.addEventListener("click",event=>{
   const arrow=event.target.closest("[data-fiiller-slide]");
   if(arrow){
     event.preventDefault();
     if(arrow.disabled)return;
     const track=$(arrow.dataset.trackId);
     if(track?.matches('[data-fiiller-slider="true"]'))move(track,Number(arrow.dataset.fiillerSlide));
     return;
   }
   const chip=event.target.closest("#fiiller-quick-categories [data-quick-category]");
   if(chip)requestAnimationFrame(()=>chip.scrollIntoView({
     behavior:reduced()?"instant":"smooth",block:"nearest",inline:"center"
   }));
 });
 let lastQty=null;
 const count=$("bubble-count");
 const countNumber=text=>{const n=parseInt(String(text||"").replace(/\D.*$/,""),10);return Number.isFinite(n)?n:0;};
 if(count && typeof MutationObserver!=="undefined"){
   lastQty=countNumber(count.textContent);
   const nav=$("filler-nav-cart-count"),bubble=$("order-bubble");
   const observer=new MutationObserver(()=>{
     const current=countNumber(count.textContent);
     if(current>lastQty&&!reduced()){
       for(const element of [nav,bubble].filter(Boolean)){
         element.classList.remove("fiiller-bump");
         // Reiniciar la animación solo si el contador subió.
         void element.offsetWidth;
         element.classList.add("fiiller-bump");
       }
     }
     lastQty=current;
   });
   observer.observe(count,{childList:true,characterData:true,subtree:true});
   for(const element of [nav,bubble].filter(Boolean)){
     element.addEventListener("animationend",()=>element.classList.remove("fiiller-bump"));
   }
 }
 window.addEventListener("fiiller:menu-rendered",refresh);
 window.addEventListener("resize",()=>all('#menu-list [data-fiiller-slider="true"]').forEach(schedule),{passive:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",refresh,{once:true});
 else refresh();
})();
