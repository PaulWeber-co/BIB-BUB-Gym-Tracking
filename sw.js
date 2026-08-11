/* Service worker — makes the app usable without a connection.
   Bump CACHE when shipping new assets. */

const CACHE = 'gym-v3.0.0';

const ASSETS = [
    './',
    'index.html',
    'css/style.css',
    'js/store.js',
    'js/stats.js',
    'js/charts.js',
    'js/muscles.js',
    'js/ui.js',
    'js/nutrition.js',
    'js/picker.js',
    'js/workout.js',
    'js/routines.js',
    'js/history.js',
    'js/trends.js',
    'js/exercises.js',
    'js/settings.js',
    'js/summary.js',
    'js/app.js',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Navigations: network first so a deploy is picked up, cache as fallback.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put('index.html', copy));
                    return response;
                })
                .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
        );
        return;
    }

    // Assets: cache first, refresh in the background.
    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE).then(cache => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
