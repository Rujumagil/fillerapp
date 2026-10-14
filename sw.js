const CACHE_NAME = "filler-app-v13";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./pedidos.html",
  "./monitor.html",
  "./menu-control.html",
  "./extras-control.js",
  "./extras-storefront.js",
  "./photo-store.js",
  "./filler-cloud.js",
  "./menu-cloud.js",
  "./kitchen-cloud.js",
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

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./index.html"));
});
