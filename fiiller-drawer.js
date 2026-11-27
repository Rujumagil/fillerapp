/* Fiiller Café · Drawer de pedido accesible para móvil y escritorio.
 * No reemplaza el carrito, la personalización ni la recepción de pedidos.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cart = $("filler-cart");
  const overlay = $("fiiller-cart-scrim");
  const back = cart?.querySelector(".filler-cart-back");
  if (!cart || !overlay) return;
  let focusBefore = null;
  let goToMenuOnClose = false;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const actionable = () => [...cart.querySelectorAll(
    'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.hidden && !el.closest("[hidden]") && getComputedStyle(el).display !== "none");
  const scrollToShop = () => {
    const target = $("comprar-rapido") || $("menu");
    target?.scrollIntoView({behavior: reduced() ? "auto" : "smooth",block:"start"});
  };
  function show(open) {
    const active = document.body.classList.contains("fiiller-drawer-open");
    if (active === open) return;
    document.body.classList.toggle("fiiller-drawer-open", open);
    overlay.hidden = !open;
    cart.inert = !open;
    cart.setAttribute("aria-hidden", String(!open));
    cart.setAttribute("aria-modal", String(open));
    if (open) {
      focusBefore = document.activeElement;
      // No se navega a otra página: la misma venta conserva carrito y selección.
      (back || cart).focus({preventScroll:true});
    } else {
      if (focusBefore?.isConnected) focusBefore.focus({preventScroll:true});
      focusBefore = null;
      if (goToMenuOnClose) {
        goToMenuOnClose = false;
        requestAnimationFrame(scrollToShop);
      }
    }
  }
  window.openFillerCart = function() {
    if (document.body.classList.contains("fiiller-drawer-open")) return;
    if (history.state?.fillerCartOpen || location.hash === "#carrito") {
      show(true);return;
    }
    history.pushState({...history.state,fillerCartOpen:true}, "", "#carrito");
    show(true);
  };
  window.closeFillerCart = function(exploreMenu = false) {
    if (exploreMenu === true) goToMenuOnClose = true;
    if (history.state?.fillerCartOpen) history.back();
    else show(false);
  };
  overlay.addEventListener("click",()=>window.closeFillerCart());
  window.addEventListener("popstate",()=>show(Boolean(history.state?.fillerCartOpen)));
  window.addEventListener("pageshow",()=>show(Boolean(history.state?.fillerCartOpen) || location.hash === "#carrito"));
  document.addEventListener("keydown",event=>{
    if (!document.body.classList.contains("fiiller-drawer-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      window.closeFillerCart();
      return;
    }
    if (event.key !== "Tab") return;
    const list = actionable();
    if (!list.length) {event.preventDefault();cart.focus();return;}
    const first = list[0], last = list[list.length-1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === cart)) {
      event.preventDefault();last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();first.focus();
    }
  });
  cart.setAttribute("role","dialog");
  cart.setAttribute("aria-labelledby","filler-cart-title");
  cart.setAttribute("aria-modal","false");
  cart.setAttribute("aria-hidden","true");
  cart.setAttribute("tabindex","-1");
  cart.inert = true;
  if (location.hash === "#carrito") show(true);
})();
