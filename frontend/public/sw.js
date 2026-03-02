const CACHE_NAME = 'nutopiano-pwa-v2';
const APP_SHELL = ['/pos', '/manifest.webmanifest', '/nutopiano-logo.png'];

const isCacheableStaticAsset = (urlPathname) => {
  return (
    urlPathname.endsWith('.png') ||
    urlPathname.endsWith('.jpg') ||
    urlPathname.endsWith('.jpeg') ||
    urlPathname.endsWith('.webp') ||
    urlPathname.endsWith('.svg') ||
    urlPathname.endsWith('.woff2')
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('nutopiano-pwa-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Next.js build assets to avoid stale chunk/hash mismatches.
  if (url.pathname.startsWith('/_next/')) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('/pos');
      }),
    );
    return;
  }

  if (!isCacheableStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
