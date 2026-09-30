/**
 * FarmHub - Service Worker
 * Enables offline functionality
 */

// Bump CACHE_NAME whenever any file below changes, or installed clients keep
// serving the old copy (cache-first).
const CACHE_NAME = 'farmhub-v2';

// Paths are relative to the SW scope so the app also works from a subpath
// (e.g. GitHub Pages at /farmhub-web/). Keep in sync with index.html.
const STATIC_ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'css/style.css',
    'js/db.js',
    'js/components.js',
    'js/projections.js',
    'js/sync.js',
    'js/photos.js',
    'js/search.js',
    'js/pages.js',
    'js/app.js',
    'assets/icons/icon.svg',
    'assets/icons/icon-72.png',
    'assets/icons/icon-96.png',
    'assets/icons/icon-128.png',
    'assets/icons/icon-144.png',
    'assets/icons/icon-152.png',
    'assets/icons/icon-192.png',
    'assets/icons/icon-384.png',
    'assets/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            console.log('✓ Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests except for fonts and CDN
    const url = new URL(event.request.url);
    const isAllowedOrigin =
        url.origin === self.location.origin ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com' ||
        url.hostname === 'cdnjs.cloudflare.com';

    if (!isAllowedOrigin) return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((response) => {
                        // Cache successful same-origin and CORS responses. CORS is
                        // needed so font files (gstatic, Font Awesome webfonts)
                        // referenced by the precached CSS work offline.
                        if (!response || response.status !== 200 ||
                            (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        // Clone and cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page if available
                        if (event.request.mode === 'navigate') {
                            return caches.match('index.html');
                        }
                    });
            })
    );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncDataToServer());
    }
});

async function syncDataToServer() {
    // This would sync data to a cloud backend when we add one
    console.log('🔄 Background sync triggered');
    // TODO: Implement cloud sync
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
