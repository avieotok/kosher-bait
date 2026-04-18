// Service Worker for כושר בבית PWA
// Provides offline support and caching

const CACHE_NAME = 'kosher-bait-v1';
const ASSETS = [
  './',
  './fitness_app.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Heebo:wght@300;400;500;700&display=swap',
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => {
        console.log('[SW] Some assets failed to cache:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Return cached version, but also update in background
          fetch(event.request).then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
          }).catch(() => {});
          return cached;
        }

        // Not cached - fetch from network
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // If both cache and network fail, return a basic offline page
          return new Response('אין חיבור לאינטרנט. ניתן לגשת לאפליקציה כשתהיה בחיבור.', {
            status: 503,
            statusText: 'Offline',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8',
            }),
          });
        });
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Focus existing window if available
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      // Or open a new one
      if (clients.openWindow) {
        return clients.openWindow('./fitness_app.html');
      }
    })
  );
});
