const CACHE_VERSION = 'v1';
const STATIC_CACHE = `cashlytics-static-${CACHE_VERSION}`;
const API_CACHE = `cashlytics-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/~offline';

// Install: Offline-Seite vorhalten
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/favicon.ico', '/site.webmanifest']))
      .then(() => self.skipWaiting()),
  );
});

// Activate: Alte Caches aufräumen
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: Caching-Strategien nach Route
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET, nur Same-Origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Next.js HMR / Dev-Overhead überspringen
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // /_next/static/ — Cache-first (Inhalts-Hash im Dateinamen = immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // /api/ — Network-first, max. 10 s, dann Cache (max. 5 Min. alt)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, { maxAgeSeconds: 300, timeoutMs: 10_000 }));
    return;
  }

  // Alle anderen Seiten — Network-first, bei Fehler Offline-Seite
  event.respondWith(networkFirst(request, STATIC_CACHE, { fallback: OFFLINE_URL }));
});

// Cache-first: aus Cache liefern, bei Miss netzwerken und cachen
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// Network-first: Netzwerk bevorzugt, Timeout optional, Cache als Fallback
async function networkFirst(request, cacheName, { maxAgeSeconds = 0, timeoutMs = 0, fallback = null } = {}) {
  const cache = await caches.open(cacheName);

  try {
    let fetchPromise = fetch(request);

    if (timeoutMs > 0) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      );
      fetchPromise = Promise.race([fetchPromise, timeout]);
    }

    const response = await fetchPromise;
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);

    if (cached) {
      if (maxAgeSeconds > 0) {
        const dateHeader = cached.headers.get('date');
        if (dateHeader) {
          const ageSeconds = (Date.now() - new Date(dateHeader).getTime()) / 1000;
          if (ageSeconds > maxAgeSeconds) {
            if (fallback) return (await caches.match(fallback)) ?? new Response('Offline', { status: 503 });
          }
        }
      }
      return cached;
    }

    if (fallback) return (await caches.match(fallback)) ?? new Response('Offline', { status: 503 });
    return new Response('Offline', { status: 503 });
  }
}
