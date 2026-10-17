import axios from "axios";
import {
    API_STORE_NAME,
    META_STORE_NAME,
    OFFLINE_PROJECT_STORE_NAME,
    openDb,
    setCachedGlobalFile
} from "./globalIndexDb.js";
import { downloadFile, readDownloadMetadata } from "./apiTemplates.js";
import { invalidateAllProjects, setCachedProjectFile } from "./projectIndexDb.js";
import { cacheProjectAsset, clearProjectAssetMemory } from "./projectAssetCache.js";
import { clearProjectMemoryCache } from "./projectMemoryCache.js";

const OFFLINE_MODE_KEY = "carpentersproduction:offline-mode";
const GENERATED_NAMES = new Map([
    ["cabinet.json", "cabinet"],
    ["list.json", "list"],
    ["nesting.json", "nesting"],
    ["procurement.json", "procurement"],
    ["calculation.json", "calculation"]
]);

const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

export const createApiCacheKey = (url, params = {}) => {
    const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const parsed = new URL(url, base);
    Object.entries(params ?? {}).forEach(([key, value]) => {
        if (value != null) parsed.searchParams.set(key, value);
    });
    parsed.searchParams.sort();
    return `${parsed.pathname}${parsed.search}`;
};

export const isOfflineModeEnabled = () => {
    try {
        return localStorage.getItem(OFFLINE_MODE_KEY) === "true";
    } catch {
        return false;
    }
};

export const setOfflineModeEnabled = async enabled => {
    localStorage.setItem(OFFLINE_MODE_KEY, String(Boolean(enabled)));
    if (enabled && navigator.storage?.persist) {
        try {
            await navigator.storage.persist();
        } catch {
            // Einige Browser erlauben persistente Speicherung nur nach einer
            // eigenen Berechtigungsentscheidung. IndexedDB bleibt nutzbar.
        }
    }
    const db = await openDb();
    await requestResult(db.transaction(META_STORE_NAME, "readwrite")
        .objectStore(META_STORE_NAME)
        .put({ key: "offlineMode", value: Boolean(enabled), updatedAt: Date.now() }));
};

export const cacheApiResponse = async (url, data, params) => {
    const db = await openDb();
    const entry = {
        key: createApiCacheKey(url, params),
        url,
        data,
        cachedAt: Date.now()
    };
    await requestResult(db.transaction(API_STORE_NAME, "readwrite")
        .objectStore(API_STORE_NAME)
        .put(entry));
    return entry;
};

export const getCachedApiResponse = async (url, params) => {
    const db = await openDb();
    const entry = await requestResult(db.transaction(API_STORE_NAME, "readonly")
        .objectStore(API_STORE_NAME)
        .get(createApiCacheKey(url, params)));
    return entry ?? null;
};

export const registerOfflineProject = async project => {
    const db = await openDb();
    await requestResult(db.transaction(OFFLINE_PROJECT_STORE_NAME, "readwrite")
        .objectStore(OFFLINE_PROJECT_STORE_NAME)
        .put({
            projectId: project.id,
            title: project.title,
            status: project.status,
            downloadedAt: Date.now()
        }));
};

export const listOfflineProjects = async () => {
    const db = await openDb();
    const result = await requestResult(db.transaction(OFFLINE_PROJECT_STORE_NAME, "readonly")
        .objectStore(OFFLINE_PROJECT_STORE_NAME)
        .getAll());
    return result ?? [];
};

export const isProjectOffline = async projectId => {
    if (!projectId) return false;
    const db = await openDb();
    const result = await requestResult(db.transaction(OFFLINE_PROJECT_STORE_NAME, "readonly")
        .objectStore(OFFLINE_PROJECT_STORE_NAME)
        .get(projectId));
    return Boolean(result);
};

export const shouldCacheApiResponse = async url => {
    if (String(url).includes("/generated/")
        || String(url).includes("/files/download/")
        || String(url).includes("/api/settings/")) return false;
    // Die letzte serverseitig bestätigte Sitzung ermöglicht einen Reload der
    // bereits installierten Anwendung ohne Internetverbindung.
    if (String(url).includes("/api/auth/me")) return true;
    if (isOfflineModeEnabled()) return true;
    const projectMatch = String(url).match(/\/api\/projects\/(?:get|time)\/([^/?]+)/);
    if (projectMatch) return isProjectOffline(projectMatch[1]);
    return false;
};

