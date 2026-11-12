// sw.js — PulseMarkets Service Worker
// Cache-first for static assets, network-first for data

const CACHE_NAME = 'pulsemarkets-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for data

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/market-data.js',
  '/js/watchlist.js',
  '/js/alerts.js',
  '/js/paper-trading.js',
  '/js/insider-trading.js',
  '/manifest.json',
];

// ── Install: pre-cache shell ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first strategy for static, bypass for external ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, or external data APIs
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && url.origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── Push Notifications (future-ready) ───────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'PulseMarkets', body: 'Market update' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/img/icon-192.png',
      badge: '/img/icon-192.png',
      tag: 'pulsemarkets-alert',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
