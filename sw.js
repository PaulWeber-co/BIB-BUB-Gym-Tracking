/* Service worker — offline support.

   Assets are fetched network first. A cache-first strategy once shipped a
   fresh index.html together with stale scripts, which left the app blank;
   the network is now always asked first and the cache is only the offline
   fallback. Asset URLs additionally carry ?v=VERSION, so a cache from an
   older release can never answer a request from a newer one.

   VERSION must match the ?v= query in index.html. */

const VERSION = '3.1.0';
const CACHE = `gym-${VERSION}`;

const ASSETS = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    `css/style.css?v=${VERSION}`,
    ...[
        'theme', 'store', 'stats', 'charts', 'muscles', 'ui', 'nutrition', 'picker',
        'workout', 'routines', 'history', 'trends', 'exercises', 'settings',
        'summary', 'app',
    ].map(name => `js/${name}.js?v=${VERSION}`),
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .catch(() => { /* a missing asset must not block the update */ })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(request, copy));
                }
                return response;
            })
            .catch(async () => {
                const cached = await caches.match(request);
                if (cached) return cached;
                if (request.mode === 'navigate') {
                    return (await caches.match('index.html')) || (await caches.match('./'));
                }
                return Response.error();
            })
    );
});
