(function fillerExtrasStorefront() {
  "use strict";
  const catalogKey = "fillerExtras";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const keyToId = key => key.split("::")[0];
  const reserved = id => Object.entries(state.cart).reduce((sum, [key, qty]) => sum + (keyToId(key) === id ? Number(qty || 0) : 0), 0);
  const activeExtras = () => {
    try {
      const data = JSON.parse(localStorage.getItem(catalogKey) || "[]");
      return Array.isArray(data) ? data.filter(e => e && e.enabled === true && e.name && e.price !== null && e.price !== "" && Number.isFinite(Number(e.price)) && Number(e.price) >= 0).map(e => ({ id: String(e.id), name: String(e.name), price: Number(e.price) })) : [];
    } catch { return []; }
  };
  const eligible = item => item && (item.allowExtras === true || (item.allowExtras !== false && /chilaquiles|plancha|sandwich|ensalada|mollete|torta|croque|baguette|panini/i.test(item.cat || "")));
  state.extraSelections = {};
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
    const products = state.category === "Todos" ? state.menu : state.menu.filter(i => i.cat === state.category);
    document.getElementById("menu-list").innerHTML = products.map(item => {
      const available = Number(item.stock) - reserved(item.id);
      const photo = item.image ? 'style="background-image:url(&quot;' + esc(item.image) + '&quot;);background-size:contain;background-position:center center;background-repeat:no-repeat;background-color:#fff"' : "";
      const options = eligible(item) && activeExtras().length;
      return '<article class="item"><div class="item-photo photo ' + photoClass(item.cat) + '" data-has-photo="' + Boolean(item.image || item.imageKey) + '" data-photo-key="' + esc(item.imageKey || "") + '" ' + photo + '></div><h3>' + esc(item.name) + '</h3><div class="meta">' + (available > 0 ? available + ' disponibles' : 'Agotado') + '</div><div class="price">' + money(Number(item.price)) + '</div><button ' + (available <= 0 ? "disabled" : "") + ' data-add="' + esc(item.id) + '">' + (available <= 0 ? "Agotado" : options ? "Elegir extras" : "Agregar") + '</button></article>';
    }).join("");
    FillerPhotos.applyImages(document.getElementById("menu-list"));
    document.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addToCart(b.dataset.add)));
  };
  renderCart = function() {
    const items = cartItems();
    const qty = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    document.getElementById("bubble-count").textContent = qty === 1 ? "1 producto" : qty + " productos";
    document.getElementById("bubble-total").textContent = "Ver pedido · " + money(total);
    document.getElementById("order-bubble").classList.toggle("show", qty > 0);
    document.getElementById("cart-lines").innerHTML = items.length ? items.map(i => {
      const extras = i.extras.length ? '<small class="cart-extras">Extras: ' + i.extras.map(x => esc(x.name) + ' (+' + money(x.price) + ')').join(", ") + '</small>' : "";
      return '<div class="cart-line"><div><strong>' + esc(i.name) + '</strong>' + extras + '<span>' + money(i.unitPrice) + ' x ' + i.qty + '</span></div><div class="qty"><button class="secondary" data-qty="' + esc(i.key) + '" data-delta="-1">−</button><b>' + i.qty + '</b><button class="secondary" data-qty="' + esc(i.key) + '" data-delta="1">+</button></div></div>';
    }).join("") : '<div class="empty">Tu pedido está vacío.</div>';
    document.querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.qty, Number(b.dataset.delta))));
    document.getElementById("cart-total").textContent = money(total);
  };
  sendOrder = function() {
    const items = cartItems();
    const customer = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    if (!items.length) return toast("Agrega al menos un producto.");
    if (!customer || !phone) return toast("Falta nombre y teléfono.");
    for (const i of items) {
      if (i.qty > Number(itemById(i.id)?.stock || 0)) return toast("No hay existencias suficientes.");
    }
    const now = Date.now();
    const order = {
      id: "F-" + now.toString().slice(-6), date: todayKey,
      createdAt: new Date(now).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      createdTs: now, statusUpdatedAt: now, customer, phone,
      pickup: document.getElementById("pickup-time").value,
      notes: document.getElementById("notes").value.trim(),
      status: "Nuevo",
      items: items.map(i => ({ id: i.id, name: i.name, cat: i.cat, qty: i.qty, price: i.price, extras: i.extras.map(x => ({ ...x })), unitPrice: i.unitPrice })),
      total: items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    };
    for (const i of items) itemById(i.id).stock -= i.qty;
    state.orders.unshift(order);
    try { save(); } catch { state.orders.shift(); for (const i of items) itemById(i.id).stock += i.qty; return toast("No se pudo guardar el pedido."); }
    state.cart = {}; state.extraSelections = {};
    document.getElementById("client-status").textContent = "Pedido " + order.id + " guardado en este navegador. La recepción de pedidos en otros dispositivos aún no está conectada.";
    document.getElementById("client-status").classList.add("show");
    toast("Pedido registrado en este dispositivo.");
    render();
  };
  const oldSend = document.getElementById("send-order");
  const newSend = oldSend.cloneNode(true);
  oldSend.replaceWith(newSend);
  newSend.addEventListener("click", () => sendOrder());
  render();
})();
