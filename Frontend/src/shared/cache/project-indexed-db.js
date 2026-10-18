import { openDb, STORE_NAME } from "./indexed-db.js";

export const getProjectCacheKey = (projectId, file) => `project:${projectId}:${file}`;
export const getProjectAssetCacheKey = fileId => `asset:${fileId}`;

const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const getAndTouch = async key => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
            const entry = request.result;
            if (!entry) return resolve(null);
            const touched = { ...entry, lastAccessedAt: Date.now() };
            const update = store.put(touched);
            update.onsuccess = () => resolve(touched);
            update.onerror = () => reject(update.error);
        };
        request.onerror = () => reject(request.error);
    });
};

export const getCachedProjectFile = ({ projectId, file }) => getAndTouch(
    getProjectCacheKey(projectId, file)
);

export const getCachedProjectFileByKey = key => getAndTouch(key);

export const getCachedProjectAsset = async fileId => getCachedProjectFileByKey(
    getProjectAssetCacheKey(fileId)
);

export const invalidateProjectAsset = async fileId => {
    const db = await openDb();
    const request = db.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(getProjectAssetCacheKey(fileId));
    await requestResult(request);
};

export const setCachedProjectAsset = async ({
    projectId,
    file,
    blob,
    serverVersion = null,
    lastAccessedAt = Date.now(),
    lastValidatedAt = Date.now(),
    retentionProtected = false
}) => {
    const db = await openDb();
    const entry = {
        key: getProjectAssetCacheKey(file.id),
        projectId,
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType || blob.type,
        blob,
        serverVersion,
        lastAccessedAt,
        lastValidatedAt,
        retentionProtected,
        cachedAt: Date.now(),
        scope: "asset"
    };
    const request = db.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(entry);
    await requestResult(request);
    return entry;
};

export const setCachedProjectFile = async ({
    projectId,
    file,
    data,
    fileId = null,
    serverVersion = null,
    baseVersion = serverVersion,
    baseData = data,
    localRevision = 0,
    syncStatus = "synced",
    updatedLocallyAt = null,
    idempotencyKey = null,
    remoteData = null,
    remoteVersion = null,
    error = null,
    calculationSource = null,
    sourcePath = null,
    lastAccessedAt = Date.now(),
    lastValidatedAt = Date.now(),
    retentionProtected = false
}) => {
    const db = await openDb();
    const entry = {
        key: getProjectCacheKey(projectId, file),
        projectId,
        file,
        data,
        fileId,
        serverVersion,
        baseVersion,
        baseData,
        localRevision,
        syncStatus,
        updatedLocallyAt,
        idempotencyKey,
        remoteData,
        remoteVersion,
        error,
        calculationSource,
        sourcePath,
        lastAccessedAt,
        lastValidatedAt,
        retentionProtected,
        cachedAt: Date.now(),
        scope: "project"
    };
    const request = db.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(entry);
    await requestResult(request);
    return entry;
};

export const listProjectAssets = async () => {
    const db = await openDb();
    const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const entries = [];
        const request = store.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return resolve(entries);
            if (cursor.value.scope === "asset") entries.push(cursor.value);
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateCachedProjectFile = async (key, changes) => {
    const current = await getCachedProjectFileByKey(key);
    if (!current) return null;
    return setCachedProjectFile({ ...current, ...changes });
};

export const listProjectFiles = async ({ statuses, projectId } = {}) => {
    const db = await openDb();
    const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const entries = [];
        const request = store.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return resolve(entries);
            const entry = cursor.value;
            const projectMatches = !projectId || entry.projectId === projectId;
            const statusMatches = !statuses || statuses.includes(entry.syncStatus);
            if (entry.scope === "project" && projectMatches && statusMatches) entries.push(entry);
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
};

export const invalidateProjectFile = async ({ projectId, file }) => {
    const db = await openDb();
    const request = db.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(getProjectCacheKey(projectId, file));
    await requestResult(request);
};

const deleteMatchingEntries = async predicate => {
    const db = await openDb();
    const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return resolve();
            if (predicate(cursor.value)) cursor.delete();
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
};

export const invalidateProject = projectId => deleteMatchingEntries(
    entry => ["project", "asset"].includes(entry.scope) && entry.projectId === projectId
);

export const invalidateAllProjects = () => deleteMatchingEntries(
    entry => ["project", "asset"].includes(entry.scope)
);
