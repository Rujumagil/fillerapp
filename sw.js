const CACHE_NAME = "filler-app-v33";
const APP_SHELL = [
  "./",
  "./index.html",
  "./mi-filler.html",
  "./mi-filler.js",
  "./pedido.html",
  "./order-tracking.js",
  "./admin.html",
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
  "./ticket-printer.js",
  "./ticket-print.css",
  "./kitchen-cloud.js",
  "./kitchen-messages.js",
  "./monitor-cloud.js",
  "./storefront-cloud.js",
  "./manifest.json",
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
  const isPrivateTracking=typeof raw==="string" &&
    /^\.\/pedido\.html#token=[0-9a-f-]{36}$/i.test(raw);
  const target=isPrivateTracking?raw:(raw==="./pedido.html"?"./pedido.html":(raw==="./monitor.html"?"./monitor.html":"./pedidos.html"));
  const absolute=new URL(target,self.registration.scope).href;
  event.waitUntil((async()=>{
    const all=await clients.matchAll({type:"window",includeUncontrolled:true});
    const existing=all.find(c=>{
      const seen=new URL(c.url);
      const target=new URL(absolute);
      return isPrivateTracking?seen.href===target.href:
        (seen.origin===target.origin && seen.pathname===target.pathname);
    });
    if(existing){await existing.focus();existing.postMessage({kind:"filler-order-notification-click"});return;}
    await clients.openWindow(absolute);
  })());
});

// Preparado para Web Push real; no se enviarán mensajes cuando la página
// esté cerrada hasta configurar servidor, suscripciones y claves VAPID.
self.addEventListener("push",event=>{
  if(!event.data)return;
  let payload={};
  try{payload=event.data.json();}catch{payload={body:event.data.text()};}
  const customer=payload?.type==="customer";
  const code=typeof payload.code==="string"?payload.code.slice(0,40):"Filler Café";
  const tracking=typeof payload.tracking_url==="string" && /^\.\/pedido\.html#token=[0-9a-f-]{36}$/i.test(payload.tracking_url)?payload.tracking_url:null;
  const title=customer?"☕ Aviso de tu pedido Filler":"🔔 Nuevo pedido Filler Café";
  const body=customer?String(payload.body||"Tu pedido tiene una actualización.").slice(0,160):code;
  event.waitUntil(self.registration.showNotification(title,{
    body,
    icon:"./assets/filler-icon-192.png",
    badge:"./assets/filler-icon-192.png",
    tag:(customer?"filler-cliente-":"filler-cocina-")+code,
    data:{url:customer?(tracking||"./pedido.html"):"./pedidos.html"}
  }));
});
