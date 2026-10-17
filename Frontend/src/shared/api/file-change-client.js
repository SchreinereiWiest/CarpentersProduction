import { markCachedFileStale } from "../cache/indexed-db.js";
import { clearGlobalMemoryCache } from "../cache/global-cache.js";
import { markServerReachable, verifyServerConnection } from "./http-client.js";
import { clearProjectMemoryCache } from "../cache/project-cache.js";
import { refreshActiveS3Caches } from "../cache/cache-refresh.js";

export const connectFileChangeEvents = () => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return () => {};

    const source = new EventSource("/api/files/events", { withCredentials: true });

    source.onopen = () => {
        markServerReachable();
        // Nach einem Reconnect werden auch Ereignisse aufgeholt, die während
        // der Unterbrechung nicht live empfangen werden konnten.
        void refreshActiveS3Caches({ force: true });
    };
    source.onerror = () => {
        void verifyServerConnection();
    };
    source.addEventListener("file-changed", event => {
        void (async () => {
            try {
                const change = JSON.parse(event.data);
                const affected = await markCachedFileStale(change);
                if (!affected) return;

                clearGlobalMemoryCache();
                clearProjectMemoryCache();
                window.dispatchEvent(new CustomEvent("s3-cache-invalidated", { detail: change }));
                await refreshActiveS3Caches({ force: true });
            } catch (error) {
                console.warn("Dateiänderung konnte nicht in den lokalen Cache übernommen werden", error);
            }
        })();
    });

    return () => source.close();
};
