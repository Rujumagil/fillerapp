/* Fiiller Café · Disponibilidad temporal del menú.
   Pollo habilitado; todas las variedades de chilaquiles deshabilitadas.
   No borra recetas ni historial y no modifica existencias físicas en Supabase. */
(function(){
  "use strict";
  const CHICKEN_UNAVAILABLE = false;
  const CHILAQUILES_UNAVAILABLE = true;
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
    if(!CHILAQUILES_UNAVAILABLE || !p)return false;
    const id=norm(p.id), name=norm(p.name), cat=norm(p.cat);
    return /^verdes(?:-|$)/.test(id) || (/chilaquiles/.test(name+" "+cat) && /\bverdes?\b|salsa verde/.test(name));
  }
  const chilaquilesIds = new Set(["chilaquiles-rojos-sencillos","rojos-con-huevo","rojos-con-pollo","verdes-sencillos","verdes-con-huevo","verdes-con-pollo"]);
  function isChilaquiles(p){
    if(!CHILAQUILES_UNAVAILABLE || !p)return false;
    const id=norm(p.id), name=norm(p.name), cat=norm(p.cat||p.category);
    return chilaquilesIds.has(id) || /chilaquiles/.test(name+" "+cat);
  }
  window.FiillerAvailability=Object.freeze({
    isChickenProduct, isChickenExtra, isGreenChilaquiles, isChilaquiles,
    applyProducts:items=>(items||[]).filter(p=>!isChilaquiles(p)).map(p=>isChickenProduct(p)?{...p,stock:0,temporarilyUnavailable:true}:p),
    applyExtras:items=>(items||[]).filter(e=>!isChickenExtra(e))
  });
})();
