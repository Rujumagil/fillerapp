const CACHE_NAME = "filler-app-v72";
const APP_SHELL = [
  "./",
  "./index.html",
  "./mi-filler.html",
  "./encuesta-satisfaccion.html",
  "./encuesta-satisfaccion.js",
  "./mi-filler.js",
  "./pedido.html",
  "./order-tracking.js",
  "./admin.html",
  "./manifest-admin.json",
  "./manifest-pedidos.json",
  "./control-arrow.html",
  "./control-arrow.js",
  "./almacen-fiiller.html",
  "./almacen-fiiller.js",
  "./dashboard-ventas.html",
  "./dashboard-ventas.js",
  "./integracion-ocs.html",
  "./integracion-ocs.js",
  "./crm-clientes.html",
  "./crm-clientes.js",
  "./pedidos.html",
  "./monitor.html",
  "./menu-control.html",
  "./catalogo-tpv.html",
  "./catalogo-tpv.js",
  "./extras-control.js",
  "./extras-storefront.js",
  "./photo-store.js",
  "./filler-cloud.js",
  "./menu-cloud.js",
  "./order-notifications.js",
  "./filler-sounds.js",
  "./filler-sound-admin.js",
  "./sonidos-filler.html",
  "./ticket-printer.js",
  "./ticket-print.css",
  "./kitchen-cloud.js",
  "./kitchen-messages.js",
  "./monitor-cloud.js",
  "./storefront-cloud.js",
  "./manifest.json",
  "./pwa.js",
  "./filler-marketing-push-client.js",
  "./filler-promo-push-admin.js",
  "./promociones-admin.html",
  "./promo-chilaquiles-rojos.html",
  "./promo-deeplink.js",
  "./assets/filler-logo-oficial.webp",
  "./assets/filler-icon-192.png",
  "./assets/filler-icon-512.png",
  "./assets/filler-vitrina-hero-hd.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const documentOrScript = req.mode === "navigate" || /\.(?:html|js)$/.test(url.pathname);
  if (documentOrScript) {
    // Evitar que una PWA instalada muestre una versión anterior del checkout.
    event.respondWith(
      fetch(req).then(response => {
        if (response.ok) {
          const responseCopy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req,responseCopy)).catch(()=>{}));
        }
        return response;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});

// Abre la pantalla de cocina a la que pertenece el aviso.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const raw=event.notification.data?.url || "./pedidos.html";
  const isPromotion=event.notification.data?.type==="promotion" &&
    typeof raw==="string" && /^\.\/(?:index\.html#(?:promociones|menu|menu-list)|promo-chilaquiles-rojos\.html)$/.test(raw);
  const isPrivateTracking=typeof raw==="string" &&
    /^\.\/pedido\.html#token=[0-9a-f-]{36}$/i.test(raw);
  const target=isPromotion?raw:(isPrivateTracking?raw:(raw==="./pedido.html"?"./pedido.html":(raw==="./monitor.html"?"./monitor.html":"./pedidos.html")));
  const absolute=new URL(target,self.registration.scope).href;
  event.waitUntil((async()=>{
    const all=await clients.matchAll({type:"window",includeUncontrolled:true});
    const existing=all.find(c=>{
      const seen=new URL(c.url);
      const target=new URL(absolute);
      return isPrivateTracking?seen.href===target.href:
        (seen.origin===target.origin && seen.pathname===target.pathname);
    });
    if(existing){
      if(isPromotion&&typeof existing.navigate==="function"){
        const changed=await existing.navigate(absolute).catch(()=>null);
        if(changed){await changed.focus();return;}
      }
      await existing.focus();
      if(!isPromotion)existing.postMessage({kind:"filler-order-notification-click"});
      return;
    }
    await clients.openWindow(absolute);
  })());
});

// Web Push de promociones y estados de pedidos: solo muestra avisos recibidos.
// El envío a clientes exige consentimiento y un dispositivo suscrito al servicio.
self.addEventListener("push",event=>{
  if(!event.data)return;
  let payload={};
  try{payload=event.data.json();}catch{payload={body:event.data.text()};}
  const customer=payload?.type==="customer";
  const promo=payload?.type==="promotion";
  const code=typeof payload.code==="string"?payload.code.slice(0,40):"Fiiller Café";
  const tracking=typeof payload.tracking_url==="string" && /^\.\/pedido\.html#token=[0-9a-f-]{36}$/i.test(payload.tracking_url)?payload.tracking_url:null;
  const title=promo?String(payload.title||"🥐 Fiiller Promos").slice(0,110):
    customer?"☕ Aviso de tu pedido Fiiller":"🔔 Nuevo pedido Fiiller Café";
  const body=promo?String(payload.body||"¡Descubre nuestras promociones!").slice(0,200):
    customer?String(payload.body||"Tu pedido tiene una actualización.").slice(0,160):code;
  const marketingTarget=promo && payload.url==="./promo-chilaquiles-rojos.html"
    ?"./promo-chilaquiles-rojos.html":"./index.html#promociones";
  const photo=typeof payload.image==="string" && /^https:\/\/qwxydjotwhniahaovrff\.supabase\.co\/storage\/v1\/object\/public\/filler-product-images\//.test(payload.image)?
    payload.image:undefined;
  const options={
    body,
    icon:promo?(photo||"./assets/filler-icon-192.png"):"./assets/filler-icon-192.png",
    ...(promo?{}:{badge:"./assets/filler-icon-192.png"}),
    tag:promo?"filler-promo-"+String(payload.campaign_id||"").slice(0,40):(customer?"filler-cliente-":"filler-cocina-")+code,
    data:{type:promo?"promotion":customer?"customer":"kitchen",url:promo?marketingTarget:customer?(tracking||"./pedido.html"):"./pedidos.html"}
  };
  if(promo&&photo)options.image=photo;
  event.waitUntil(self.registration.showNotification(title,options));
});
