import { createUuid } from "../utils/uuid.js";

let state = {
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    pendingRequests: 0,
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
export const beginNetworkRequest = () => emit({ pendingRequests: state.pendingRequests + 1 });
export const endNetworkRequest = () => emit({ pendingRequests: Math.max(0, state.pendingRequests - 1) });
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
