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
  const eligible = item => item && (item.allowExtras === true || (item.allowExtras !== false && /chilaquiles|plancha|sandwich|ensalada|mollete|torta|croque|baguette|panini/i.test(item.cat || "")));
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
    .fx-actions{display:flex;flex-wrap:wrap;gap:8px}.fx-actions button{flex:1}
    .cart-extras{display:block;font-size:12px;color:#285c42;line-height:1.5;margin:4px 0 2px}
    @media(max-width:560px){.fx-dialog{padding:18px}.fx-actions button{min-width:125px}}
  `;
  document.head.appendChild(style);
  const modal = document.createElement("div");
  modal.id = "filler-extras-modal";
  modal.className = "fx-modal";
  modal.hidden = true;
  modal.innerHTML = '<div class="fx-dialog" role="dialog" aria-modal="true" aria-labelledby="fx-title"><div class="fx-heading"><div><h2 id="fx-title">Personaliza tu platillo</h2><p id="fx-name"></p></div><button class="fx-close" type="button" id="fx-close" aria-label="Cerrar">✕</button></div><div id="fx-options" class="fx-choices"></div><div class="fx-total"><span>Total por platillo</span><span id="fx-total">$0</span></div><div class="fx-actions"><button type="button" class="secondary" id="fx-plain">Sin extras</button><button type="button" id="fx-confirm">Agregar al pedido</button></div></div>';
  document.body.appendChild(modal);
  let currentId = null;
  let previousFocus = null;
  const closeModal = () => { modal.hidden = true; currentId = null; if (previousFocus) previousFocus.focus(); };
  document.getElementById("fx-close").addEventListener("click", closeModal);
  modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", event => { if (!modal.hidden && event.key === "Escape") closeModal(); });
  function readSelected() {
    const enabled = new Set([...modal.querySelectorAll('input[data-extra]:checked')].map(el => el.dataset.extra));
    return activeExtras().filter(e => enabled.has(e.id));
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
    document.getElementById("fx-options").innerHTML = activeExtras().map(e =>
      '<label class="fx-choice"><input type="checkbox" data-extra="' + esc(e.id) + '"><span>' + esc(e.name) + '</span><b>+' + money(e.price) + '</b></label>'
    ).join("");
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
  document.getElementById("fx-confirm").addEventListener("click", () => { if (addConfigured(currentId, readSelected())) closeModal(); });
  addToCart = function(id) {
    const item = itemById(id);
    if (!item || reserved(id) >= Number(item.stock)) { toast("No hay más existencias."); return; }
    if (eligible(item) && activeExtras().length) openModal(id);
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
    const categoryProducts = state.category === "Todos" ? state.menu : state.menu.filter(i => i.cat === state.category);
    const products = searchQuery ? categoryProducts.filter(i => normalize(i.name + " " + i.cat).includes(searchQuery)) : categoryProducts;
    const families = [...new Set(products.map(item => item.cat || "Otros"))];

    function productCard(item) {
      const available = Number(item.stock) - reserved(item.id);
      const photo = item.image ? 'style="background-image:url(&quot;' + esc(item.image) + '&quot;);background-size:contain;background-position:center center;background-repeat:no-repeat;background-color:#fff"' : "";
      const options = eligible(item) && activeExtras().length;
      const stockLabel = available <= 0 ? "Agotado" : available <= 5 ? "¡Últimas " + available + "!" : "Disponible";
      const stockClass = available <= 0 ? "sold-out" : available <= 5 ? "low" : "";
      const addLabel = available <= 0 ? "Agotado" : options ? "Extras +" : "Agregar";
      return '<article class="item"><div class="item-media"><div class="item-photo photo ' + photoClass(item.cat) + '" data-has-photo="' + Boolean(item.image || item.imageKey) + '" data-photo-key="' + esc(item.imageKey || "") + '" ' + photo + '></div><span class="item-stock-badge ' + stockClass + '">' + stockLabel + '</span></div><div class="item-details"><div class="item-category">' + esc(item.cat) + '</div><h3>' + esc(item.name) + '</h3><div class="item-bottom"><strong class="price">' + money(Number(item.price)) + '</strong><button class="item-add" type="button" aria-label="' + (available <= 0 ? "Agotado: " : options ? "Elegir extras de " : "Agregar ") + esc(item.name) + '" ' + (available <= 0 ? "disabled" : "") + ' data-add="' + esc(item.id) + '"><span class="item-add-plus" aria-hidden="true">+</span><span>' + addLabel + '</span></button></div></div></article>';
    }

    if (!products.length) {
      menu.innerHTML = '<div class="empty">No encontramos productos para esta búsqueda. Prueba otra familia o palabra.</div>';
    } else {
      menu.innerHTML = families.map((family, idx) => {
        const items = products.filter(item => (item.cat || "Otros") === family);
        return '<section class="filler-family"><div class="filler-family-header"><div><h3>' + esc(family) + '</h3><small>' + items.length + (items.length === 1 ? " producto" : " productos") + '</small></div><div class="filler-family-controls"><button type="button" class="filler-family-arrow" data-slide="' + idx + '" data-dir="-1" aria-label="Ver productos anteriores de ' + esc(family) + '">‹</button><button type="button" class="filler-family-arrow" data-slide="' + idx + '" data-dir="1" aria-label="Ver más productos de ' + esc(family) + '">›</button></div></div><div class="filler-family-track" id="filler-family-' + idx + '" data-family="' + esc(family) + '" role="region" aria-label="Productos de ' + esc(family) + '" tabindex="0">' + items.map(productCard).join("") + '</div></section>';
      }).join("");
    }
    FillerPhotos.applyImages(menu);
    menu.querySelectorAll(".filler-family-track").forEach(el => {
      if (priorScroll.has(el.dataset.family)) el.scrollLeft = priorScroll.get(el.dataset.family);
    });
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
