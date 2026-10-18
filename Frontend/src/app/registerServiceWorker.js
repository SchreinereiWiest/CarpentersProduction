export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(async () => {
        if (!import.meta.env.DEV || !("caches" in window)) return;
        await navigator.serviceWorker.ready;
        const cache = await caches.open("carpentersproduction-assets-development");
        const resourceUrls = performance.getEntriesByType("resource")
          .map(entry => new URL(entry.name, window.location.origin))
          .filter(url => url.origin === window.location.origin
            && !url.pathname.startsWith("/api/")
            && url.pathname !== "/sw.js")
          .map(url => url.href);
        await Promise.allSettled([...new Set(resourceUrls)].map(url => cache.add(url)));
      })
      .catch(error => console.error("Service Worker konnte nicht registriert werden", error));
  });
}
