/* Fiiller: elige el producto de una campaña, usando el flujo normal de carrito y extras. */
(() => {
  "use strict";
  const params=new URLSearchParams(location.search);
  const productId=params.get("promo");
  const allowed=new Set(["chilaquiles-rojos-sencillos","rojos-con-huevo","rojos-con-pollo"]);
  if(!productId||!allowed.has(productId))return;
  // Evita agregar el mismo producto al recargar la página o volver atrás.
  const url=new URL(location.href);
  url.searchParams.delete("promo");
  history.replaceState(history.state,"",url.pathname+url.search+url.hash);
  let attempts=0;
  const dispatch=()=>{
    attempts++;
    if(window.FillerOnlineActive===true){
      clearInterval(timer);
      document.dispatchEvent(new CustomEvent("fiiller:promo-product",{detail:{productId}}));
      return;
    }
    if(attempts>=100)clearInterval(timer);
  };
  const timer=setInterval(dispatch,200);
  dispatch();
})();
