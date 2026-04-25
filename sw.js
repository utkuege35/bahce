// Service Worker - Cache devre dışı, her zaman güncel kod
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Cache kullanma, her zaman network'ten al
  e.respondWith(fetch(e.request));
});
