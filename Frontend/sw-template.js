/* eslint-disable no-undef */
const CACHE_VERSION = "__BUILD_ID__";
const DEVELOPMENT = CACHE_VERSION === "development";
const SHELL_CACHE = `carpentersproduction-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `carpentersproduction-assets-${CACHE_VERSION}`;
const SHELL_URLS = __PRECACHE_URLS__;

self.addEventListener("install", event => {
    event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => ![SHELL_CACHE, ASSET_CACHE].includes(key)).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);

    // API-Daten werden versioniert in IndexedDB verwaltet. Der Service Worker
    // darf hier keine möglicherweise veralteten Antworten dazwischenschieben.
    if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            const cache = await caches.open(SHELL_CACHE);
            const cached = await cache.match("/index.html");
            const refresh = fetch(request).then(response => {
                if (response.ok) cache.put("/index.html", response.clone());
                return response;
            }).catch(() => null);
            event.waitUntil(refresh);
            return cached || await refresh || Response.error();
        })());
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith((async () => {
            const cache = await caches.open(ASSET_CACHE);
            const cached = await cache.match(request) || await caches.match(request);
            if (DEVELOPMENT) {
                try {
                    const response = await fetch(request);
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                } catch {
                    return cached || Response.error();
                }
            }
            if (cached) return cached;
            const response = await fetch(request);
            if (response.ok) cache.put(request, response.clone());
            return response;
        })());
    }
});
