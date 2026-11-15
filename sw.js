// ---------------------------------------------------------------
// sw.js — service worker: zorgt dat de app ook zonder internet werkt.
// Werkwijze: eerst het netwerk proberen (zo krijg je altijd de
// nieuwste versie), en als dat niet lukt de bewaarde kopie tonen.
// ---------------------------------------------------------------

const CACHE = 'tabata-timer-v1';

const FILES = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/timer.js',
  './js/sound.js',
  './manifest.webmanifest',
  './assets/logo-pvmt.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
