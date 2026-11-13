/* eslint-disable no-undef */
const CACHE_VERSION = "__BUILD_ID__";
const CACHE_SCHEMA_VERSION = "3";
const DEVELOPMENT = CACHE_VERSION === "development";
const SHELL_CACHE = `carpentersproduction-shell-${CACHE_SCHEMA_VERSION}-${CACHE_VERSION}`;
const ASSET_CACHE = `carpentersproduction-assets-${CACHE_SCHEMA_VERSION}-${CACHE_VERSION}`;
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

    // PDF.js startet seinen Worker als JavaScript-Modul. Firefox behandelt
    // Fehler aus einem zwischengeschalteten Cache hier besonders strikt und
    // kann anschließend auch den Fake-Worker nicht dynamisch importieren.
    // Der gehashte Worker darf deshalb direkt über Nginx/HTTP-Cache laufen.
    if (
        url.origin === self.location.origin
        && url.pathname.startsWith("/assets/")
        && url.pathname.endsWith(".mjs")
    ) return;

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
            const networkFirst = DEVELOPMENT;
            if (networkFirst) {
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
