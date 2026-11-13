/* Fiiller Café · Disponibilidad temporal del menú.
   Pollo habilitado; chilaquiles verdes deshabilitados.
   No borra recetas ni historial y no modifica existencias físicas en Supabase. */
(function(){
  "use strict";
  const CHICKEN_UNAVAILABLE = false;
  const GREEN_CHILAQUILES_UNAVAILABLE = true;
  const norm = v => String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const chickenProducts = new Set(["club-sandwich","tpvs027","tpv027"]);
  function isChickenProduct(p){
    if(!CHICKEN_UNAVAILABLE || !p)return false;
    const id=norm(p.id), name=norm(p.name);
    return chickenProducts.has(id) || /pollo|pechuga\s+de\s+pollo/.test(id+" "+name) ||
      (/\bclub\b/.test(name) && /sandwich|sandwiches|sandwichs/.test(name));
  }
  function isChickenExtra(e){
    return CHICKEN_UNAVAILABLE && /pollo|pechuga\s+de\s+pollo/.test(norm(e?.id)+" "+norm(e?.name));
  }
  function isGreenChilaquiles(p){
    if(!GREEN_CHILAQUILES_UNAVAILABLE || !p)return false;
    const id=norm(p.id), name=norm(p.name), cat=norm(p.cat);
    return /^verdes(?:-|$)/.test(id) || (/chilaquiles/.test(name+" "+cat) && /\bverdes?\b|salsa verde/.test(name));
  }
  window.FiillerAvailability=Object.freeze({
    isChickenProduct, isChickenExtra, isGreenChilaquiles,
    applyProducts:items=>(items||[]).map(p=>(isChickenProduct(p)||isGreenChilaquiles(p))?{...p,stock:0,temporarilyUnavailable:true}:p),
    applyExtras:items=>(items||[]).filter(e=>!isChickenExtra(e))
  });
})();
