import {
    API_STORE_NAME,
    OFFLINE_PROJECT_STORE_NAME,
    STORE_NAME,
    getCachedGlobalFile,
    getMetadata,
    openDb,
    setMetadata
} from "./indexed-db.js";
import { clearGlobalMemoryCache } from "./global-cache.js";
import { clearProjectMemoryCache } from "./project-cache.js";
import { clearProjectAssetMemory } from "./project-asset-cache.js";

export const DEFAULT_CACHE_RETENTION_DAYS = 30;
export const MIN_CACHE_RETENTION_DAYS = 1;
export const MAX_CACHE_RETENTION_DAYS = 3650;

const RETENTION_DAYS_KEY = "cacheRetentionDays";
const LAST_CLEANUP_KEY = "cacheRetentionLastCleanupAt";
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PROTECTED_SYNC_STATUSES = new Set(["pending", "conflict", "error"]);
const LEGACY_MANUAL_GLOBAL_FILES = new Set([
    "settings-company.json",
    "settings-cabinet.json",
    "settings-cabinetPreset.json",
    "settings-nesting.json",
    "settings-cnc.json"
]);

let installed = false;
let activeCleanup = null;

const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

export const normalizeCacheRetentionDays = value => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_CACHE_RETENTION_DAYS;
    return Math.min(MAX_CACHE_RETENTION_DAYS, Math.max(MIN_CACHE_RETENTION_DAYS, parsed));
};

export const setCacheRetentionDays = days => setMetadata(
    RETENTION_DAYS_KEY,
    normalizeCacheRetentionDays(days)
);

export const getCacheRetentionDays = async () => {
    const locallyConfigured = await getMetadata(RETENTION_DAYS_KEY);
    if (locallyConfigured != null) return normalizeCacheRetentionDays(locallyConfigured);

    const cachedSettings = await getCachedGlobalFile({ file: "settings-cache.json" });
    return normalizeCacheRetentionDays(cachedSettings?.data?.cacheRetentionDays);
};

const getManualProjectIds = async db => {
    const projects = await requestResult(db.transaction(OFFLINE_PROJECT_STORE_NAME, "readonly")
        .objectStore(OFFLINE_PROJECT_STORE_NAME)
        .getAll());
    return new Set((projects ?? []).map(project => String(project.projectId)));
};

const projectIdFromApiEntry = entry => {
    const match = String(entry.url ?? entry.key).match(/\/api\/projects\/(?:get|time)\/([^/?]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const isLegacyManualApiEntry = (entry, hasManualProjects) => {
    if (!hasManualProjects) return false;
    const url = String(entry.url ?? entry.key);
    return url.includes("/api/materials/get")
        || url.includes("/api/projects/getAll")
        || url.includes("/api/projects/getActive")
        || url.includes("/api/customers/get/");
};

const deleteUnusedEntries = ({ db, storeName, shouldDelete }) => new Promise((resolve, reject) => {
    let deleted = 0;
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).openCursor();
    request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (shouldDelete(cursor.value)) {
            cursor.delete();
            deleted += 1;
        }
        cursor.continue();
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve(deleted);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
});

const cleanup = async retentionDays => {
    const db = await openDb();
    const manualProjectIds = await getManualProjectIds(db);
    const hasManualProjects = manualProjectIds.size > 0;
    const cutoff = Date.now() - normalizeCacheRetentionDays(retentionDays) * 24 * 60 * 60 * 1000;
    const isUnused = entry => (entry.lastAccessedAt ?? entry.cachedAt ?? 0) < cutoff;

    const filesDeleted = await deleteUnusedEntries({
        db,
        storeName: STORE_NAME,
        shouldDelete: entry => {
            if (!isUnused(entry) || entry.retentionProtected) return false;
            if (entry.projectId != null && manualProjectIds.has(String(entry.projectId))) return false;
            if (entry.scope === "project" && PROTECTED_SYNC_STATUSES.has(entry.syncStatus)) return false;
            // Vor Einführung des Schutzmerkmals waren diese Einstellungen Teil
            // jedes manuellen Projekt-Downloads.
            if (hasManualProjects
                && entry.scope === "global"
                && LEGACY_MANUAL_GLOBAL_FILES.has(entry.file)) return false;
            return true;
        }
    });

    const apiEntriesDeleted = await deleteUnusedEntries({
        db,
        storeName: API_STORE_NAME,
        shouldDelete: entry => {
            if (!isUnused(entry) || entry.retentionProtected) return false;
            if (String(entry.url ?? entry.key).includes("/api/auth/me")) return false;
            const projectId = projectIdFromApiEntry(entry);
            if (projectId && manualProjectIds.has(String(projectId))) return false;
            return !isLegacyManualApiEntry(entry, hasManualProjects);
        }
    });

    if (filesDeleted > 0) {
        clearGlobalMemoryCache();
        clearProjectMemoryCache();
        clearProjectAssetMemory();
    }
    await setMetadata(LAST_CLEANUP_KEY, Date.now());
    if ((filesDeleted > 0 || apiEntriesDeleted > 0) && typeof window !== "undefined") {
        window.dispatchEvent(new Event("offline-cache-changed"));
    }
    return { filesDeleted, apiEntriesDeleted, retentionDays: normalizeCacheRetentionDays(retentionDays) };
};

export const runCacheCleanup = async ({ force = false, retentionDays } = {}) => {
    if (activeCleanup) return activeCleanup;
    if (!force) {
        const lastCleanupAt = await getMetadata(LAST_CLEANUP_KEY);
        if (lastCleanupAt && Date.now() - lastCleanupAt < CLEANUP_INTERVAL_MS) {
            return { skipped: true, filesDeleted: 0, apiEntriesDeleted: 0 };
        }
    }
    const configuredDays = retentionDays ?? await getCacheRetentionDays();
    activeCleanup = cleanup(configuredDays).finally(() => {
        activeCleanup = null;
    });
    return activeCleanup;
};

export const installCacheCleanup = () => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    window.setTimeout(() => void runCacheCleanup(), 2000);
    window.setInterval(() => void runCacheCleanup(), CLEANUP_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void runCacheCleanup();
    });
};
