import {
    getCachedGlobalFile,
    invalidateGlobalFile,
    listCachedGlobalFiles,
    setCachedGlobalFile,
    touchCachedFile
} from "./indexed-db.js";
import { downloadFile, readDownloadMetadata, uploadJSONFile } from "../api/file-api.js";
import { OfflineResourceUnavailableError } from "../offline/offline-errors.js";
import { createUuid } from "../utils/uuid.js";
import {
    dismissOfflineNotice,
    pushOfflineNotice
} from "../offline/offline-status.js";

export const S3_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_CACHE_WINDOW_MS = 60 * 60 * 1000;
const memoryCache = new Map();
const activeRevalidations = new Map();
const activeUploads = new Map();
const keyFor = file => `global:${file}`;
const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;
const isNetworkError = error => !error.response || error.code === "ERR_NETWORK";
const settingsPaths = new Map([
    ["settings-company.json", "/api/settings/company"],
    ["settings-cabinet.json", "/api/settings/cabinet"],
    ["settings-cabinetPreset.json", "/api/settings/cabinetPreset"],
    ["settings-nesting.json", "/api/settings/nesting"],
    ["settings-cnc.json", "/api/settings/cnc"],
    ["settings-cache.json", "/api/settings/cache"]
]);

const sourcePathFor = entry => {
    if (entry.sourcePath) return entry.sourcePath;
    if (settingsPaths.has(entry.file)) return settingsPaths.get(entry.file);
    const weekMatch = String(entry.file).match(/^weekData:([^:]+):(\d{4}-\d{2}-\d{2})$/);
    return weekMatch ? `/api/time/downloadWeek/${weekMatch[1]}/${weekMatch[2]}` : null;
};

const publishUpdate = detail => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("s3-cache-updated", { detail }));
    }
};

const storeGlobalEntry = async ({
    file,
    data,
    version,
    fileId = null,
    sourcePath,
    uploadPath = null,
    syncStatus = "synced",
    localRevision = 0,
    mutationId = null,
    updatedLocallyAt = null,
    error = null,
    lastValidatedAt = Date.now(),
    retentionProtected = false
}) => {
    const entry = await setCachedGlobalFile({
        file,
        data,
        version,
        fileId,
        sourcePath,
        uploadPath,
        syncStatus,
        localRevision,
        mutationId,
        updatedLocallyAt,
        error,
        lastAccessedAt: Date.now(),
        lastValidatedAt,
        retentionProtected
    });
    memoryCache.set(keyFor(file), entry);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offline-cache-changed"));
    }
    return entry;
};

const revalidateGlobalFile = async ({ file, cached, loadFromServer, force = false, redownload = false }) => {
    if (isOffline()
        || !cached
        || ["pending", "error"].includes(cached.syncStatus)
        || !loadFromServer?.download?.getDescriptor) return cached;
    if (!force && Date.now() - (cached.lastValidatedAt ?? 0) < S3_REVALIDATE_INTERVAL_MS) return cached;

    const descriptor = await loadFromServer.download.getDescriptor(loadFromServer.path, {
        offlineManagedResource: true,
        backgroundCacheValidation: true
    });
    if (descriptor.exists === false) {
        await invalidateGlobalFile({ file });
        memoryCache.delete(keyFor(file));
        publishUpdate({ scope: "global", file, removed: true });
        return null;
    }

    if (!redownload && descriptor.serverVersion != null && cached.version === descriptor.serverVersion) {
        return storeGlobalEntry({
            file,
            data: cached.data,
            version: cached.version,
            fileId: cached.fileId ?? descriptor.fileId ?? null,
            sourcePath: loadFromServer.path,
            lastValidatedAt: Date.now(),
            retentionProtected: cached.retentionProtected
        });
    }

    const data = loadFromServer.download.fromDescriptor
        ? await loadFromServer.download.fromDescriptor(descriptor)
        : await loadFromServer.download(loadFromServer.path);
    if (data == null) return cached;
    const metadata = readDownloadMetadata(data);
    const entry = await storeGlobalEntry({
        file,
        data,
        version: metadata.serverVersion ?? descriptor.serverVersion ?? Date.now(),
        fileId: metadata.fileId ?? descriptor.fileId ?? cached.fileId ?? null,
        sourcePath: loadFromServer.path,
        retentionProtected: cached.retentionProtected
    });
    publishUpdate({ scope: "global", file, version: entry.version });
    return entry;
};

