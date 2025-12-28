/**
 * Service Worker for Block Canvas - Telegram Mini App
 * 
 * Purpose: Cache game resources for faster second load
 * Strategy: Cache-First with Network Fallback
 */

const CACHE_NAME = 'block-canvas-telegram-v1';
const CACHE_VERSION = 1;

// Core resources to pre-cache on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/application.js',
    '/src/polyfills.bundle.js',
    '/src/system.bundle.js',
    '/src/import-map.json',
    '/index.js'
];

// Resources to cache dynamically (on first request)
const CACHEABLE_PATTERNS = [
    /\.js$/,      // JavaScript files
    /\.css$/,     // Stylesheets
    /\.png$/,     // PNG images
    /\.jpg$/,     // JPG images
    /\.webp$/,    // WebP images
    /\.mp3$/,     // Audio files
    /\.ogg$/,     // Audio files
    /\.json$/,    // JSON config files
    /\.wasm$/     // WebAssembly
];

// URLs to never cache
const NEVER_CACHE = [
    /telegram\.org/,        // Telegram API
    /tganalytics\.xyz/,     // Telegram Analytics
    /api\./,                // Any API calls
    /\.php$/,               // PHP endpoints
    /cloudflare/,           // Cloudflare services
    /ws:/,                  // WebSocket
    /wss:/                  // Secure WebSocket
];

// Install: Pre-cache core resources
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Pre-caching core resources...');
                // Use addAll for atomic caching (all or nothing)
                return cache.addAll(PRECACHE_URLS).catch(err => {
                    console.warn('[SW] Some pre-cache items failed, continuing...', err);
                    // Fallback: cache individually, skip failures
                    return Promise.all(
                        PRECACHE_URLS.map(url =>
                            cache.add(url).catch(() => console.warn('[SW] Skip:', url))
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Pre-cache complete, skipping waiting...');
                return self.skipWaiting();
            })
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker v' + CACHE_VERSION);

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] Now controlling all clients');
            return self.clients.claim();
        })
    );
});

// Fetch: Cache-First Strategy
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip never-cache URLs
    if (NEVER_CACHE.some(pattern => pattern.test(request.url))) {
        return;
    }

    // Skip cross-origin requests (except CDN resources)
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                // Cache hit - return cached response
                // Also update cache in background (stale-while-revalidate)
                updateCacheInBackground(request);
                return cachedResponse;
            }

            // Cache miss - fetch from network and cache
            return fetchAndCache(request);
        }).catch(err => {
            console.warn('[SW] Fetch failed:', err);
            // Fallback for navigation requests
            if (request.mode === 'navigate') {
                return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
        })
    );
});

// Helper: Fetch and cache response
function fetchAndCache(request) {
    return fetch(request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
        }

        // Check if URL is cacheable
        const isCacheable = CACHEABLE_PATTERNS.some(pattern =>
            pattern.test(request.url)
        );

        if (isCacheable) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
            });
        }

        return response;
    });
}

// Helper: Update cache in background (stale-while-revalidate)
function updateCacheInBackground(request) {
    fetch(request).then(response => {
        if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
            });
        }
    }).catch(() => {
        // Silently fail - we already have cached version
    });
}

// Message handler for cache control
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

console.log('[SW] Service Worker script loaded');
