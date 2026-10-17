import { refreshCachedGlobalFiles, S3_REVALIDATE_INTERVAL_MS } from "./global-cache.js";
import { refreshCachedProjectAssets } from "./project-asset-cache.js";
import { refreshCachedProjectFiles } from "./project-cache.js";
import {
    getOfflineStatusSnapshot,
    pushOfflineNotice,
    setSyncing
} from "../offline/offline-status.js";
import { MANUAL_CACHE_REFRESH_COMPLETE_EVENT } from "./cache-events.js";

let installed = false;
let activeRefresh = null;

export const refreshActiveS3Caches = ({ force = false } = {}) => {
    if (activeRefresh || typeof navigator === "undefined" || !navigator.onLine) return activeRefresh;
    activeRefresh = Promise.allSettled([
        refreshCachedGlobalFiles({ force }),
        refreshCachedProjectFiles({ force }),
        refreshCachedProjectAssets({ force })
    ]).finally(() => {
        activeRefresh = null;
    });
    return activeRefresh;
};

const summarizeRefresh = settled => settled.reduce((summary, item) => {
    if (item.status === "rejected") {
        summary.failed += 1;
        return summary;
    }
    summary.total += item.value?.total ?? 0;
    summary.refreshed += item.value?.refreshed ?? 0;
    summary.failed += item.value?.failed ?? 0;
    return summary;
}, { total: 0, refreshed: 0, failed: 0 });

export const redownloadCachedS3Files = async () => {
    if (!getOfflineStatusSnapshot().online || !navigator.onLine) {
        pushOfflineNotice({
            id: "cache-redownload-offline",
            type: "warning",
            title: "Aktualisierung offline nicht möglich",
            message: "Die vorhandenen Cache-Dateien bleiben unverändert.",
            persistent: false
        });
        return { total: 0, refreshed: 0, failed: 0 };
    }

    if (activeRefresh) await activeRefresh;
    setSyncing(true);
    try {
        activeRefresh = Promise.allSettled([
            refreshCachedGlobalFiles({ force: true, includeInactive: true, redownload: true }),
            refreshCachedProjectFiles({ force: true, includeInactive: true, redownload: true }),
            refreshCachedProjectAssets({ force: true, includeInactive: true, redownload: true })
        ]);
        const summary = summarizeRefresh(await activeRefresh);

        if (summary.total === 0) {
            pushOfflineNotice({
                id: "cache-redownload-empty",
                type: "info",
                title: "Keine Cache-Dateien vorhanden",
                message: "Es wurden keine zusätzlichen Dateien heruntergeladen.",
                persistent: false
            });
        } else if (summary.failed > 0) {
            pushOfflineNotice({
                id: "cache-redownload-incomplete",
                type: "warning",
                title: "Cache teilweise aktualisiert",
                message: `${summary.refreshed} von ${summary.total} Dateien wurden neu geladen.`,
                persistent: false
            });
        } else {
            pushOfflineNotice({
                id: `cache-redownload-success:${Date.now()}`,
                type: "success",
                title: "Cache aktualisiert",
                message: `${summary.refreshed} Datei${summary.refreshed === 1 ? "" : "en"} wurden neu geladen.`,
                persistent: false
            });
        }
        if (summary.refreshed > 0) {
            window.dispatchEvent(new CustomEvent(
                MANUAL_CACHE_REFRESH_COMPLETE_EVENT,
                { detail: summary }
            ));
        }
        return summary;
    } finally {
        activeRefresh = null;
        setSyncing(false);
    }
};

export const installS3CacheRefresh = () => {
    if (installed || typeof window === "undefined") return;
    installed = true;

    window.setInterval(() => {
        void refreshActiveS3Caches();
    }, S3_REVALIDATE_INTERVAL_MS);

    window.addEventListener("online", () => {
        void refreshActiveS3Caches({ force: true });
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void refreshActiveS3Caches();
    });
};