const queueGlobalRevalidation = options => {
    const key = keyFor(options.file);
    if (activeRevalidations.has(key)) {
        const active = activeRevalidations.get(key);
        return options.redownload
            ? active.then(() => queueGlobalRevalidation(options))
            : active;
    }
    const task = revalidateGlobalFile(options)
        .catch(error => {
            if (!isNetworkError(error)) {
                console.warn(`Cache-Prüfung für ${options.file} fehlgeschlagen`, error);
            }
            return { cacheRefreshFailed: true, error };
        })
        .finally(() => activeRevalidations.delete(key));
    activeRevalidations.set(key, task);
    return task;
};

export const getGlobalFile = async ({ file, loadFromServer }) => {
    const key = keyFor(file);
    const memoryEntry = memoryCache.get(key);
    const cached = memoryEntry ?? await getCachedGlobalFile({ file });
    if (cached) {
        memoryCache.set(key, cached);
        if (memoryEntry) void touchCachedFile(key);
        if (["pending", "error"].includes(cached.syncStatus)) return cached.data;
        if (!isOffline()) void queueGlobalRevalidation({ file, cached, loadFromServer, force: true });
        return cached.data;
    }

    if (isOffline()) {
        pushOfflineNotice({
            id: `missing-global:${file}`,
            type: "warning",
            title: "Offline-Inhalt nicht verfügbar",
            message: `${file} wurde nicht auf diesem Gerät gespeichert.`,
            persistent: false
        });
        throw new OfflineResourceUnavailableError(file);
    }

    try {
        const descriptorLoader = loadFromServer.download.getDescriptor;
        const descriptor = descriptorLoader
            ? await descriptorLoader(loadFromServer.path, { offlineManagedResource: true })
            : null;
        if (descriptor?.exists === false) return null;
        const data = descriptor && loadFromServer.download.fromDescriptor
            ? await loadFromServer.download.fromDescriptor(descriptor)
            : await loadFromServer.download(loadFromServer.path);
        if (data == null) return null;
        const metadata = readDownloadMetadata(data);
        const entry = await storeGlobalEntry({
            file,
            data,
            version: metadata.serverVersion ?? descriptor?.serverVersion ?? Date.now(),
            fileId: metadata.fileId ?? descriptor?.fileId ?? null,
            sourcePath: loadFromServer.path
        });
        return entry.data;
    } catch (error) {
        if (isNetworkError(error)) {
            pushOfflineNotice({
                id: `missing-global:${file}`,
                type: "warning",
                title: "Offline-Inhalt nicht verfügbar",
                message: `${file} wurde nicht auf diesem Gerät gespeichert.`,
                persistent: false
            });
            throw new OfflineResourceUnavailableError(file);
        }
        throw error;
    }
};

export const refreshCachedGlobalFiles = async ({
    force = false,
    includeInactive = false,
    redownload = false
} = {}) => {
    const result = { total: 0, refreshed: 0, failed: 0 };
    if (isOffline()) return result;
    const now = Date.now();
    const entries = await listCachedGlobalFiles();
    for (const cached of entries) {
        const sourcePath = sourcePathFor(cached);
        if (!sourcePath
            || (!includeInactive && now - (cached.lastAccessedAt ?? cached.cachedAt ?? 0) > ACTIVE_CACHE_WINDOW_MS)) continue;
        result.total += 1;
        const refreshed = await queueGlobalRevalidation({
            file: cached.file,
            cached,
            force,
            redownload,
            loadFromServer: { download: downloadFile, path: sourcePath }
        });
        if (refreshed?.cacheRefreshFailed) result.failed += 1;
        else result.refreshed += 1;
    }
    return result;
};

