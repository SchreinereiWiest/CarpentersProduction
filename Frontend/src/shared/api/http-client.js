import axios from "axios";
import {
    cacheApiResponse,
    clearOfflineData,
    getCachedApiResponse,
    shouldCacheApiResponse
} from "../offline/offline-repository.js";
import {
    beginNetworkRequest,
    dismissOfflineNotice,
    endNetworkRequest,
    getOfflineStatusSnapshot,
    pushOfflineNotice,
    setNetworkOnline
} from "../offline/offline-status.js";
import { OfflineResourceUnavailableError } from "../offline/offline-errors.js";

let installed = false;

const isNetworkFailure = error => !error.response || error.code === "ERR_NETWORK";
const isCanceledRequest = error => (
    axios.isCancel(error)
    || error.code === "ERR_CANCELED"
    || error.config?.signal?.aborted === true
);
const isOfflineCacheResponse = response => (
    response.request?.fromOfflineCache
    || response.headers?.["x-offline-cache"] === "true"
);

export const markServerReachable = () => {
    if (getOfflineStatusSnapshot().online) return;
    setNetworkOnline(true);
    window.dispatchEvent(new Event("offline-network-restored"));
};

export const verifyServerConnection = async () => {
    try {
        await axios.get("/api/auth/me", {
            withCredentials: true,
            skipOfflineCache: true
        });
    } catch {
        // Der Interceptor unterscheidet eine echte HTTP-Fehlerantwort von einem
        // Verbindungsfehler und setzt den Zustand entsprechend.
    }
    return getOfflineStatusSnapshot().online;
};

export const installNetworkClient = () => {
    if (installed || typeof window === "undefined") return;
    installed = true;

    axios.interceptors.request.use(config => {
        config.__offlineRequestId = beginNetworkRequest({
            method: config.method,
            url: config.url
        });
        config.__offlineTracked = true;
        return config;
    });

    axios.interceptors.response.use(async response => {
        if (response.config.__offlineTracked) {
            endNetworkRequest(response.config.__offlineRequestId);
        }
        dismissOfflineNotice(`offline-write:${response.config.url}`);
        if (!isOfflineCacheResponse(response)
            && !response.config.backgroundCacheValidation) {
            markServerReachable();
        }
        if (String(response.config.url).includes("/api/auth/logout")) {
            await clearOfflineData();
        }
        try {
            if (String(response.config.method).toLowerCase() === "get"
                && await shouldCacheApiResponse(response.config.url)) {
                await cacheApiResponse(response.config.url, response.data, response.config.params);
            }
        } catch (cacheError) {
            console.warn("API-Antwort konnte nicht offline gespeichert werden", cacheError);
        }
        return response;
    }, async error => {
        const config = error.config ?? {};
        if (config.__offlineTracked) endNetworkRequest(config.__offlineRequestId);

        // Ein bewusst per AbortController abgebrochener Request ist kein
        // Verbindungsfehler. Das passiert z. B. beim Strict-Mode-Remount der
        // Managementansichten und darf weder den Offline-Status ändern noch
        // eine Warnung über fehlenden Offline-Inhalt erzeugen.
        if (isCanceledRequest(error)) {
            return Promise.reject(error);
        }

        if (!isNetworkFailure(error)) {
            // Auch 401/403/500 beweisen, dass der Server erreichbar ist.
            markServerReachable();
            return Promise.reject(error);
        }

        setNetworkOnline(false);

        if (String(config.method).toLowerCase() === "get") {
            if (config.offlineManagedResource
                || String(config.url).includes("/api/files/download/")
                || String(config.url).includes("/api/projects/generated/")
                || String(config.url).includes("/api/settings/")
                || config.skipOfflineCache) {
                return Promise.reject(error);
            }
            let cached = null;
            try {
                cached = await getCachedApiResponse(config.url, config.params);
            } catch (cacheError) {
                console.warn("Offline-API-Cache konnte nicht gelesen werden", cacheError);
            }
            if (cached) {
                return {
                    data: cached.data,
                    status: 200,
                    statusText: "OK (offline)",
                    headers: { "x-offline-cache": "true" },
                    config,
                    request: { fromOfflineCache: true }
                };
            }

            const unavailable = new OfflineResourceUnavailableError(config.url);
            pushOfflineNotice({
                id: `offline-missing:${config.url}`,
                type: "warning",
                title: "Offline-Inhalt nicht verfügbar",
                message: "Die angeforderte Ressource wurde auf diesem Gerät nicht gespeichert.",
                persistent: false
            });
            return Promise.reject(unavailable);
        }

        if (String(config.url).includes("/api/projects/generated/")) {
            return Promise.reject(error);
        }
        pushOfflineNotice({
            id: `offline-write:${config.url}`,
            type: "error",
            title: "Änderung nicht übertragen",
            message: "Die Serveranfrage konnte offline nicht ausgeführt werden.",
            persistent: true
        });
        return Promise.reject(error);
    });

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
        const [input, options] = args;
        const requestId = beginNetworkRequest({
            method: options?.method ?? input?.method,
            url: typeof input === "string" || input instanceof URL ? input : input?.url
        });
        try {
            const response = await originalFetch(...args);
            markServerReachable();
            return response;
        } catch (error) {
            setNetworkOnline(false);
            throw error;
        } finally {
            endNetworkRequest(requestId);
        }
    };

    window.addEventListener("online", () => {
        void verifyServerConnection();
    });
    window.addEventListener("offline", () => setNetworkOnline(false));
    void verifyServerConnection();
};
