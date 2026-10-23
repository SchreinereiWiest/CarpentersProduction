import {
    getCachedProjectFile,
    getCachedProjectFileByKey,
    invalidateProjectFile,
    listProjectFiles,
    setCachedProjectFile
} from "./project-indexed-db.js";
import { touchCachedFile } from "./indexed-db.js";
import { downloadFile, readDownloadMetadata, uploadJSONFile } from "../api/file-api.js";
import { OfflineResourceUnavailableError } from "../offline/offline-errors.js";
import { createUuid } from "../utils/uuid.js";
import {
    dismissOfflineNotice,
    pushOfflineNotice,
    setSyncing
} from "../offline/offline-status.js";
import {
    CALCULATION_SOURCES,
    CALCULATION_SOURCE_HEADER
} from "@Engine/contracts/project/calculation-source.js";
import { isLocalProject } from "../offline/local-projects.js";

const memoryCache = new Map();
const activeRevalidations = new Map();
const activeUploads = new Map();
let activeSync = null;
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_CACHE_WINDOW_MS = 60 * 60 * 1000;
const cacheKey = (projectId, file) => `${projectId}:${file}`;
const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;
const newMutationId = createUuid;
const generatedPath = entry =>
    `/api/projects/generated/${entry.projectId}/${entry.file.replace(/\.json$/i, "")}`;

const remember = entry => {
    memoryCache.set(cacheKey(entry.projectId, entry.file), entry);
    return entry;
};

export const clearProjectMemoryCache = () => memoryCache.clear();

/** Entfernt eine einzelne Projektdatei aus Speicher und IndexedDB, damit ein serverseitig geänderter Inhalt sofort neu geladen werden kann. */
export const invalidateProjectFileCache = async ({ projectId, file }) => {
    memoryCache.delete(cacheKey(projectId, file));
    await invalidateProjectFile({ projectId, file });
};

const storeEntry = async entry => {
    const stored = remember(await setCachedProjectFile(entry));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offline-cache-changed"));
    }
    return stored;
};

const missingOfflineFile = (projectId, file) => {
    pushOfflineNotice({
        id: `missing-file:${projectId}:${file}`,
        type: "warning",
        title: "Offline-Inhalt nicht verfügbar",
        message: `${file} wurde für dieses Projekt nicht heruntergeladen.`,
        persistent: false
    });
    throw new OfflineResourceUnavailableError(`${projectId}/${file}`);
};

const isNetworkError = error => !error.response || error.code === "ERR_NETWORK";

const revalidateProjectFile = async ({
    projectId,
    file,
    cached,
    loadFromServer,
    force = false,
    redownload = false
}) => {
    if (isOffline()
        || !cached
        || ["local", "pending", "conflict", "error"].includes(cached.syncStatus)
        || !loadFromServer?.download?.getDescriptor) {
        return cached;
    }
    if (!force && Date.now() - (cached.lastValidatedAt ?? 0) < REVALIDATE_INTERVAL_MS) return cached;

    const descriptor = await loadFromServer.download.getDescriptor(loadFromServer.path, {
        offlineManagedResource: true,
        backgroundCacheValidation: true
    });
    if (descriptor.exists === false) {
        await invalidateProjectFile({ projectId, file });
        memoryCache.delete(cacheKey(projectId, file));
        window.dispatchEvent(new CustomEvent("s3-cache-updated", {
            detail: { scope: "project", projectId, file, removed: true }
        }));
        return null;
    }

    if (!redownload && descriptor.serverVersion != null && cached.serverVersion === descriptor.serverVersion) {
        return storeEntry({
            ...cached,
            fileId: cached.fileId ?? descriptor.fileId ?? null,
            calculationSource: descriptor.calculationSource ?? cached.calculationSource ?? null,
            sourcePath: loadFromServer.path,
            lastAccessedAt: Date.now(),
            lastValidatedAt: Date.now()
        });
    }

    const data = loadFromServer.download.fromDescriptor
        ? await loadFromServer.download.fromDescriptor(descriptor)
        : await loadFromServer.download(loadFromServer.path);
    if (data == null) return cached;
    const metadata = readDownloadMetadata(data);
    const version = metadata.serverVersion ?? descriptor.serverVersion ?? cached.serverVersion;
    const entry = await storeEntry({
        projectId,
        file,
        data,
        fileId: metadata.fileId ?? descriptor.fileId ?? cached.fileId ?? null,
        serverVersion: version,
        baseVersion: version,
        baseData: data,
        localRevision: 0,
        syncStatus: "synced",
        calculationSource: metadata.calculationSource ?? descriptor.calculationSource ?? null,
        sourcePath: loadFromServer.path,
        lastAccessedAt: Date.now(),
        lastValidatedAt: Date.now(),
        retentionProtected: cached.retentionProtected
    });
    window.dispatchEvent(new CustomEvent("s3-cache-updated", {
        detail: { scope: "project", projectId, file, version }
    }));
    return entry;
};