const sendGlobalEntry = async (entry, upload = uploadJSONFile) => {
    try {
        const response = await upload(entry.uploadPath ?? entry.sourcePath, entry.data);
        const version = response?.version ?? response?.fileEntry?.serverVersion ?? Date.now();
        const latest = await getCachedGlobalFile({ file: entry.file });

        if (latest?.mutationId && latest.mutationId !== entry.mutationId) {
            await storeGlobalEntry({
                ...latest,
                version,
                fileId: response?.fileId ?? response?.fileEntry?.id ?? latest.fileId ?? null,
                syncStatus: "pending",
                error: null
            });
            return { ...response, status: "superseded", data: latest.data };
        }

        await storeGlobalEntry({
            ...entry,
            version,
            fileId: response?.fileId ?? response?.fileEntry?.id ?? entry.fileId ?? null,
            syncStatus: "synced",
            localRevision: 0,
            mutationId: null,
            updatedLocallyAt: null,
            error: null
        });
        dismissOfflineNotice(`global-sync-error:${entry.file}`);
        return { ...response, status: "synced", data: entry.data };
    } catch (error) {
        const pending = !error.response || error.code === "ERR_NETWORK" || isOffline();
        const latest = await getCachedGlobalFile({ file: entry.file });
        const target = latest?.mutationId && latest.mutationId !== entry.mutationId
            ? latest
            : entry;
        await storeGlobalEntry({
            ...target,
            syncStatus: pending ? "pending" : "error",
            error: pending ? null : (error.response?.data ?? error.message)
        });
        pushOfflineNotice({
            id: pending ? "offline-pending" : `global-sync-error:${entry.file}`,
            type: pending ? "info" : "error",
            title: pending ? "Lokal gespeichert" : "Synchronisierung fehlgeschlagen",
            message: pending
                ? "Änderungen warten auf eine Internetverbindung."
                : `${entry.file} konnte nicht übertragen werden.`,
            persistent: true
        });
        if (pending) return { status: "pending", offline: true };
        throw error;
    }
};

const queueGlobalUpload = (entry, upload = uploadJSONFile) => {
    const key = keyFor(entry.file);
    const previous = activeUploads.get(key) ?? Promise.resolve();
    const task = previous
        .catch(() => null)
        .then(async () => {
            if (isOffline()) return { status: "pending", offline: true };
            const latest = await getCachedGlobalFile({ file: entry.file });
            if (!latest || !["pending", "error"].includes(latest.syncStatus)) {
                return { status: latest?.syncStatus ?? "missing" };
            }
            return sendGlobalEntry(latest, upload);
        })
        .catch(error => {
            console.error(`Hintergrund-Synchronisierung für ${entry.file} fehlgeschlagen`, error);
            return { status: "error", error };
        })
        .finally(() => {
            if (activeUploads.get(key) === task) activeUploads.delete(key);
        });
    activeUploads.set(key, task);
    return task;
};

export const uploadGlobalFile = async ({ file, data, uploadFunction, retentionProtected = false }) => {
    const current = await getCachedGlobalFile({ file });
    const entry = await storeGlobalEntry({
        file,
        data,
        version: current?.version ?? null,
        fileId: current?.fileId ?? null,
        sourcePath: uploadFunction.sourcePath ?? uploadFunction.path,
        uploadPath: uploadFunction.path,
        syncStatus: "pending",
        localRevision: (current?.localRevision ?? 0) + 1,
        mutationId: createUuid(),
        updatedLocallyAt: new Date().toISOString(),
        error: null,
        retentionProtected
    });

    if (isOffline()) {
        pushOfflineNotice({
            id: "offline-pending",
            type: "info",
            title: "Lokal gespeichert",
            message: "Änderungen warten auf eine Internetverbindung.",
            persistent: true
        });
        return { status: "pending", offline: true, data };
    }

    const syncPromise = queueGlobalUpload(entry, uploadFunction.upload);
    return { status: "pending", queued: true, data, syncPromise };
};

export const syncPendingGlobalFiles = async () => {
    if (isOffline()) return { synced: 0, errors: 0 };
    const entries = (await listCachedGlobalFiles())
        .filter(entry => ["pending", "error"].includes(entry.syncStatus));
    const result = { synced: 0, errors: 0 };

    for (const entry of entries) {
        const response = await queueGlobalUpload(entry);
        if (["error", "pending"].includes(response.status)) result.errors += 1;
        else result.synced += 1;
    }

    if (result.synced > 0 && result.errors === 0) dismissOfflineNotice("offline-pending");
    return result;
};

export const clearGlobalMemoryCache = () => memoryCache.clear();
