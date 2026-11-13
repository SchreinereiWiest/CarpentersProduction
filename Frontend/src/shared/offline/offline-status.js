import { createUuid } from "../utils/uuid.js";

let state = {
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    pendingRequests: 0,
    activeRequests: [],
    syncing: false,
    notices: []
};

const listeners = new Set();
const emit = changes => {
    state = { ...state, ...changes };
    listeners.forEach(listener => listener());
};

export const subscribeOfflineStatus = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getOfflineStatusSnapshot = () => state;

const sanitizeRequestUrl = url => {
    const rawUrl = String(url ?? "");
    if (!rawUrl) return "Unbekannte Ressource";

    try {
        const parsed = new URL(rawUrl, "http://localhost");
        return parsed.pathname || "/";
    } catch {
        return rawUrl.split("?")[0].split("#")[0];
    }
};

export const beginNetworkRequest = ({ method = "GET", url } = {}) => {
    const normalizedMethod = String(method).toUpperCase();
    const request = {
        id: createUuid(),
        method: normalizedMethod,
        url: sanitizeRequestUrl(url),
        direction: ["GET", "HEAD"].includes(normalizedMethod) ? "download" : "upload",
        startedAt: Date.now()
    };
    const activeRequests = [...state.activeRequests, request];
    emit({ activeRequests, pendingRequests: activeRequests.length });
    return request.id;
};

export const endNetworkRequest = id => {
    const activeRequests = id
        ? state.activeRequests.filter(request => request.id !== id)
        : state.activeRequests.slice(1);
    emit({ activeRequests, pendingRequests: activeRequests.length });
};
export const setNetworkOnline = online => emit({ online });
export const setSyncing = syncing => emit({ syncing });

export const pushOfflineNotice = notice => {
    const normalized = {
        id: notice.id || createUuid(),
        type: notice.type || "info",
        persistent: notice.persistent ?? notice.type === "error",
        createdAt: Date.now(),
        ...notice
    };
    emit({
        notices: [...state.notices.filter(item => item.id !== normalized.id), normalized]
    });
    return normalized.id;
};

export const dismissOfflineNotice = id => emit({
    notices: state.notices.filter(notice => notice.id !== id)
});

export const clearTransientNotices = () => emit({
    notices: state.notices.filter(notice => notice.persistent)
});
