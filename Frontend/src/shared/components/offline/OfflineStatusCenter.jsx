import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import {
    dismissOfflineNotice,
    getOfflineStatusSnapshot,
    subscribeOfflineStatus
} from "../../offline/offline-status.js";
import { listProjectFiles } from "../../cache/project-indexed-db.js";
import { syncPendingProjectFiles } from "../../cache/project-cache.js";
import { listCachedGlobalFiles } from "../../cache/indexed-db.js";
import { syncPendingGlobalFiles } from "../../cache/global-cache.js";
import { redownloadCachedS3Files } from "../../cache/cache-refresh.js";

const GENERATED_FILE_LABELS = {
    aufmas: "Aufmaß",
    cabinet: "Schrankplanung",
    calculation: "Kalkulation",
    list: "Teileliste",
    nesting: "Nesting",
    procurement: "Einkauf"
};

const SETTINGS_LABELS = {
    cabinet: "Schrank-Einstellungen",
    cabinetPreset: "Schrank-Vorlagen",
    cache: "Offline-Einstellungen",
    cnc: "CNC-Einstellungen",
    company: "Firmeneinstellungen"
};

const decodePathPart = value => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const describeRequest = request => {
    const path = request.url || "Unbekannte Ressource";
    const generatedMatch = path.match(/\/api\/projects\/generated\/[^/]+\/([^/]+)/);
    if (generatedMatch) {
        return GENERATED_FILE_LABELS[generatedMatch[1]] || `Projektdatei „${decodePathPart(generatedMatch[1])}“`;
    }

    const settingMatch = path.match(/\/api\/settings\/([^/]+)/);
    if (settingMatch) {
        return SETTINGS_LABELS[settingMatch[1]] || `Einstellung „${decodePathPart(settingMatch[1])}“`;
    }

    if (path.includes("/api/files/project-attachment")) return "Projektanlage";
    if (path.includes("/api/files/shop-image")) return "Shopbild";
    if (path.includes("/api/files/")) return "Datei";
    if (path.includes("/api/time/")) return "Mitarbeiterkalender";
    if (path.includes("/api/material")) return "Materialdatenbank";
    if (path.includes("/api/projects")) return "Projektdaten";
    if (path.includes("/api/auth/me")) return "Verbindung und Anmeldung";

    const fileName = decodePathPart(path.split("/").filter(Boolean).at(-1) || "");
    return fileName || "Serverdaten";
};

export default function OfflineStatusCenter() {
    const status = useSyncExternalStore(
        subscribeOfflineStatus,
        getOfflineStatusSnapshot,
        getOfflineStatusSnapshot
    );
    const navigate = useNavigate();
    const [queue, setQueue] = useState({ pending: 0, conflicts: 0, firstConflictKey: null });
    const [showNetworkModal, setShowNetworkModal] = useState(false);

    useEffect(() => {
        const updateQueue = async () => {
            try {
                const [projectEntries, globalEntries] = await Promise.all([
                    listProjectFiles({ statuses: ["pending", "error", "conflict"] }),
                    listCachedGlobalFiles()
                ]);
                const entries = [
                    ...projectEntries,
                    ...globalEntries.filter(entry => ["pending", "error"].includes(entry.syncStatus))
                ];
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
        const synchronize = () => Promise.all([
            syncPendingProjectFiles(),
            syncPendingGlobalFiles()
        ]).catch(error => {
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

    const waitingForBrowserResponse = status.online && status.pendingRequests > 0;

    const handleStatusClick = () => {
        if (waitingForBrowserResponse) {
            setShowNetworkModal(true);
            return;
        }
        if (queue.conflicts > 0) {
            if (queue.firstConflictKey) {
                navigate(`/Offline/Merge/${encodeURIComponent(queue.firstConflictKey)}`);
            }
            return;
        }
        void redownloadCachedS3Files();
    };

    const actionLabel = waitingForBrowserResponse
        ? "Aktive Datenübertragungen anzeigen"
        : queue.conflicts > 0
            ? "Ersten Synchronisierungskonflikt öffnen"
            : status.online
                ? "Vorhandene Cache-Dateien neu herunterladen"
                : "Offline nicht verfügbar";

    return (
        <>
            <aside className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-2 pointer-events-none">
                <button
                    type="button"
                    onClick={handleStatusClick}
                    disabled={!waitingForBrowserResponse && (status.syncing || (!status.online && queue.conflicts === 0))}
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

            {showNetworkModal && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) setShowNetworkModal(false);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="active-transfers-title"
                        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
                    >
                        <header className="flex items-start justify-between gap-4 border-b border-gray-700 px-5 py-4">
                            <div>
                                <h2 id="active-transfers-title" className="text-base font-semibold">Aktive Datenübertragungen</h2>
                                <p className="mt-1 text-xs text-gray-400">Diese Vorgänge warten gerade auf eine Antwort des Servers.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNetworkModal(false)}
                                className="rounded-lg px-2 py-1 text-xl leading-none text-gray-400 hover:bg-gray-800 hover:text-white"
                                aria-label="Fenster schließen"
                            >
                                ×
                            </button>
                        </header>

                        <div className="max-h-[60vh] overflow-y-auto p-5">
                            {status.activeRequests.length === 0 ? (
                                <p className="rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-300">Alle Datenübertragungen sind abgeschlossen.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {status.activeRequests.map(request => (
                                        <li key={request.id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-medium text-gray-100">{describeRequest(request)}</span>
                                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${request.direction === "download" ? "bg-blue-950 text-blue-300" : "bg-emerald-950 text-emerald-300"}`}>
                                                    {request.direction === "download" ? "Herunterladen" : "Hochladen"}
                                                </span>
                                            </div>
                                            <div className="mt-2 truncate font-mono text-xs text-gray-500" title={request.url}>{request.url}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>,
                document.body
            )}
        </>
    );
}
