const CACHE_NAME = "filler-app-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./pedido.html",
  "./order-tracking.js",
  "./admin.html",
  "./pedidos.html",
  "./monitor.html",
  "./menu-control.html",
  "./extras-control.js",
  "./extras-storefront.js",
  "./photo-store.js",
  "./filler-cloud.js",
  "./menu-cloud.js",
  "./order-notifications.js",
  "./ticket-printer.js",
  "./ticket-print.css",
  "./kitchen-cloud.js",
  "./monitor-cloud.js",
  "./storefront-cloud.js",
  "./mi-filler.html",
  "./mi-filler.js",
  "./push-config.js",
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
  const target=isPrivateTracking?raw:(raw==="./mi-filler.html"?"./mi-filler.html":(raw==="./monitor.html"?"./monitor.html":"./pedidos.html"));
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

// Avisos del dispositivo: los datos provienen exclusivamente del servicio de envío autorizado.
self.addEventListener("push",event=>{
if(!event.data)return;
let payload={};
try{payload=event.data.json();}catch{payload={body:event.data.text()};}
const customer=payload.type==="customer";
const title=String(payload.title||(customer?"Filler Café":"🔔 Nuevo pedido Filler Café")).slice(0,90);
const body=String(payload.body||payload.code||"Tienes una notificación de Filler Café").slice(0,200);
const code=String(payload.code||"").slice(0,60);
let target=customer?"./mi-filler.html":"./pedidos.html";
if(customer && typeof payload.tracking_token==="string" &&
/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(payload.tracking_token)){
target="./pedido.html#token="+payload.tracking_token;
}
event.waitUntil(self.registration.showNotification(title,{
body,icon:"./assets/filler-icon-192.png",badge:"./assets/filler-icon-192.png",
tag:"filler-push-"+(code||Date.now()),data:{url:target}
}));
});
