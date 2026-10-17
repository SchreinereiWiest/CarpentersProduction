const DB_NAME = "carpentersproduction";
export const STORE_NAME = "projectFiles";
export const API_STORE_NAME = "apiResponses";
export const OFFLINE_PROJECT_STORE_NAME = "offlineProjects";
export const META_STORE_NAME = "metadata";
const DB_VERSION = 2;

export const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(API_STORE_NAME)) {
            db.createObjectStore(API_STORE_NAME, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(OFFLINE_PROJECT_STORE_NAME)) {
            db.createObjectStore(OFFLINE_PROJECT_STORE_NAME, { keyPath: "projectId" });
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
            db.createObjectStore(META_STORE_NAME, { keyPath: "key" });
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const globalKey = file => `global:${file}`;

export const getCachedGlobalFile = async ({ file }) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .get(globalKey(file));
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
};

export const setCachedGlobalFile = async ({
    file,
    data,
    version = null,
    fileId = null,
    sourcePath = null,
    lastAccessedAt = Date.now(),
    lastValidatedAt = Date.now()
}) => {
    const db = await openDb();
    const entry = {
        key: globalKey(file),
        file,
        data,
        version: version ?? Date.now(),
        fileId,
        sourcePath,
        lastAccessedAt,
        lastValidatedAt,
        cachedAt: Date.now(),
        scope: "global"
    };

    return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readwrite")
            .objectStore(STORE_NAME)
            .put(entry);
        request.onsuccess = () => resolve(entry);
        request.onerror = () => reject(request.error);
    });
};

const cacheEntryMatchesChange = (entry, change) => {
    if (change.fileId && entry.fileId === change.fileId) return true;
    if (entry.scope === "project") {
        return change.projectId === entry.projectId && change.fileName === entry.file;
    }
    if (entry.scope === "global" && change.cacheFile) {
        return entry.file === change.cacheFile;
    }
    return entry.scope === "asset" && change.fileId === entry.fileId;
};

export const markCachedFileStale = async change => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        let affected = 0;
        const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
        const request = store.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return resolve(affected);
            const entry = cursor.value;
            const hasLocalChanges = entry.scope === "project"
                && ["pending", "conflict", "error"].includes(entry.syncStatus);
            if (cacheEntryMatchesChange(entry, change) && !hasLocalChanges) {
                affected += 1;
                if (change.action === "deleted") {
                    cursor.delete();
                } else {
                    cursor.update({
                        ...entry,
                        lastValidatedAt: 0,
                        announcedServerVersion: change.serverVersion ?? null
                    });
                }
            }
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
};

export const listCachedGlobalFiles = async () => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const entries = [];
        const request = db.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return resolve(entries);
            if (cursor.value.scope === "global") entries.push(cursor.value);
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
};

export const invalidateGlobalFile = async ({ file }) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, "readwrite")
            .objectStore(STORE_NAME)
            .delete(globalKey(file));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
