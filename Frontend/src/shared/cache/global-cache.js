import {
    getCachedGlobalFile,
    invalidateGlobalFile,
    listCachedGlobalFiles,
    setCachedGlobalFile
} from "./indexed-db.js";
import { downloadFile, readDownloadMetadata } from "../api/file-api.js";
import { OfflineResourceUnavailableError } from "../offline/offline-errors.js";
import { pushOfflineNotice } from "../offline/offline-status.js";

export const S3_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_CACHE_WINDOW_MS = 60 * 60 * 1000;
const memoryCache = new Map();
const activeRevalidations = new Map();
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

const storeGlobalEntry = async ({ file, data, version, fileId = null, sourcePath, lastValidatedAt = Date.now() }) => {
    const entry = await setCachedGlobalFile({
        file,
        data,
        version,
        fileId,
        sourcePath,
        lastAccessedAt: Date.now(),
        lastValidatedAt
    });
    memoryCache.set(keyFor(file), entry);
    return entry;
};

const revalidateGlobalFile = async ({ file, cached, loadFromServer, force = false, redownload = false }) => {
    if (isOffline() || !cached || !loadFromServer?.download?.getDescriptor) return cached;
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
            lastValidatedAt: Date.now()
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
        sourcePath: loadFromServer.path
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
    const cached = memoryCache.get(key) ?? await getCachedGlobalFile({ file });
    if (cached) {
        memoryCache.set(key, cached);
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

export const uploadGlobalFile = async ({ file, data, uploadFunction }) => {
    const response = await uploadFunction.upload(uploadFunction.path, data);
    const version = response?.version ?? response?.fileEntry?.serverVersion ?? Date.now();
    await storeGlobalEntry({
        file,
        data,
        version,
        fileId: response?.fileId ?? response?.fileEntry?.id ?? null,
        sourcePath: uploadFunction.sourcePath ?? uploadFunction.path
    });
    return response;
};

export const clearGlobalMemoryCache = () => memoryCache.clear();
