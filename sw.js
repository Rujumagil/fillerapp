const CACHE_NAME = "filler-app-v9";
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
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("./index.html"));
});
