const CACHE='sever-bahce-v2';
const ASSETS=['/bahce/','/bahce/index.html','/bahce/css/style.css',
  '/bahce/js/config.js','/bahce/js/auth.js','/bahce/js/app.js',
  '/bahce/js/stoklar.js','/bahce/js/urunler.js','/bahce/js/islemler.js',
  '/bahce/js/panel.js','/bahce/js/birimler.js','/bahce/js/kullanicilar.js',
  '/bahce/js/giderkalemler.js','/bahce/js/merkezler.js','/bahce/js/rapor.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(!e.request.url.startsWith('http'))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('/bahce/'))));});
