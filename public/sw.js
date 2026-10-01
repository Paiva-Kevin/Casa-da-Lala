const CACHE_NAME = 'casa-da-lala-offline-v21';
const FONT_CACHE_NAME = 'casa-da-lala-fonts-v4';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      let hadLegacyCache = false;

      await Promise.all(
        cacheNames.map(async (name) => {
          if (name !== CACHE_NAME && name !== FONT_CACHE_NAME) {
            if (
              name.includes('workbox') ||
              name.includes('casa-da-lala-offline')
            ) {
              hadLegacyCache = true;
            }
            await caches.delete(name);
          }
        })
      );

      await self.clients.claim();

      // If this client was previously stuck on an old Workbox or offline cache,
      // notify all open windows and navigate them to the fresh network build.
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        client.postMessage({
          type: 'SW_UPDATED_FORCE_RELOAD',
          version: CACHE_NAME,
          hadLegacyCache,
        });
        if (hadLegacyCache && 'navigate' in client) {
          try {
            await client.navigate(client.url);
          } catch {
            // ignore navigation restriction if any
          }
        }
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests, API endpoints, Vite dev modules, or Google/Firebase APIs
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('__vite') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit')
  ) {
    return;
  }

  // Cache-First strategy for Google Fonts only
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Navigation requests (HTML): Strict Network-First (bypassing HTTP cache) with Offline Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy.clone());
              cache.put('/index.html', copy);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return Response.error();
        })
    );
    return;
  }

  // Same-origin static assets: Strict Network-First with Offline Cache Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request, { cache: 'no-cache' });
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached || Response.error();
        }
      })
    );
  }
});

// Listen for Background Sync or messages from client to trigger Drive sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-google-drive') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_DRIVE_SYNC' });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