const queueProjectRevalidation = options => {
    const key = cacheKey(options.projectId, options.file);
    if (activeRevalidations.has(key)) {
        const active = activeRevalidations.get(key);
        return options.redownload
            ? active.then(() => queueProjectRevalidation(options))
            : active;
    }
    const task = revalidateProjectFile(options)
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

export const getProjectFile = async ({
    projectId,
    file,
    loadFromServer,
    includeCalculationSource = false
}) => {
    const result = (data, calculationSource = null) => includeCalculationSource
        ? { data, calculationSource }
        : data;
    const key = cacheKey(projectId, file);
    const memoryEntry = memoryCache.get(key);
    const cached = memoryEntry ?? await getCachedProjectFile({ projectId, file });
    const localOnly = await isLocalProject(projectId);
    if (cached) remember(cached);
    if (memoryEntry) void touchCachedFile(memoryEntry.key);

    if (localOnly) {
        return result(cached?.data ?? null, cached?.calculationSource);
    }

    if (cached && ["pending", "conflict", "error"].includes(cached.syncStatus)) {
        return result(cached.data, cached.calculationSource);
    }
    if (isOffline()) {
        if (cached) return result(cached.data, cached.calculationSource);
        return missingOfflineFile(projectId, file);
    }
    if (cached) {
        void queueProjectRevalidation({ projectId, file, cached, loadFromServer, force: true });
        return result(cached.data, cached.calculationSource);
    }

    try {
        const descriptorLoader = loadFromServer.download.getDescriptor;
        let descriptor = null;
        if (descriptorLoader) {
            descriptor = await descriptorLoader(loadFromServer.path, { offlineManagedResource: true });
            if (descriptor.exists === false) {
                return result(null, descriptor.calculationSource);
            }
        }

        const data = descriptor && loadFromServer.download.fromDescriptor
            ? await loadFromServer.download.fromDescriptor(descriptor)
            : await loadFromServer.download(loadFromServer.path);
        if (data == null) return result(null, descriptor?.calculationSource);
        const metadata = readDownloadMetadata(data);
        const entry = await storeEntry({
            projectId,
            file,
            data,
            fileId: metadata.fileId ?? descriptor?.fileId ?? null,
            serverVersion: metadata.serverVersion ?? descriptor?.serverVersion ?? null,
            baseVersion: metadata.serverVersion ?? descriptor?.serverVersion ?? null,
            baseData: data,
            localRevision: 0,
            syncStatus: "synced",
            calculationSource: metadata.calculationSource ?? descriptor?.calculationSource ?? null,
            sourcePath: loadFromServer.path,
            lastAccessedAt: Date.now(),
            lastValidatedAt: Date.now()
        });
        return result(entry.data, entry.calculationSource);
    } catch (error) {
        if (cached && (error.code === "ERR_NETWORK" || error.code === "OFFLINE_RESOURCE_UNAVAILABLE" || !error.response)) {
            return result(cached.data, cached.calculationSource);
        }
        if (!cached && (error.code === "ERR_NETWORK" || error.code === "OFFLINE_RESOURCE_UNAVAILABLE" || !error.response)) {
            return missingOfflineFile(projectId, file);
        }
        throw error;
    }
};

const markConflict = async (entry, error) => {
    let remoteData = null;
    try {
        remoteData = await downloadFile(generatedPath(entry));
    } catch (downloadError) {
        console.error("Serverversion konnte nicht für den Merge geladen werden", downloadError);
    }

    const remoteMetadata = readDownloadMetadata(remoteData);
    const latest = await getCachedProjectFileByKey(entry.key);
    const target = latest?.idempotencyKey && latest.idempotencyKey !== entry.idempotencyKey
        ? latest
        : entry;
    const conflict = await storeEntry({
        ...target,
        syncStatus: "conflict",
        remoteData,
        remoteVersion: remoteMetadata.serverVersion ?? error.response?.data?.currentVersion ?? null,
        error: error.response?.data ?? { error: "VERSION_CONFLICT" }
    });

    pushOfflineNotice({
        id: `conflict:${conflict.key}`,
        type: "error",
        title: "Synchronisierungskonflikt",
        message: `${conflict.file}: Lokale und Serverversion wurden verändert.`,
        actionLabel: "Merge öffnen",
        actionPath: `/Offline/Merge/${encodeURIComponent(conflict.key)}`,
        persistent: true
    });
    return conflict;
};

// Bei der allerersten automatischen Nesting-Berechnung ist eine inzwischen
// vorhandene Serverdatei kein fachlicher Bearbeitungskonflikt. Die Kennung
// entscheidet in diesem Fall eindeutig zugunsten des Servers.
const adoptServerCalculation = async (entry, error) => {
    let remoteData = null;
    try {
        remoteData = await downloadFile(generatedPath(entry));
    } catch (downloadError) {
        console.error("Server-Nesting konnte nicht übernommen werden", downloadError);
    }
    if (remoteData == null) return null;

    const remoteMetadata = readDownloadMetadata(remoteData);
    const version = remoteMetadata.serverVersion
        ?? error.response?.data?.currentVersion
        ?? null;
    const latest = await getCachedProjectFileByKey(entry.key);

    if (latest?.idempotencyKey && latest.idempotencyKey !== entry.idempotencyKey) {
        await storeEntry({
            ...latest,
            fileId: remoteMetadata.fileId ?? error.response?.data?.fileId ?? latest.fileId ?? null,
            serverVersion: version,
            baseVersion: version,
            baseData: remoteData,
            syncStatus: "pending",
            error: null
        });
        return { status: "superseded", data: latest.data, version };
    }

    await storeEntry({
        ...entry,
        data: remoteData,
        fileId: remoteMetadata.fileId ?? error.response?.data?.fileId ?? entry.fileId ?? null,
        serverVersion: version,
        baseVersion: version,
        baseData: remoteData,
        localRevision: 0,
        syncStatus: "synced",
        updatedLocallyAt: null,
        idempotencyKey: null,
        remoteData: null,
        remoteVersion: null,
        error: null,
        calculationSource: CALCULATION_SOURCES.SERVER
    });
    dismissOfflineNotice(`conflict:${entry.key}`);
    return {
        status: "synced",
        calculationSource: CALCULATION_SOURCES.SERVER,
        data: remoteData,
        version
    };
};

const sendEntry = async (entry, upload = uploadJSONFile) => {
    try {
        const response = await upload(generatedPath(entry), entry.data, {
            headers: {
                "If-Match": `"${entry.baseVersion ?? 0}"`,
                "Idempotency-Key": entry.idempotencyKey,
                ...(entry.calculationSource
                    ? { [CALCULATION_SOURCE_HEADER]: entry.calculationSource }
                    : {})
            }
        });
        const version = response.version ?? response.fileEntry?.serverVersion ?? entry.serverVersion;
        const latest = await getCachedProjectFileByKey(entry.key);

        if (latest?.idempotencyKey && latest.idempotencyKey !== entry.idempotencyKey) {
            await storeEntry({
                ...latest,
                fileId: response.fileId ?? response.fileEntry?.id ?? latest.fileId ?? null,
                serverVersion: version,
                baseVersion: version,
                baseData: entry.data,
                syncStatus: "pending",
                error: null
            });
            return { ...response, status: "superseded", data: latest.data };
        }

        await storeEntry({
            ...entry,
            fileId: response.fileId ?? response.fileEntry?.id ?? entry.fileId ?? null,
            serverVersion: version,
            baseVersion: version,
            baseData: entry.data,
            localRevision: 0,
            syncStatus: "synced",
            updatedLocallyAt: null,
            idempotencyKey: null,
            remoteData: null,
            remoteVersion: null,
            error: null
        });
        dismissOfflineNotice(`sync-error:${entry.key}`);
        return {
            ...response,
            data: entry.data,
            calculationSource: entry.calculationSource
        };
    } catch (error) {
        if (error.response?.status === 412 || error.response?.data?.error === "VERSION_CONFLICT") {
            const serverOwnsInitialCalculation = entry.calculationSource === CALCULATION_SOURCES.CLIENT
                && (entry.baseVersion ?? 0) === 0
                && error.response?.data?.calculationSource === CALCULATION_SOURCES.SERVER;
            if (serverOwnsInitialCalculation) {
                const adopted = await adoptServerCalculation(entry, error);
                if (adopted) return adopted;
            }
            await markConflict(entry, error);
            return { status: "conflict" };
        }
        const latest = await getCachedProjectFileByKey(entry.key);
        const target = latest?.idempotencyKey && latest.idempotencyKey !== entry.idempotencyKey
            ? latest
            : entry;
        if (!error.response || error.code === "ERR_NETWORK" || isOffline()) {
            await storeEntry({ ...target, syncStatus: "pending", error: null });
            pushOfflineNotice({
                id: "offline-pending",
                type: "info",
                title: "Lokal gespeichert",
                message: "Änderungen warten auf eine Internetverbindung.",
                persistent: true
            });
            return { status: "pending", offline: true };
        }

        await storeEntry({ ...target, syncStatus: "error", error: error.response?.data ?? error.message });
        pushOfflineNotice({
            id: `sync-error:${entry.key}`,
            type: "error",
            title: "Synchronisierung fehlgeschlagen",
            message: `${entry.file} konnte nicht gespeichert werden.`,
            persistent: true
        });
        throw error;
    }
};

const queueProjectUpload = (entry, upload = uploadJSONFile) => {
    const previous = activeUploads.get(entry.key) ?? Promise.resolve();
    const task = previous
        .catch(() => null)
        .then(async () => {
            if (isOffline()) return { status: "pending", offline: true };
            const latest = await getCachedProjectFileByKey(entry.key);
            if (!latest || !["pending", "error"].includes(latest.syncStatus)) {
                return { status: latest?.syncStatus ?? "missing" };
            }
            return sendEntry(latest, upload);
        })
        .catch(error => {
            console.error(`Hintergrund-Synchronisierung für ${entry.file} fehlgeschlagen`, error);
            return { status: "error", error };
        })
        .finally(() => {
            if (activeUploads.get(entry.key) === task) activeUploads.delete(entry.key);
        });
    activeUploads.set(entry.key, task);
    return task;
};

export const uploadProjectFile = async ({
    projectId,
    file,
    data,
    uploadFunction,
    calculationSource = null
}) => {
    const current = await getCachedProjectFile({ projectId, file });
    const localOnly = await isLocalProject(projectId);
    const entry = await storeEntry({
        projectId,
        file,
        data,
        serverVersion: current?.serverVersion ?? null,
        baseVersion: current?.baseVersion ?? current?.serverVersion ?? 0,
        baseData: current?.baseData ?? current?.data ?? null,
        localRevision: (current?.localRevision ?? 0) + 1,
        syncStatus: localOnly ? "local" : "pending",
        updatedLocallyAt: new Date().toISOString(),
        // Jeder neue lokale Bearbeitungsstand erhält einen eigenen Schlüssel.
        // Nur automatische Wiederholungen desselben Eintrags verwenden ihn
        // erneut, damit eine verlorene Serverantwort sicher replaybar bleibt.
        idempotencyKey: newMutationId(),
        calculationSource,
        sourcePath: current?.sourcePath ?? `/api/projects/generated/${projectId}/${file.replace(/\.json$/i, "")}`,
        retentionProtected: current?.retentionProtected
    });

    if (localOnly) {
        return { status: "local", localOnly: true, data };
    }

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

    const syncPromise = queueProjectUpload(entry, uploadFunction.upload);
    return { status: "pending", queued: true, data, syncPromise };
};

export const uploadLocalProjectFiles = async projectId => {
    const entries = await listProjectFiles({ projectId });

    for (const entry of entries) {
        if (entry.syncStatus === "synced") continue;

        const pending = await storeEntry({
            ...entry,
            fileId: null,
            serverVersion: null,
            baseVersion: 0,
            baseData: null,
            syncStatus: "pending",
            idempotencyKey: entry.idempotencyKey ?? newMutationId(),
            error: null
        });
        const response = await sendEntry(pending);
        if (["conflict", "pending", "error"].includes(response?.status)) {
            throw new Error(`${entry.file} konnte nicht hochgeladen werden.`);
        }
    }
};

const runPendingProjectSync = async () => {
    if (isOffline()) return { synced: 0, conflicts: 0, errors: 0 };
    const entries = await listProjectFiles({ statuses: ["pending", "error"] });
    if (!entries.length) return { synced: 0, conflicts: 0, errors: 0 };

    setSyncing(true);
    const result = { synced: 0, conflicts: 0, errors: 0 };
    try {
        for (const entry of entries) {
            try {
                const response = await queueProjectUpload(entry);
                if (response.status === "conflict") result.conflicts += 1;
                else if (response.status === "pending") result.errors += 1;
                else if (response.status === "error") result.errors += 1;
                else result.synced += 1;
            } catch {
                result.errors += 1;
            }
        }

        if (result.synced > 0 && result.conflicts === 0 && result.errors === 0) {
            dismissOfflineNotice("offline-pending");
            pushOfflineNotice({
                id: `sync-success:${Date.now()}`,
                type: "success",
                title: "Synchronisierung erfolgreich",
                message: `${result.synced} Änderung${result.synced === 1 ? "" : "en"} wurden übertragen.`,
                persistent: false
            });
        }
        return result;
    } finally {
        setSyncing(false);
    }
};

export const syncPendingProjectFiles = () => {
    if (activeSync) return activeSync;
    activeSync = runPendingProjectSync().finally(() => {
        activeSync = null;
    });
    return activeSync;
};

export const refreshCachedProjectFiles = async ({
    force = false,
    includeInactive = false,
    redownload = false
} = {}) => {
    const result = { total: 0, refreshed: 0, failed: 0 };
    if (isOffline()) return result;
    const now = Date.now();
    const entries = await listProjectFiles();
    for (const cached of entries) {
        if (["local", "pending", "conflict", "error"].includes(cached.syncStatus)) continue;
        if (!includeInactive
            && now - (cached.lastAccessedAt ?? cached.cachedAt ?? 0) > ACTIVE_CACHE_WINDOW_MS) continue;
        const path = cached.sourcePath ?? generatedPath(cached);
        result.total += 1;
        const refreshed = await queueProjectRevalidation({
            projectId: cached.projectId,
            file: cached.file,
            cached,
            force,
            redownload,
            loadFromServer: { download: downloadFile, path }
        });
        if (refreshed?.cacheRefreshFailed) result.failed += 1;
        else result.refreshed += 1;
    }
    return result;
};

export const resolveProjectFileConflict = async (key, mergedData) => {
    const conflict = await getCachedProjectFileByKey(key);
    if (!conflict || conflict.syncStatus !== "conflict") {
        throw new Error("Der Synchronisierungskonflikt existiert nicht mehr.");
    }

    const pending = await storeEntry({
        ...conflict,
        data: mergedData,
        baseData: conflict.remoteData,
        baseVersion: conflict.remoteVersion,
        serverVersion: conflict.remoteVersion,
        localRevision: (conflict.localRevision ?? 0) + 1,
        syncStatus: "pending",
        updatedLocallyAt: new Date().toISOString(),
        idempotencyKey: newMutationId(),
        remoteData: null,
        remoteVersion: null,
        error: null
    });
    return sendEntry(pending);
};

export const getProjectFileSyncEntry = getCachedProjectFileByKey;
