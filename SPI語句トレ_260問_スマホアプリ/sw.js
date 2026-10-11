/* GitHub PagesなどのHTTPS接続時は、学習画面をオフラインでも開けるよう保存します。 */
const CACHE_NAME = 'spi-goi-v1';
const ASSETS = ['./','./index.html','./app.js','./style.css','./data.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method!=='GET' || new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
