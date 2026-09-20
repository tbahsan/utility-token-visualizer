/* Offline cache for Prepaid Meter Helper. Author: tbahsan */
const CACHE = 'upm-v1';
const ASSETS = [
  './', './index.html',
  './assets/css/style.css', './assets/css/print.css',
  './assets/js/app.js',
  './i18n/bn.json', './i18n/en.json',
  './tariffs/tariffs.json', './data/appliances.json',
  './manifest.json',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
