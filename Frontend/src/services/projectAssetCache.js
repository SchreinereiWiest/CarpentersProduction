import axios from "axios";
import {
    getCachedProjectAsset,
    invalidateProjectAsset,
    listProjectAssets,
    setCachedProjectAsset
} from "./projectIndexDb.js";
import { OfflineResourceUnavailableError } from "./offlineErrors.js";
import { pushOfflineNotice } from "./offlineStatus.js";

const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_CACHE_WINDOW_MS = 60 * 60 * 1000;
const objectUrls = new Map();
const retiredObjectUrls = new Set();
const activeRevalidations = new Map();
const offline = () => typeof navigator !== "undefined" && !navigator.onLine;
const isNetworkError = error => !error.response || error.code === "ERR_NETWORK";

const descriptorFor = async (file, backgroundCacheValidation = false) => {
    const response = await axios.get(`/api/files/download/${file.id}`, {
        withCredentials: true,
        ...(backgroundCacheValidation ? { backgroundCacheValidation: true } : {})
    });
    return response.data;
};

const fileFromEntry = entry => ({
    id: entry.fileId,
    fileName: entry.fileName,
    mimeType: entry.mimeType,
    projectId: entry.projectId
});

const retireObjectUrl = fileId => {
    const url = objectUrls.get(fileId);
    if (!url) return;
    retiredObjectUrls.add(url);
    objectUrls.delete(fileId);
};

const downloadAsset = async (projectId, file, descriptor = null) => {
    const currentDescriptor = descriptor ?? await descriptorFor(file);
    const response = await fetch(currentDescriptor.url);
    if (response.ok === false) throw new Error(`Datei konnte nicht geladen werden (${response.status})`);
    const blob = typeof response.blob === "function"
        ? await response.blob()
        : new Blob([await response.text()], {
            type: currentDescriptor.mimeType || file.mimeType || "application/octet-stream"
        });
    return setCachedProjectAsset({
        projectId: projectId || file.projectId || currentDescriptor.projectId || null,
        file: {
            ...file,
            fileName: file.fileName || currentDescriptor.fileName,
            mimeType: file.mimeType || currentDescriptor.mimeType
        },
        blob,
        serverVersion: currentDescriptor.serverVersion,
        lastAccessedAt: Date.now(),
        lastValidatedAt: Date.now()
    });
};

const revalidateAsset = async ({ cached, file, projectId, force = false, redownload = false }) => {
    if (offline() || !cached?.blob) return cached;
    if (!force && Date.now() - (cached.lastValidatedAt ?? 0) < REVALIDATE_INTERVAL_MS) return cached;

    let descriptor;
    try {
        descriptor = await descriptorFor(file, true);
    } catch (error) {
        if (error.response?.status !== 404) throw error;
        await invalidateProjectAsset(file.id);
        retireObjectUrl(file.id);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("s3-cache-updated", {
                detail: { scope: "asset", fileId: file.id, removed: true }
            }));
        }
        return null;
    }
    if (!redownload && descriptor.serverVersion != null && cached.serverVersion === descriptor.serverVersion) {
        return setCachedProjectAsset({
            projectId: projectId || cached.projectId,
            file: { ...fileFromEntry(cached), ...file },
            blob: cached.blob,
            serverVersion: cached.serverVersion,
            lastAccessedAt: Date.now(),
            lastValidatedAt: Date.now()
        });
    }

    const entry = await downloadAsset(projectId || cached.projectId, file, descriptor);
    retireObjectUrl(file.id);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("s3-cache-updated", {
            detail: {
                scope: "asset",
                fileId: file.id,
                projectId: entry.projectId,
                version: entry.serverVersion
            }
        }));
    }
    return entry;
};

const queueAssetRevalidation = options => {
    if (activeRevalidations.has(options.file.id)) {
        const active = activeRevalidations.get(options.file.id);
        return options.redownload
            ? active.then(() => queueAssetRevalidation(options))
            : active;
    }
    const task = revalidateAsset(options)
        .catch(error => {
            if (!isNetworkError(error)) {
                console.warn(`Cache-Prüfung für ${options.file.fileName || options.file.id} fehlgeschlagen`, error);
            }
            return { cacheRefreshFailed: true, error };
        })
        .finally(() => activeRevalidations.delete(options.file.id));
    activeRevalidations.set(options.file.id, task);
    return task;
};

export const cacheProjectAsset = async (projectId, file) => {
    const cached = await getCachedProjectAsset(file.id);
    if (cached?.blob) {
        if (!offline()) void queueAssetRevalidation({ cached, file, projectId, force: true });
        return cached;
    }
    if (offline()) throw new OfflineResourceUnavailableError(file.fileName || file.id);
    return downloadAsset(projectId, file);
};

export const getProjectAssetBlob = async file => {
    try {
        const entry = await cacheProjectAsset(file.projectId, file);
        return entry.blob;
    } catch (error) {
        const cached = await getCachedProjectAsset(file.id);
        if (cached?.blob) return cached.blob;
        if (!offline() && !isNetworkError(error)) throw error;
        pushOfflineNotice({
            id: `missing-asset:${file.id}`,
            type: "warning",
            title: "Offline-Inhalt nicht verfügbar",
            message: `${file.fileName || "Die Datei"} wurde nicht auf diesem Gerät gespeichert.`,
            persistent: false
        });
        throw error instanceof OfflineResourceUnavailableError
            ? error
            : new OfflineResourceUnavailableError(file.fileName || file.id);
    }
};

export const getProjectAssetUrl = async file => {
    if (objectUrls.has(file.id)) {
        const cached = await getCachedProjectAsset(file.id);
        if (cached && !offline()) {
            void queueAssetRevalidation({ cached, file, projectId: file.projectId, force: true });
        }
        return objectUrls.get(file.id);
    }
    const blob = await getProjectAssetBlob(file);
    const url = URL.createObjectURL(blob);
    objectUrls.set(file.id, url);
    return url;
};

export const refreshCachedProjectAssets = async ({
    force = false,
    includeInactive = false,
    redownload = false
} = {}) => {
    const result = { total: 0, refreshed: 0, failed: 0 };
    if (offline()) return result;
    const now = Date.now();
    const entries = await listProjectAssets();
    for (const cached of entries) {
        if (!includeInactive
            && now - (cached.lastAccessedAt ?? cached.cachedAt ?? 0) > ACTIVE_CACHE_WINDOW_MS) continue;
        result.total += 1;
        const refreshed = await queueAssetRevalidation({
            cached,
            file: fileFromEntry(cached),
            projectId: cached.projectId,
            force,
            redownload
        });
        if (refreshed?.cacheRefreshFailed) result.failed += 1;
        else result.refreshed += 1;
    }
    return result;
};

export const getS3FileBlob = getProjectAssetBlob;
export const getS3FileUrl = getProjectAssetUrl;

export const clearProjectAssetMemory = () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    retiredObjectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
    retiredObjectUrls.clear();
};
