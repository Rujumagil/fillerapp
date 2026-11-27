/* Fiiller Café · Acciones rápidas de horario, accesibilidad y PWA. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const date=$("pickup-date"),time=$("pickup-time"),buttons=$("fiiller-schedule-chips");
if(!date||!time||!buttons)return;
const quick=[...buttons.querySelectorAll("[data-pickup-delay]")];
const scheduled=buttons.querySelector("[data-pickup-schedule]");
function optionFor(delay){
 return [...time.options].find(option=>Number(option.dataset.quickDelay)===Number(delay)&&option.dataset.quickDelay!=="");
}
function update(){
 const tomorrow=date.value==="tomorrow";
 for(const btn of quick){
  const opt=tomorrow?null:optionFor(btn.dataset.pickupDelay);
  btn.disabled=!opt;
  btn.setAttribute("aria-pressed",String(Boolean(opt&&time.value===opt.value)));
  if(opt)btn.title="Recoger a las "+opt.label;
  else btn.title=tomorrow?"Los atajos aplican únicamente a hoy":"Este horario ya no está disponible";
 }
 if(scheduled)scheduled.setAttribute("aria-pressed",String(tomorrow || !quick.some(btn=>btn.getAttribute("aria-pressed")==="true")));
}
buttons.addEventListener("click",event=>{
 const btn=event.target.closest("button");
 if(!btn)return;
 if(btn.matches("[data-pickup-delay]")){
  if(date.value!=="today"){
   date.value="today";
   date.dispatchEvent(new Event("change",{bubbles:true}));
  }
  renderPickupTimes();
  const option=optionFor(btn.dataset.pickupDelay);
  if(!option){update();return;}
  time.value=option.value;
  time.dispatchEvent(new Event("change",{bubbles:true}));
  update();
 }else if(btn.matches("[data-pickup-schedule]")){
  renderPickupTimes();
  if(time.disabled && date.value==="today"){
   date.value="tomorrow";
   date.dispatchEvent(new Event("change",{bubbles:true}));
   renderPickupTimes();
  }
  update();
  time.focus({preventScroll:false});
 }
});
window.addEventListener("fiiller:pickup-options-updated",update);
date.addEventListener("change",update);
time.addEventListener("change",update);
window.addEventListener("pageshow",update);
update();
const installer=$("fiiller-install-footer");
function refreshInstall(){
 if(!installer)return;
 installer.hidden=window.matchMedia("(display-mode: standalone)").matches||
  window.navigator.standalone===true||window.matchMedia("(display-mode: fullscreen)").matches;
}
refreshInstall();
window.addEventListener("appinstalled",refreshInstall);
window.matchMedia("(display-mode: standalone)").addEventListener?.("change",refreshInstall);
// Complemento de accesibilidad para controles visuales externos al checkout.
document.querySelectorAll('a[href*="wa.me/"],a[href*="api.whatsapp.com/"]').forEach(link=>{
 if(!link.hasAttribute("aria-label"))link.setAttribute("aria-label","Contactar a Fiiller Café por WhatsApp");
});
})();