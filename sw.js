// Service Worker — תמיד מהרשת, מתעדכן אוטומטית

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // הודע לכל הטאבים שיש גרסה חדשה
        self.clients.matchAll({type:'window'}).then(clients => {
          clients.forEach(c => c.postMessage({type:'SW_UPDATED'}));
        });
      })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request, {cache:'no-store'}).catch(() => new Response('Offline'))
  );
});
