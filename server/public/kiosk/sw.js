// Picture cache for the menu: resized pictures (/img/...) and uploads are kept on the device (cache-first),
// so after the first visit the menu shows instantly, even on a slow connection. Everything else goes to the network.
const CACHE = 'lartisan-pictures-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !(url.pathname.startsWith('/img/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/shared/'))) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request); if (hit) return hit;
    const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res;
  }));
});
