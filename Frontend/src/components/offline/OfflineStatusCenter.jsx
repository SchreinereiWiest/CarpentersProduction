import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import {
    dismissOfflineNotice,
    getOfflineStatusSnapshot,
    subscribeOfflineStatus
} from "../../services/offlineStatus.js";
import { listProjectFiles } from "../../services/projectIndexDb.js";
import { syncPendingProjectFiles } from "../../services/projectMemoryCache.js";
import { redownloadCachedS3Files } from "../../services/s3CacheRefresh.js";

export default function OfflineStatusCenter() {
    const status = useSyncExternalStore(
        subscribeOfflineStatus,
        getOfflineStatusSnapshot,
        getOfflineStatusSnapshot
    );
    const navigate = useNavigate();
    const [queue, setQueue] = useState({ pending: 0, conflicts: 0, firstConflictKey: null });

    useEffect(() => {
        const updateQueue = async () => {
            try {
                const entries = await listProjectFiles({ statuses: ["pending", "error", "conflict"] });
                const conflicts = entries.filter(entry => entry.syncStatus === "conflict");
                setQueue({
                    pending: entries.filter(entry => entry.syncStatus !== "conflict").length,
                    conflicts: conflicts.length,
                    firstConflictKey: conflicts[0]?.key ?? null
                });
            } catch (error) {
                console.warn("Synchronisierungsstatus konnte nicht gelesen werden", error);
            }
        };
        updateQueue();
        window.addEventListener("offline-cache-changed", updateQueue);
        return () => window.removeEventListener("offline-cache-changed", updateQueue);
    }, []);

    useEffect(() => {
        const synchronize = () => syncPendingProjectFiles().catch(error => {
            console.warn("Synchronisierung konnte nicht gestartet werden", error);
        });
        window.addEventListener("online", synchronize);
        window.addEventListener("offline-network-restored", synchronize);
        if (navigator.onLine) synchronize();
        return () => {
            window.removeEventListener("online", synchronize);
            window.removeEventListener("offline-network-restored", synchronize);
        };
    }, []);

    useEffect(() => {
        const timers = status.notices
            .filter(notice => !notice.persistent)
            .map(notice => setTimeout(
                () => dismissOfflineNotice(notice.id),
                notice.durationMs ?? 5000
            ));
        return () => timers.forEach(clearTimeout);
    }, [status.notices]);

    const label = !status.online
        ? "Offline"
        : status.syncing
            ? "Synchronisiere"
            : queue.conflicts
                ? `${queue.conflicts} Konflikt${queue.conflicts === 1 ? "" : "e"}`
                : queue.pending
                    ? `${queue.pending} ausstehend`
                    : "Synchronisiert";

    const handleStatusClick = () => {
        if (queue.conflicts > 0) {
            if (queue.firstConflictKey) {
                navigate(`/Offline/Merge/${encodeURIComponent(queue.firstConflictKey)}`);
            }
            return;
        }
        void redownloadCachedS3Files();
    };

    const actionLabel = queue.conflicts > 0
        ? "Ersten Synchronisierungskonflikt öffnen"
        : status.online
            ? "Vorhandene Cache-Dateien neu herunterladen"
            : "Offline nicht verfügbar";

    return (
        <aside className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-2 pointer-events-none">
            <button
                type="button"
                onClick={handleStatusClick}
                disabled={status.syncing || (!status.online && queue.conflicts === 0)}
                title={actionLabel}
                aria-label={actionLabel}
                className="pointer-events-auto hidden items-center gap-2 rounded-full border border-gray-700 bg-gray-900/95 px-3 py-2 text-xs text-gray-200 shadow-xl backdrop-blur transition-colors enabled:hover:border-blue-500 enabled:hover:bg-gray-800 disabled:cursor-default sm:flex"
            >
                {(status.pendingRequests > 0 || status.syncing) && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-blue-400" aria-label="Browserantwort wird erwartet" />
                )}
                <span className={`h-2 w-2 rounded-full ${!status.online ? "bg-amber-400" : queue.conflicts ? "bg-red-400" : queue.pending ? "bg-blue-400" : "bg-green-400"}`} />
                <span>{!status.online ? "Offline" : status.pendingRequests > 0 ? "Browserantwort wird erwartet" : label}</span>
            </button>

            {status.notices.slice(-4).map(notice => (
                <div key={notice.id} className={`pointer-events-auto w-full rounded-xl border p-3 shadow-xl ${notice.type === "error" ? "border-red-800 bg-red-950/95 text-red-100" : notice.type === "warning" ? "border-amber-700 bg-amber-950/95 text-amber-100" : notice.type === "success" ? "border-green-800 bg-green-950/95 text-green-100" : "border-blue-800 bg-gray-900/95 text-gray-100"}`}>
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{notice.title}</div>
                            {notice.message && <div className="mt-1 text-xs opacity-80">{notice.message}</div>}
                            {notice.actionPath && (
                                <button
                                    type="button"
                                    onClick={() => navigate(notice.actionPath)}
                                    className="mt-2 rounded bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
                                >
                                    {notice.actionLabel || "Öffnen"}
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => dismissOfflineNotice(notice.id)}
                            className="rounded px-1.5 py-0.5 text-sm opacity-70 hover:bg-white/10 hover:opacity-100"
                            aria-label="Meldung schließen"
                        >
                            ×
                        </button>
                    </div>
                </div>
            ))}
        </aside>
    );
}
