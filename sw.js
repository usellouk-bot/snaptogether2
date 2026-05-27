const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'momenpix-' + CACHE_VERSION;

// התקנה — דלג מיד לגרסה החדשה
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// הפעלה — מחק cache ישן
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// fetch — תמיד מהרשת, לא מה-cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(() => new Response('Offline'))
  );
});
