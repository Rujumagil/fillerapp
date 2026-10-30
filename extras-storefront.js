(function fillerExtrasStorefront() {
  "use strict";
  const catalogKey = "fillerExtras";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const keyToId = key => key.split("::")[0];
  const searchInput=document.getElementById("filler-product-search");
  const searchClear=document.getElementById("filler-clear-search");
  const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let searchQuery="";
  searchInput?.addEventListener("input",()=>{
    searchQuery=normalize(searchInput.value.trim());
    searchClear.hidden=!searchQuery;
    renderMenu();
  });
  searchClear?.addEventListener("click",()=>{
    searchInput.value="";searchQuery="";searchClear.hidden=true;
    renderMenu();searchInput.focus();
  });
  const reserved = id => Object.entries(state.cart).reduce((sum, [key, qty]) => sum + (keyToId(key) === id ? Number(qty || 0) : 0), 0);
  const activeExtras = () => {
    try {
      // En modo compartido, los precios de extras vienen del servidor.
      // No aceptar configuraciones locales diferentes en cada teléfono.
      const cloud = window.FillerCloudExtras;
      const data = Array.isArray(cloud) ? cloud : [];
      return data.filter(e => e && e.enabled === true && e.name && e.price !== null &&
        e.price !== "" && Number.isFinite(Number(e.price)) && Number(e.price) >= 0)
        .map(e => ({ id: String(e.id), name: String(e.name), price: Number(e.price) }));
    } catch { return []; }
  };
  const milkIds = new Set(["fiiller-leche-entera","tpv117","tpv119","tpv118"]);
  const isFiillerCoffee = item => item && /^fiiller-cafe-(8|12|16)$/.test(String(item.id));
  const extrasFor = item => activeExtras().filter(e => isFiillerCoffee(item) ? milkIds.has(e.id) : !milkIds.has(e.id));
  // Ventas netas por artículo del reporte del 1 al 14 de octubre de 2026.
  const featuredSales = [
    {id:"sandwich-pollo",units:78},{id:"verdes-con-pollo",units:47},
    {id:"tpv065",units:46},{id:"tpv021",units:45},
    {id:"rojos-con-pollo",units:42},{id:"tpv013",units:40},
    {id:"jugo-verde-1792010789028-489",units:33},
    {id:"jugo-naranja",units:28},
    {id:"croque-madame-1792010869308-203",units:27}
  ];
  const featuredIds = featuredSales.map(s=>s.id);
  const featuredRank = new Map(featuredSales.map((s,i)=>[s.id,{units:s.units,rank:i+1}]));
  const featuredCategory = "Los más vendidos";
  const eligible = item => item && (isFiillerCoffee(item) || item.allowExtras === true || (item.allowExtras !== false && /chilaquiles|plancha|sandwich|ensalada|mollete|torta|croque|baguette|panini/i.test(item.cat || "")));
  try{
    const saved=JSON.parse(sessionStorage.getItem("filler_extras_cart_v1")||"{}");
    state.extraSelections=saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};
  }catch{state.extraSelections={};}
  const style = document.createElement("style");
  style.textContent = `
    .fx-modal[hidden]{display:none!important}.fx-modal{position:fixed;inset:0;background:rgba(13,31,24,.65);z-index:99;display:grid;place-items:center;padding:15px}
    .fx-dialog{width:min(100%,480px);max-height:90vh;overflow-y:auto;border-radius:25px;background:#fffdf8;padding:22px;box-shadow:0 25px 70px #001f1570}
    .fx-heading{display:flex;align-items:start;gap:12px;justify-content:space-between}.fx-heading h2{margin:0;font-size:24px}.fx-heading p{margin:6px 0 0;color:#586960}
    .fx-close{background:#eef5ef;color:#154a35;padding:7px 12px}.fx-choices{display:grid;gap:10px;margin:18px 0}
    .fx-choice{display:flex;align-items:center;gap:12px;background:#f1f6f1;border:1px solid #d8e6db;border-radius:14px;padding:12px;font-size:15px;color:#243e32}
    .fx-choice input{width:20px;height:20px;flex:0 0 20px;accent-color:#006241}.fx-choice span{flex:1}.fx-choice b{color:#006241}
    .fx-total{font-size:20px;font-weight:900;display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #e4ded4}
    .fx-actions{display:flex;flex-wrap:wrap;gap:8px}.fx-actions button{flex:1}.fx-question{margin:20px 0;font-weight:800;font-size:18px;color:#174b34}.fx-choice-step[hidden],.fx-question-step[hidden]{display:none!important}
    .fx-size-picker{display:grid;gap:5px;margin:9px 0}.fx-size-picker label{font-size:12px;font-weight:800;color:#365849}.fx-size-picker select{width:100%;border:1px solid #cbdcd0;border-radius:11px;background:#fff;padding:9px;color:#174b34;font-weight:700}.fx-sales-count{display:block;font-size:11px;font-weight:750;color:#4f7561}.cart-extras{display:block;font-size:12px;color:#285c42;line-height:1.5;margin:4px 0 2px}
    .fx-chilaquiles-dialog{width:min(100%,515px)}.fx-chilaquiles-dialog h2{font-size:26px;color:#104c36;margin:0 0 8px}.fx-chilaquiles-progress{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#9a570e;font-weight:850}.fx-chilaquiles-prompt{font-size:18px;color:#143e2e;margin:14px 0}.fx-chilaquiles-options{display:grid;gap:10px;margin:14px 0 20px}.fx-chilaquiles-option{display:flex;flex-direction:column;gap:5px;align-items:start;text-align:left;color:#173f2c;background:#f7f9f4;border:2px solid #e2ebe0;border-radius:15px;padding:14px}.fx-chilaquiles-option.selected{border-color:#f7751f;background:#fff2e6}.fx-chilaquiles-option:disabled{opacity:.45;cursor:not-allowed}.fx-chilaquiles-option small{font-size:12px;color:#5a786a}.fx-chilaquiles .fx-actions button[hidden]{display:none!important}.fx-chilaquiles button:focus-visible{outline:3px solid #f7751f;outline-offset:2px}
    @media(max-width:560px){.fx-dialog{padding:18px}.fx-actions button{min-width:125px}}
  `;
  document.head.appendChild(style);
  const modal = document.createElement("div");
  modal.id = "filler-extras-modal";
  modal.className = "fx-modal";
  modal.hidden = true;
  modal.innerHTML = '<div class="fx-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-title"><div class="fx-heading"><div><h2 id="fx-title">Personaliza tu platillo</h2><p id="fx-name"></p></div><button class="fx-close" type="button" id="fx-close" aria-label="Cerrar">✕</button></div><div id="fx-question-step" class="fx-question-step"><p class="fx-question">¿Quieres agregar algún extra a tu platillo?</p><div class="fx-actions"><button type="button" class="secondary" id="fx-plain">No, gracias</button><button type="button" id="fx-yes">Sí, agregar extras</button></div></div><div id="fx-choice-step" class="fx-choice-step" hidden><p>Selecciona tus extras (opcionales):</p><div id="fx-options" class="fx-choices"></div><div class="fx-total"><span>Total por platillo</span><span id="fx-total">$0</span></div><div class="fx-actions"><button type="button" class="secondary" id="fx-back">Volver</button><button type="button" id="fx-confirm">Agregar al pedido</button></div></div></div>';
  document.body.appendChild(modal);
  let currentId = null;
  let previousFocus = null;
  const closeModal = () => { modal.hidden = true; currentId = null; if (previousFocus) previousFocus.focus(); };
  document.getElementById("fx-close").addEventListener("click", closeModal);
  modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", event => { if (!modal.hidden && event.key === "Escape") closeModal(); });
  function readSelected() {
    const enabled = new Set([...modal.querySelectorAll('input[data-extra]:checked')].map(el => el.dataset.extra));
    return extrasFor(itemById(currentId)).filter(e => enabled.has(e.id));
  }
  function updateModalTotal() {
    const item = itemById(currentId);
    if (!item) return;
    document.getElementById("fx-total").textContent = money(Number(item.price) + readSelected().reduce((s, x) => s + x.price, 0));
  }
  document.getElementById("fx-options").addEventListener("change", updateModalTotal);
  function openModal(id) {
    const item = itemById(id);
    if (!item) return;
    currentId = id;
    previousFocus = document.activeElement;
    document.getElementById("fx-name").textContent = item.name;
    document.querySelector("#fx-question-step .fx-question").textContent = isFiillerCoffee(item) ? "¿Quieres agregar leche extra a tu Café Fiiller?" : "¿Quieres agregar algún extra a tu platillo?";
    document.getElementById("fx-options").innerHTML = extrasFor(item).map(e =>
      '<label class="fx-choice"><input type="checkbox" data-extra="' + esc(e.id) + '"><span>' + esc(e.name) + '</span><b>+' + money(e.price) + '</b></label>'
    ).join("");
    if (isFiillerCoffee(item)) {
      document.getElementById("fx-options").querySelectorAll('input[data-extra]').forEach(input => {
        input.type = "radio";
        input.name = "fiiller-milk-choice";
      });
    }
    document.getElementById("fx-question-step").hidden = false;
    document.getElementById("fx-choice-step").hidden = true;
    updateModalTotal();
    modal.hidden = false;
    document.getElementById("fx-close").focus();
  }
  function addConfigured(id, extras = []) {
    const item = itemById(id);
    if (!item || reserved(id) >= Number(item.stock)) { toast("No hay más existencias de este platillo."); return false; }
    const ordered = [...extras].sort((a, b) => a.id.localeCompare(b.id));
    const key = ordered.length ? id + "::" + ordered.map(e => e.id).join(",") : id;
    state.cart[key] = Number(state.cart[key] || 0) + 1;
    state.extraSelections[key] = ordered.map(e => ({ id: e.id, name: e.name, price: e.price }));
    render(); toast("Agregado a tu pedido");
    return true;
  }
  document.getElementById("fx-plain").addEventListener("click", () => { if (addConfigured(currentId)) closeModal(); });
  document.getElementById("fx-yes").addEventListener("click", () => {
    document.getElementById("fx-question-step").hidden = true;
    document.getElementById("fx-choice-step").hidden = false;
    document.getElementById("fx-options").querySelector("input")?.focus();
  });
  document.getElementById("fx-back").addEventListener("click", () => {
    document.getElementById("fx-choice-step").hidden = true;
    document.getElementById("fx-question-step").hidden = false;
    document.getElementById("fx-yes").focus();
  });
  document.getElementById("fx-confirm").addEventListener("click", () => { if (addConfigured(currentId, readSelected())) closeModal(); });
  // Los seis chilaquiles existentes comparten una ficha sin perder su SKU individual.
  const isChilaquiles = item => item && normalize(item.cat)==="chilaquiles" && /\b(rojos|verdes)\b/i.test(normalize(item.name));
  const chilaquilColor = item => /\brojos\b/i.test(normalize(item.name)) ? "rojos" : "verdes";
  const chilaquilStyle = item => {
    const name=normalize(item.name);
    return name.includes("con pollo") ? "pollo" : name.includes("con huevo") ? "huevo" : "sencillos";
  };
  let chilaquilWizard=null, wizardOrigin=null;
  function closeChilaquilWizard(){
    if(chilaquilWizard){chilaquilWizard.remove();chilaquilWizard=null;}
    if(wizardOrigin?.isConnected)wizardOrigin.focus();
    wizardOrigin=null;
  }
  function openChilaquilWizard(preferredId){
    if(chilaquilWizard)closeChilaquilWizard();
    const variants=state.menu.filter(isChilaquiles);
    if(!variants.length){toast("Los chilaquiles no están disponibles.");return;}
    wizardOrigin=document.activeElement;
    const overlay=document.createElement("div");
    overlay.className="fx-modal fx-chilaquiles";
    const panel=document.createElement("div");panel.className="fx-dialog fx-chilaquiles-dialog";
    panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-labelledby","fx-chilaquiles-title");
    const title=document.createElement("h2");title.id="fx-chilaquiles-title";title.textContent="Arma tus chilaquiles";
    const progress=document.createElement("p");progress.className="fx-chilaquiles-progress";
    const prompt=document.createElement("h3");prompt.className="fx-chilaquiles-prompt";
    const options=document.createElement("div");options.className="fx-chilaquiles-options";
    const actions=document.createElement("div");actions.className="fx-actions";
    const back=document.createElement("button");back.type="button";back.className="secondary";back.textContent="Volver";
    const close=document.createElement("button");close.type="button";close.className="secondary";close.textContent="Cancelar";
    const next=document.createElement("button");next.type="button";next.textContent="Continuar";
    actions.append(back,close,next);panel.append(title,progress,prompt,options,actions);overlay.append(panel);
    document.body.append(overlay);chilaquilWizard=overlay;
    let step=1,color=variants.find(x=>x.id===preferredId)?chilaquilColor(variants.find(x=>x.id===preferredId)):"",style="";
    const hasStock=v=>Number(v.stock)>reserved(v.id);
    const available=colorKey=>variants.filter(v=>chilaquilColor(v)===colorKey);
    function selectButton(text,value,detail,disabled,checked,action){
      const button=document.createElement("button");button.type="button";button.className="fx-chilaquiles-option"+(checked?" selected":"");
      button.disabled=disabled;button.setAttribute("aria-pressed",String(checked));
      const label=document.createElement("strong");label.textContent=text;
      const meta=document.createElement("small");meta.textContent=detail;
      button.append(label,meta);
      button.addEventListener("click",action);return button;
    }
    function renderStep(){
      options.replaceChildren();
      progress.textContent=step===1?"Paso 1 de 3 · Elige tu salsa":"Paso 2 de 3 · Elige tu presentación";
      prompt.textContent=step===1?"¿Los prefieres rojos o verdes?":"¿Cómo quieres tus chilaquiles?";
      back.hidden=step===1;
      next.textContent=step===1?"Continuar":"Elegir extras";
      if(step===1){
        for(const key of ["rojos","verdes"]){
          const list=available(key),count=list.filter(hasStock).length;
          options.append(selectButton(key==="rojos"?"🍅 Rojos":"🌿 Verdes",key,count?"Elige tu presentación":"Agotados por ahora",!count,color===key,()=>{color=key;style="";renderStep();}));
        }
        next.disabled=!color||!available(color).some(hasStock);
      }else{
        for(const variantKey of ["sencillos","huevo","pollo"]){
          const item=available(color).find(x=>chilaquilStyle(x)===variantKey);
          const label=variantKey==="sencillos"?"Sencillos":variantKey==="huevo"?"Con huevo":"Con pollo";
          options.append(selectButton(label,variantKey,item?(hasStock(item)?money(Number(item.price)):"Agotados"):"No disponibles",!item||!hasStock(item),style===variantKey,()=>{style=variantKey;renderStep();}));
        }
        next.disabled=!style;
      }
    }
    next.addEventListener("click",()=>{
      if(step===1){if(!color)return;step=2;renderStep();return;}
      const selected=available(color).find(v=>chilaquilStyle(v)===style);
      if(!selected||!hasStock(selected)){toast("Esa presentación está agotada.");renderStep();return;}
      // Paso 3: conserva el selector de extras, precios y carrito ya existentes.
      closeChilaquilWizard();
      if(eligible(selected)&&extrasFor(selected).length)openModal(selected.id);
      else addConfigured(selected.id);
    });
    back.addEventListener("click",()=>{step=1;renderStep();});
    close.addEventListener("click",closeChilaquilWizard);
    overlay.addEventListener("click",event=>{if(event.target===overlay)closeChilaquilWizard();});
    overlay.addEventListener("keydown",event=>{
      if(event.key==="Escape"){event.preventDefault();closeChilaquilWizard();}
      if(event.key==="Tab"){
        const focusable=[...panel.querySelectorAll("button:not(:disabled):not([hidden])")];
        const current=focusable.indexOf(document.activeElement);
        if(event.shiftKey&&current===0){event.preventDefault();focusable[focusable.length-1]?.focus();}
        else if(!event.shiftKey&&current===focusable.length-1){event.preventDefault();focusable[0]?.focus();}
      }
    });
    renderStep();options.querySelector("button:not(:disabled)")?.focus();
  }
  addToCart = function(id) {
    const item = itemById(id);
    if (!item || reserved(id) >= Number(item.stock)) { toast("No hay más existencias."); return; }
    if (isChilaquiles(item)) {openChilaquilWizard(id);return;}
    if (eligible(item) && extrasFor(item).length) openModal(id);
    else addConfigured(id);
  };
  changeQty = function(key, delta) {
    const next = Number(state.cart[key] || 0) + delta;
    if (delta > 0 && reserved(keyToId(key)) >= Number(itemById(keyToId(key))?.stock || 0)) {
      toast("No hay más existencias."); return;
    }
    if (next <= 0) { delete state.cart[key]; delete state.extraSelections[key]; }
    else state.cart[key] = next;
    render();
  };
  cartItems = function() {
    return Object.entries(state.cart).map(([key, qty]) => {
      const item = itemById(keyToId(key));
      if (!item) return null;
      const extras = state.extraSelections[key] || [];
      return { ...item, key, qty: Number(qty), extras, unitPrice: Number(item.price) + extras.reduce((s, x) => s + Number(x.price || 0), 0) };
    }).filter(Boolean);
  };
  renderMenu = function() {
    const menu = document.getElementById("menu-list");
    if (!menu) return;
    // Mantener la posición de cada carrusel al actualizar el carrito.
    const priorScroll = new Map(Array.from(menu.querySelectorAll(".filler-family-track")).map(el => [el.dataset.family, el.scrollLeft]));
    const categoryProducts = state.category === "Todos" ? state.menu : state.category === featuredCategory ? state.menu.filter(i => featuredIds.includes(i.id)) : state.menu.filter(i => i.cat === state.category);
    const products = searchQuery ? categoryProducts.filter(i => normalize(i.name + " " + i.cat).includes(searchQuery)) : categoryProducts;
    // Agrupar presentaciones en una tarjeta; cada tamaño conserva su propio SKU, precio y stock.
    const families = [...new Set(products.map(item => item.cat || "Otros"))];
    const displayProducts = [];
    const grouped = new Map();
    for (const item of products) {
      const match = item.cat === "Bebidas calientes" && item.name.match(/^(.* Nestlé|Café Fiiller) (8|12|16|20) oz$/i);
      if (isChilaquiles(item)) {
        if(!grouped.has("chilaquiles")) {
          const all=state.menu.filter(isChilaquiles);
          const first=all.find(v=>Number(v.stock)>reserved(v.id))||all[0];
          const representative={...first,id:"fiiller-chilaquiles-group",name:"Chilaquiles",chilaquilesGroup:true,chilaquilesVariants:all};
          grouped.set("chilaquiles",representative);displayProducts.push(representative);
        }
        continue;
      }
      if (!match) { displayProducts.push(item); continue; }
      const groupName = match[1];
      if (!grouped.has(groupName)) {
        const representative = {...item, name:groupName, sizeVariants:[]};
        grouped.set(groupName, representative);
        displayProducts.push(representative);
      }
      grouped.get(groupName).sizeVariants.push({...item, sizeOz:Number(match[2])});
    }
    displayProducts.forEach(p => p.sizeVariants?.sort((a,b)=>a.sizeOz-b.sizeOz));
    const featured = displayProducts.filter(p => (p.chilaquilesGroup ? p.chilaquilesVariants.some(v=>featuredIds.includes(v.id)) : p.sizeVariants ? p.sizeVariants.some(v=>featuredIds.includes(v.id)) : featuredIds.includes(p.id))).sort((a,b)=>{
      const rank = p => Math.min(...(p.chilaquilesGroup ? p.chilaquilesVariants.map(v=>featuredRank.get(v.id)?.rank ?? 999) : p.sizeVariants ? p.sizeVariants.map(v=>featuredRank.get(v.id)?.rank ?? 999) : [featuredRank.get(p.id)?.rank ?? 999]));
      return rank(a)-rank(b);
    });
    const sections = state.category === "Todos"
      ? [{name:featuredCategory,items:featured}, ...families.map(name => ({name,items:displayProducts.filter(p => (p.cat||"Otros")===name && !featured.includes(p))}))].filter(section=>section.items.length)
      : state.category === featuredCategory
        ? [{name:featuredCategory,items:featured}]
        : families.map(name=>({name,items:displayProducts.filter(p=>(p.cat||"Otros")===name)}));

    function productCard(item) {
      const chilaquilesGroup=Boolean(item.chilaquilesGroup);
      const variants = item.sizeVariants || null;
      const selected = variants ? (variants.find(v => Number(v.stock) - reserved(v.id) > 0) || variants[0]) : item;
      const available = chilaquilesGroup ? item.chilaquilesVariants.reduce((sum,v)=>sum+Math.max(0,Number(v.stock)-reserved(v.id)),0) : Number(selected.stock) - reserved(selected.id);
      const photo = item.image ? 'style="background-image:url(&quot;' + esc(item.image) + '&quot;);background-size:contain;background-position:center center;background-repeat:no-repeat;background-color:#fff"' : "";
      const options = eligible(selected) && extrasFor(selected).length;
      const stockLabel = available <= 0 ? "Agotado" : "Disponible";
      const stockClass = available <= 0 ? "sold-out" : available <= 5 ? "low" : "";
      const addLabel = available <= 0 ? "Agotado" : chilaquilesGroup ? "Personalizar" : options ? "Elegir" : "Agregar";
      const sales = chilaquilesGroup ? item.chilaquilesVariants.map(v=>featuredRank.get(v.id)).find(Boolean) : variants ? variants.map(v=>featuredRank.get(v.id)).find(Boolean) : featuredRank.get(item.id);
      const salesLabel = sales && (state.category === featuredCategory || state.category === "Todos")
        ? '<small class="fx-sales-count">' + sales.units + ' unidades vendidas</small>' : '';
      const sizeSelector = variants ? '<div class="fx-size-picker"><label for="size-' + esc(selected.id) + '">Elige tu tamaño</label><select id="size-' + esc(selected.id) + '" data-coffee-size aria-label="Tamaño de ' + esc(item.name) + '">' + variants.map(v => '<option value="' + esc(v.id) + '" data-price="' + Number(v.price) + '" data-stock="' + Math.max(0,Number(v.stock)-reserved(v.id)) + '"' + (v.id===selected.id?' selected':'') + (Number(v.stock)-reserved(v.id)<=0?' disabled':'') + '>' + v.sizeOz + ' oz · ' + money(Number(v.price)) + (Number(v.stock)-reserved(v.id)<=0?' · Agotado':'') + '</option>').join('') + '</select></div>' : '';
      return '<article class="item"><div class="item-media"><div class="item-photo photo ' + photoClass(item.cat) + '" data-has-photo="' + Boolean(item.image) + '" data-photo-key="' + esc(item.imageKey || "") + '" ' + photo + '></div><span class="item-stock-badge ' + stockClass + '">' + stockLabel + '</span></div><div class="item-details"><div class="item-category">' + esc(item.cat) + '</div><h3>' + esc(item.name) + '</h3>' + salesLabel + sizeSelector + '<div class="item-bottom"><strong class="price">' + (chilaquilesGroup ? "Desde "+money(Math.min(...item.chilaquilesVariants.filter(v=>Number(v.stock)>reserved(v.id)).map(v=>Number(v.price)))) : money(Number(selected.price))) + '</strong><button class="item-add" type="button" aria-label="' + (available <= 0 ? "Agotado: " : options ? "Seleccionar " : "Agregar ") + esc(item.name) + '" ' + (available <= 0 ? "disabled" : "") + ' data-add="' + esc(chilaquilesGroup ? (item.chilaquilesVariants.find(v=>Number(v.stock)>reserved(v.id))?.id||selected.id) : selected.id) + '"><span class="item-add-plus" aria-hidden="true">+</span><span>' + addLabel + '</span></button></div></div></article>';
    }

    if (!products.length) {
      menu.innerHTML = '<div class="empty">No encontramos productos para esta búsqueda. Prueba otra familia o palabra.</div>';
    } else {
      menu.innerHTML = sections.map((section, idx) => {
        const family = section.name;
        const items = section.items;
        const heading = family === featuredCategory ? "Los más vendidos · ventas del 1 al 14 oct" : family;
        return '<section class="filler-family"><div class="filler-family-header"><div><h3>' + esc(heading) + '</h3><small>' + items.length + (items.length === 1 ? " producto" : " productos") + '</small></div><div class="filler-family-controls"><button type="button" class="filler-family-arrow" data-slide="' + idx + '" data-dir="-1" aria-label="Ver productos anteriores de ' + esc(family) + '">‹</button><button type="button" class="filler-family-arrow" data-slide="' + idx + '" data-dir="1" aria-label="Ver más productos de ' + esc(family) + '">›</button></div></div><div class="filler-family-track" id="filler-family-' + idx + '" data-family="' + esc(family) + '" role="region" aria-label="Productos de ' + esc(family) + '" tabindex="0">' + items.map(productCard).join("") + '</div></section>';
      }).join("");
    }
    FillerPhotos.applyImages(menu);
    menu.querySelectorAll(".filler-family-track").forEach(el => {
      if (priorScroll.has(el.dataset.family)) el.scrollLeft = priorScroll.get(el.dataset.family);
    });
    menu.querySelectorAll("[data-coffee-size]").forEach(select => select.addEventListener("change", () => {
      const chosen = select.selectedOptions[0];
      if (!chosen) return;
      const card = select.closest(".item");
      const button = card.querySelector("[data-add]");
      const stock = Number(chosen.dataset.stock);
      const withExtras = eligible(itemById(select.value)) && extrasFor(itemById(select.value)).length;
      button.dataset.add = select.value;
      button.disabled = stock <= 0;
      button.querySelector("span:last-child").textContent = stock <= 0 ? "Agotado" : (withExtras ? "Elegir" : "Agregar");
      card.querySelector(".price").textContent = money(Number(chosen.dataset.price));
      const badge = card.querySelector(".item-stock-badge");
      badge.textContent = stock <= 0 ? "Agotado" : "Disponible";
      badge.className = "item-stock-badge " + (stock<=0?"sold-out":stock<=5?"low":"");
    }));
    menu.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.add)));
    menu.querySelectorAll("[data-slide]").forEach(b => b.addEventListener("click", () => {
      const track = document.getElementById("filler-family-" + b.dataset.slide);
      if (track) track.scrollBy({left: Number(b.dataset.dir) * Math.max(180, track.clientWidth * 0.75), behavior: "smooth"});
    }));
  };
  renderCart = function() {
    try{
      sessionStorage.setItem("filler_cart_v1",JSON.stringify(state.cart));
      sessionStorage.setItem("filler_extras_cart_v1",JSON.stringify(state.extraSelections));
    }catch{}
    const items = cartItems();
    const qty = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    document.getElementById("bubble-count").textContent = qty === 1 ? "1 producto" : qty + " productos";
    document.getElementById("bubble-total").textContent = "Ver pedido · " + money(total);
    document.getElementById("order-bubble").classList.toggle("show", qty > 0);
    const navCount = document.getElementById("filler-nav-cart-count");
    if (navCount) { navCount.textContent = qty > 9 ? "9+" : String(qty); navCount.hidden = qty === 0; }
    const cart=document.getElementById("filler-cart");
    cart.classList.toggle("cart-has-items",qty>0);
    const stickyTotal=document.getElementById("filler-sticky-total");
    if(stickyTotal)stickyTotal.textContent=money(total);
    const priorNotice=document.getElementById("client-status");
    if(qty>0 && priorNotice?.dataset.confirmed==="true"){
      priorNotice.replaceChildren();
      priorNotice.classList.remove("show");
      delete priorNotice.dataset.confirmed;
    }

    document.getElementById("cart-lines").innerHTML = items.length ? items.map(i => {
      const extras = i.extras.length ? '<small class="cart-extras">Extras: ' + i.extras.map(x => esc(x.name) + ' (+' + money(x.price) + ')').join(", ") + '</small>' : "";
      return '<div class="cart-line"><div><strong>' + esc(i.name) + '</strong>' + extras + '<span>' + money(i.unitPrice) + ' x ' + i.qty + '</span></div><div class="qty"><button class="secondary" data-qty="' + esc(i.key) + '" data-delta="-1">−</button><b>' + i.qty + '</b><button class="secondary" data-qty="' + esc(i.key) + '" data-delta="1">+</button></div></div>';
    }).join("") : '<div class="empty">Tu pedido está vacío.</div>';
    document.querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.qty, Number(b.dataset.delta))));
    document.getElementById("cart-total").textContent = money(total);
  };
  // Nunca confirmar pedidos solo en localStorage: la cocina no los recibiría.
  sendOrder = function() { toast("La recepción de cocina no está conectada. Revisa tu conexión."); };
  const oldSend = document.getElementById("send-order");
  const newSend = oldSend.cloneNode(true);
  oldSend.replaceWith(newSend);
  newSend.disabled = true;
  newSend.textContent = "Conectando con cocina…";
  // storefront-cloud.js habilita este botón después de verificar Supabase.
  render();
})();
