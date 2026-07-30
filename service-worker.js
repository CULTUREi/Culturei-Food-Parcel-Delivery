// Service Worker for Culturei Deliveries PWA

const CACHE_NAME = 'culturei-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/offline.html'
];

// Install event - cache important files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!event.request.url.startsWith(self.location.origin)) {
              return response;
            }
            
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            const accept = event.request.headers.get('accept');
            if (accept && accept.includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Culturei Deliveries',
        body: event.data.text() || 'New update from your delivery!',
        icon: '/icons/icon-192x192.png'
      };
    }
  }

  const options = {
    body: data.body || 'Your order is being delivered!',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Culturei Deliveries', options)
  );
});

// Notification click handler - opens the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});