// ---------------------------------------------------------------
// sw.js — service worker: zorgt dat de app ook zonder internet werkt.
// Werkwijze: eerst het netwerk proberen (zo krijg je altijd de
// nieuwste versie), en als dat niet lukt de bewaarde kopie tonen.
//
// Belangrijk: we vragen de bestanden op met cache: 'no-cache'.
// Zonder dat houdt de iPhone een bestand tot 10 minuten vast en
// zie je een nieuwe versie niet meteen.
// ---------------------------------------------------------------

const CACHE = 'tabata-timer-v6';

const FILES = [
  './',
  './index.html',
  './css/app.css',
  './css/hulp.css',
  './hulp/',
  './js/app.js',
  './js/store.js',
  './js/images.js',
  './js/share.js',
  './js/library.js',
  './js/library-art.js',
  './js/timer.js',
  './js/sound.js',
  './manifest.webmanifest',
  './version.json',
  './assets/logo-pvmt.png',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))));
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
  // Filmpjes laten we met rust: die haalt de browser zelf in stukjes op en bewaren we niet.
  if (request.headers.has('range') || new URL(request.url).pathname.endsWith('.mp4')) return;

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