const cacheBundleResponses = async bundle => {
    await cacheApiResponse("/api/materials/get", { materials: bundle.materials });
    await cacheApiResponse("/api/projects/getAll", { projects: bundle.projects });
    await cacheApiResponse("/api/projects/getActive", {
        projects: bundle.projects.filter(project => project.status === "active")
    });

    for (const project of bundle.projects) {
        await registerOfflineProject(project);
        await cacheApiResponse(`/api/projects/get/${project.id}`, { project });
        if (project.customer) {
            await cacheApiResponse(`/api/customers/get/${project.customer.id}`, {
                customer: project.customer
            });
        }
        await cacheApiResponse(
            `/api/projects/time/${project.id}`,
            project.timeEntries ?? []
        );
    }
};

export const downloadProjectData = async ({ mode, projectIds = [], onProgress }) => {
    const { data: bundle } = await axios.get("/api/projects/offline", {
        params: {
            mode,
            projectIds: mode === "selected" ? projectIds.join(",") : undefined
        }
    });

    await cacheBundleResponses(bundle);
    // Die letzte bestätigte Sitzung wird für den geschützten Offline-Start
    // benötigt. Erst nach der Projektregistrierung darf der Interceptor sie
    // gemäß der Cache-Regel speichern.
    await axios.get("/api/auth/me", { withCredentials: true });
    for (const settingName of ["company", "cabinet", "cabinetPreset", "nesting", "cnc"]) {
        try {
            const sourcePath = `/api/settings/${settingName}`;
            const content = await downloadFile(sourcePath);
            if (content != null) {
                await setCachedGlobalFile({
                    file: settingName === "company"
                        ? "settings-company.json"
                        : `settings-${settingName}.json`,
                    data: content,
                    version: readDownloadMetadata(content).serverVersion ?? Date.now(),
                    fileId: readDownloadMetadata(content).fileId ?? null,
                    sourcePath
                });
            }
        } catch {
            // Einzelne rollenbeschränkte Einstellungen blockieren den
            // Projekt-Download nicht; verfügbare Dateien werden weiter geladen.
        }
    }
    const generatedFiles = bundle.projects.flatMap(project =>
        (project.files ?? [])
            .filter(file => GENERATED_NAMES.has(file.fileName))
            .map(file => ({ project, file, name: GENERATED_NAMES.get(file.fileName) }))
    );
    const assetFiles = bundle.projects.flatMap(project =>
        (project.files ?? [])
            .filter(file => !GENERATED_NAMES.has(file.fileName))
            .map(file => ({ project, file }))
    );
    const totalFiles = generatedFiles.length + assetFiles.length;
    const failures = [];

    for (let index = 0; index < generatedFiles.length; index += 1) {
        const { project, file, name } = generatedFiles[index];
        onProgress?.({
            current: index + 1,
            total: totalFiles,
            label: `${project.title} · ${file.fileName}`
        });

        try {
            const sourcePath = `/api/projects/generated/${project.id}/${name}`;
            const content = await downloadFile(sourcePath);
            if (content == null) continue;
            const metadata = readDownloadMetadata(content);
            await setCachedProjectFile({
                projectId: project.id,
                file: file.fileName,
                data: content,
                fileId: metadata.fileId ?? file.id,
                serverVersion: metadata.serverVersion ?? file.serverVersion,
                baseVersion: metadata.serverVersion ?? file.serverVersion,
                baseData: content,
                syncStatus: "synced",
                sourcePath
            });
        } catch (error) {
            failures.push({ projectId: project.id, file: file.fileName, error: error.message });
        }
    }

    for (let index = 0; index < assetFiles.length; index += 1) {
        const { project, file } = assetFiles[index];
        onProgress?.({
            current: generatedFiles.length + index + 1,
            total: totalFiles,
            label: `${project.title} · ${file.fileName || file.originalName}`
        });
        try {
            await cacheProjectAsset(project.id, file);
        } catch (error) {
            failures.push({ projectId: project.id, file: file.fileName, error: error.message });
        }
    }

    return { bundle, failures };
};

const clearStore = async storeName => {
    const db = await openDb();
    await requestResult(db.transaction(storeName, "readwrite").objectStore(storeName).clear());
};

export const clearOfflineData = async () => {
    clearProjectMemoryCache();
    clearProjectAssetMemory();
    await invalidateAllProjects();
    await Promise.all([
        clearStore(API_STORE_NAME),
        clearStore(OFFLINE_PROJECT_STORE_NAME)
    ]);
    window.dispatchEvent(new Event("offline-cache-changed"));
};

export const getOfflineStorageSummary = async () => {
    const projects = await listOfflineProjects();
    const db = await openDb();
    const apiEntries = await requestResult(db.transaction(API_STORE_NAME, "readonly")
        .objectStore(API_STORE_NAME)
        .count());
    const storage = await navigator.storage?.estimate?.() ?? {};
    return {
        projects: projects.length,
        apiEntries,
        usageBytes: storage.usage ?? 0,
        quotaBytes: storage.quota ?? 0
    };
};
