import { useEffect, useMemo, useRef, useState } from "react";

import {
    cleanupStorage,
    createDatabaseBackup,
    createShopDatabaseBackup,
    createStorageBackup,
    deleteStorageBackup,
    deleteStorageFolder,
    deleteStorageObject,
    getBackupDownload,
    getObjectDownload,
    importDatabaseBackup,
    importShopDatabaseBackup,
    importStorageBackup,
    loadBackups,
    loadStorageOverview,
    restoreStorageBackup
} from "../engine/storageAdminApi.js";

const formatBytes = value => {
    const bytes = Number(value || 0);
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: index ? 1 : 0 }).format(bytes / (1024 ** index))} ${units[index]}`;
};

const formatDate = value => value
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "–";

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

function Icon({ name, className = "h-5 w-5" }) {
    const paths = {
        storage: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
        folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>,
        file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></>,
        download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
        trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/></>,
        backup: <><path d="M4 7a8 8 0 1 1 1 10"/><path d="M4 12V7h5"/><path d="M12 8v5l3 2"/></>,
        upload: <><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></>,
        search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
        refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 11.9-2"/></>
    };
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function SummaryCard({ label, value, hint, tone = "blue", icon }) {
    const colors = {
        blue: "bg-blue-500/10 text-blue-300 ring-blue-500/20",
        violet: "bg-violet-500/10 text-violet-300 ring-violet-500/20",
        amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
        emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
    };
    return <div className="rounded-xl border border-gray-700/80 bg-gray-800 p-4">
        <div className="flex items-start justify-between gap-3">
            <div><div className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>
            <span className={`rounded-lg p-2 ring-1 ${colors[tone]}`}><Icon name={icon} /></span>
        </div>
        <p className="mt-2 text-xs text-gray-500">{hint}</p>
    </div>;
}

function ConfirmDialog({ title, children, confirmLabel, dangerous = false, typed = false, typedPhrase = "WIEDERHERSTELLEN", busy, onCancel, onConfirm }) {
    const [confirmation, setConfirmation] = useState("");
    const allowed = !typed || confirmation === typedPhrase;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}>
        <div role="dialog" aria-modal="true" aria-labelledby="storage-dialog-title" className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 id="storage-dialog-title" className="text-lg font-semibold">{title}</h2>
            <div className="mt-3 text-sm leading-6 text-gray-400">{children}</div>
            {typed && <label className="mt-5 block"><span className="mb-2 block text-xs font-medium text-gray-400">Zur Bestätigung <strong className="text-gray-200">{typedPhrase}</strong> eingeben</span><input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-sm outline-none focus:border-red-500" /></label>}
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50">Abbrechen</button>
                <button type="button" disabled={busy || !allowed} onClick={onConfirm} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${dangerous ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}>{busy ? "Wird ausgeführt …" : confirmLabel}</button>
            </div>
        </div>
    </div>;
}

function objectLabel(object) {
    return object.files[0]?.name || object.projectStorage[0]?.dataType || object.path.split("/").at(-1) || object.id;
}

function BackupTable({ backups, emptyMessage, databaseOnly = false, onDownload, onRestore, onDelete }) {
    return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-medium">Backup</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Umfang</th><th className="px-4 py-3 font-medium">Erstellt</th><th className="px-5 py-3 text-right font-medium">Aktionen</th></tr></thead><tbody className="divide-y divide-gray-700/70">
        {backups.map(backup => <tr key={backup.id} className="hover:bg-gray-700/30"><td className="px-5 py-4"><div className="font-medium text-gray-100">{backup.name}</div><div className="mt-1 text-xs text-gray-500">{backup.createdBy?.login || backup.createdBy?.email || "System"}{backup.restoredAt ? ` · Eingespielt ${formatDate(backup.restoredAt)}` : ""}</div></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${backup.status === "completed" ? "bg-emerald-950 text-emerald-300" : backup.status === "failed" ? "bg-red-950 text-red-300" : "bg-blue-950 text-blue-300"}`}>{backup.status === "completed" ? "Bereit" : backup.status === "failed" ? "Fehlgeschlagen" : "Wird erstellt"}</span></td><td className="px-4 py-4 text-gray-400">{formatBytes(backup.fileSize)} · {databaseOnly ? `${backup.tableCount} Tabellen` : `${backup.fileCount} Dateien`}</td><td className="px-4 py-4 whitespace-nowrap text-gray-400">{formatDate(backup.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button disabled={backup.status !== "completed"} type="button" title="Backup herunterladen" onClick={() => onDownload(backup)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"><Icon name="download" className="h-4 w-4"/></button><button disabled={backup.status !== "completed"} type="button" title="Backup wiederherstellen" onClick={() => onRestore(backup)} className="rounded-lg p-2 text-gray-400 hover:bg-blue-950/60 hover:text-blue-300 disabled:opacity-30"><Icon name="refresh" className="h-4 w-4"/></button><button type="button" title="Backup löschen" onClick={() => onDelete(backup)} className="rounded-lg p-2 text-gray-400 hover:bg-red-950/60 hover:text-red-300"><Icon name="trash" className="h-4 w-4"/></button></div></td></tr>)}
    </tbody></table>{!backups.length && <div className="p-10 text-center text-sm text-gray-500">{emptyMessage}</div>}</div>;
}

export default function StorageSettingsPanel() {
    const [overview, setOverview] = useState(null);
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [currentPath, setCurrentPath] = useState("");
    const [page, setPage] = useState(1);
    const [notice, setNotice] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [backupName, setBackupName] = useState("");
    const fileInput = useRef(null);
    const databaseFileInput = useRef(null);
    const shopDatabaseFileInput = useRef(null);

    const reload = async (options = {}) => {
        const nextPage = options.page ?? page;
        setLoading(true);
        try {
            const [storageData, backupData] = await Promise.all([
                loadStorageOverview({ page: nextPage, search: query, prefix: currentPath }),
                loadBackups()
            ]);
            setOverview(storageData);
            setBackups(backupData.backups);
        } catch (error) {
            setNotice({ type: "error", text: errorMessage(error, "Storage-Daten konnten nicht geladen werden.") });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void reload(); }, [page, query, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

    const directoryEntries = useMemo(() => {
        const entries = [];
        for (const object of overview?.objects || []) {
            const relativePath = currentPath && object.path.startsWith(`${currentPath}/`)
                ? object.path.slice(currentPath.length + 1)
                : object.path;
            // Wie in einem echten Dateiverzeichnis erscheinen hier nur direkte
            // Dateien. Inhalte tieferer Ebenen werden über deren Ordner geöffnet.
            if (relativePath.includes("/")) continue;
            for (const file of object.files) {
                entries.push({
                    id: `file-${file.id}`,
                    type: "file",
                    object,
                    file,
                    label: file.name || file.fileName
                });
            }
            for (const projectData of object.projectStorage) {
                entries.push({
                    id: `project-storage-${projectData.id}`,
                    type: "projectStorage",
                    object,
                    projectData,
                    label: projectData.dataType || object.path.split("/").at(-1)
                });
            }
            if (!object.files.length && !object.projectStorage.length) {
                entries.push({
                    id: `object-${object.id}`,
                    type: "orphan",
                    object,
                    label: object.path.split("/").at(-1) || object.id
                });
            }
        }
        return { folders: overview?.folders || [], entries };
    }, [overview, currentPath]);

    const run = async (operation, success) => {
        setBusy(true);
        setNotice(null);
        try {
            const result = await operation();
            setDialog(null);
            setNotice({ type: "success", text: typeof success === "function" ? success(result) : success });
            await reload();
        } catch (error) {
            setNotice({ type: "error", text: errorMessage(error, "Aktion fehlgeschlagen.") });
        } finally {
            setBusy(false);
        }
    };

    const download = async descriptorPromise => {
        try {
            const descriptor = await descriptorPromise;
            window.location.assign(descriptor.url);
        } catch (error) {
            setNotice({ type: "error", text: errorMessage(error, "Download konnte nicht gestartet werden.") });
        }
    };

    const importFile = (file, type = "full") => {
        if (!file) return;
        const dialogType = type === "database"
            ? "importDatabase"
            : type === "shop-database"
                ? "importShopDatabase"
                : "import";
        setDialog({ type: dialogType, file });
        const input = type === "database"
            ? databaseFileInput
            : type === "shop-database"
                ? shopDatabaseFileInput
                : fileInput;
        if (input.current) input.current.value = "";
    };

    const crumbs = currentPath ? currentPath.split("/") : [];
    const summary = overview?.summary || {};
    const fullBackups = backups.filter(backup => (backup.backupType || "full") === "full");
    const databaseBackups = backups.filter(backup => backup.backupType === "database");
    const shopDatabaseBackups = backups.filter(backup => backup.backupType === "shop-database");

    return <div className="responsive-settings-panel h-full overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Administration</div>
                    <h1 className="mt-1 text-2xl font-semibold">Storage</h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-400">Dateien und Betriebsdaten dieses Unternehmens verwalten, bereinigen und vollständig sichern.</p>
                </div>
                <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm hover:bg-gray-700 disabled:opacity-50"><Icon name="refresh" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Aktualisieren</button>
            </header>

            {notice && <div role="status" className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-200" : "border-red-800 bg-red-950/40 text-red-200"}`}><span>{notice.text}</span><button type="button" aria-label="Meldung schließen" onClick={() => setNotice(null)} className="text-lg leading-none opacity-70 hover:opacity-100">×</button></div>}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Belegter Speicher" value={formatBytes(summary.trackedBytes)} hint={`${summary.fileCount || 0} verwaltete Dateien`} icon="storage" />
                <SummaryCard label="Garage-Objekte" value={summary.objectCount || 0} hint={`${summary.projectStorageCount || 0} Projektdatensätze`} tone="violet" icon="file" />
                <SummaryCard label="Bereinigbar" value={summary.orphanCount || 0} hint="Objekte ohne Datenverknüpfung" tone="amber" icon="trash" />
                <SummaryCard label="Backups" value={backups.filter(item => item.status === "completed").length} hint={`${summary.pendingDeletionCount || 0} Löschvorgänge offen`} tone="emerald" icon="backup" />
            </div>

            <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <div className="border-b border-gray-700 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div><h2 className="font-semibold">Garage-Dateien</h2><p className="mt-1 text-sm text-gray-500">Verzeichnisansicht aller registrierten Dateien und Projekt-Datensätze.</p></div>
                        <button type="button" disabled={!summary.orphanCount || busy} onClick={() => setDialog({ type: "cleanup" })} className="inline-flex items-center gap-2 rounded-lg border border-amber-800/70 px-3.5 py-2 text-sm text-amber-300 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="trash" className="h-4 w-4" />Verwaiste Dateien bereinigen</button>
                    </div>
                    <form onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="mt-4 flex gap-2">
                        <label className="relative min-w-0 flex-1"><span className="sr-only">Dateien durchsuchen</span><Icon name="search" className="absolute left-3 top-2.5 h-5 w-5 text-gray-500"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Dateiname oder Pfad suchen …" className="w-full rounded-lg border border-gray-600 bg-gray-900 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-gray-600 focus:border-blue-500" /></label>
                        <button type="submit" className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">Suchen</button>
                    </form>
                </div>

                <nav aria-label="Dateipfad" className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-gray-700 bg-gray-900/50 px-4 text-sm">
                    <button type="button" onClick={() => { setCurrentPath(""); setPage(1); }} className="rounded px-2 py-1 text-blue-300 hover:bg-gray-700">Garage</button>
                    {crumbs.map((crumb, index) => <span key={`${crumb}-${index}`} className="flex items-center gap-1"><span className="text-gray-600">/</span><button type="button" onClick={() => { setCurrentPath(crumbs.slice(0, index + 1).join("/")); setPage(1); }} className="whitespace-nowrap rounded px-2 py-1 text-gray-300 hover:bg-gray-700">{crumb}</button></span>)}
                </nav>

                <div className="min-h-64 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Zuordnung</th><th className="px-4 py-3 font-medium">Größe</th><th className="px-4 py-3 font-medium">Geändert</th><th className="px-5 py-3 text-right font-medium">Aktionen</th></tr></thead>
                        <tbody className="divide-y divide-gray-700/70">
                            {directoryEntries.folders.map(folder => {
                                const folderPath = folder.path || [currentPath, folder.name].filter(Boolean).join("/");
                                return <tr key={`folder-${folder.name}`} className="hover:bg-gray-700/30"><td className="px-5 py-3.5"><button type="button" onClick={() => { setCurrentPath(folderPath); setPage(1); }} className="flex items-center gap-3 font-medium text-gray-100 hover:text-blue-300"><span className="rounded-lg bg-amber-500/10 p-2 text-amber-300"><Icon name="folder" /></span>{folder.name}</button></td><td className="px-4 py-3 text-gray-500">{folder.count} Dateien/Einträge</td><td className="px-4 py-3 text-gray-500">–</td><td className="px-4 py-3 text-gray-500">–</td><td className="px-5 py-3"><div className="flex justify-end"><button type="button" title="Ordner samt Inhalt löschen" onClick={() => setDialog({ type: "deleteFolder", folder: { ...folder, path: folderPath } })} className="rounded-lg p-2 text-gray-400 hover:bg-red-950/60 hover:text-red-300"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>;
                            })}
                            {directoryEntries.entries.map(entry => {
                                const { object, file, projectData } = entry;
                                const size = Number(file?.size || 0);
                                return <tr key={entry.id} className="group hover:bg-gray-700/30"><td className="px-5 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-blue-500/10 p-2 text-blue-300"><Icon name="file" /></span><div className="min-w-0"><div className="max-w-md truncate font-medium text-gray-100" title={entry.label}>{entry.label}</div><div className="mt-0.5 max-w-md truncate text-xs text-gray-600" title={object.path}>{object.path}</div></div></div></td><td className="px-4 py-3 text-gray-400">{file?.project?.title || file?.customer?.name || projectData?.project?.title || (object.linked ? "System" : <span className="text-amber-400">Verwaist</span>)}</td><td className="px-4 py-3 tabular-nums text-gray-400">{size ? formatBytes(size) : "–"}</td><td className="px-4 py-3 whitespace-nowrap text-gray-400">{formatDate(file?.uploadedAt || object.uploadedAt)}</td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button type="button" title="Herunterladen" onClick={() => void download(getObjectDownload(object.id))} className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"><Icon name="download" className="h-4 w-4" /></button><button type="button" title="Löschen" onClick={() => setDialog({ type: "deleteObject", object })} className="rounded-lg p-2 text-gray-400 hover:bg-red-950/60 hover:text-red-300"><Icon name="trash" className="h-4 w-4" /></button></div></td></tr>;
                            })}
                        </tbody>
                    </table>
                    {!loading && !directoryEntries.folders.length && !directoryEntries.entries.length && <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center"><span className="rounded-full bg-gray-700 p-3 text-gray-500"><Icon name="folder" className="h-7 w-7" /></span><p className="mt-3 text-sm font-medium text-gray-300">Keine Dateien gefunden</p><p className="mt-1 text-xs text-gray-500">Passe Suche oder Verzeichnispfad an.</p></div>}
                    {loading && <div className="flex min-h-52 items-center justify-center text-sm text-gray-500">Storage wird geladen …</div>}
                </div>
                {overview?.pagination?.pages > 1 && <div className="flex items-center justify-between border-t border-gray-700 px-5 py-3 text-sm text-gray-500"><span>Seite {overview.pagination.page} von {overview.pagination.pages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded border border-gray-600 px-3 py-1.5 disabled:opacity-40">Zurück</button><button type="button" disabled={page >= overview.pagination.pages} onClick={() => setPage(value => value + 1)} className="rounded border border-gray-600 px-3 py-1.5 disabled:opacity-40">Weiter</button></div></div>}
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-700 p-4 sm:p-5">
                    <div><h2 className="font-semibold">Vollbackups</h2><p className="mt-1 text-sm text-gray-500">Datenbank und alle verknüpften Garage-Dateien in einem Archiv sichern.</p></div>
                    <div className="flex flex-wrap gap-2"><input ref={fileInput} type="file" accept=".cbackup,application/gzip" onChange={event => importFile(event.target.files?.[0], "full")} className="hidden"/><button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3.5 py-2 text-sm hover:bg-gray-700"><Icon name="upload" className="h-4 w-4"/>Vollbackup einspielen</button><button type="button" onClick={() => { setBackupName(`Vollbackup ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`); setDialog({ type: "createBackup" }); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold hover:bg-blue-500"><Icon name="backup" className="h-4 w-4"/>Vollbackup erstellen</button></div>
                </div>
                <BackupTable backups={fullBackups} emptyMessage="Noch kein Vollbackup vorhanden." onDownload={backup => void download(getBackupDownload(backup.id))} onRestore={backup => setDialog({ type: "restore", backup })} onDelete={backup => setDialog({ type: "deleteBackup", backup })} />
                <div className="border-t border-gray-700 bg-gray-900/40 px-5 py-3 text-xs text-gray-500">Backups enthalten Betriebsdaten und Dateien. Benutzerkonten, Mitgliedschaften und Lizenzen werden aus Sicherheitsgründen nicht überschrieben.</div>

                <div className="flex flex-wrap items-start justify-between gap-4 border-y border-gray-700 p-4 sm:p-5">
                    <div><h2 className="font-semibold">Datenbank-Backups</h2><p className="mt-1 text-sm text-gray-500">Nur die tenantgebundenen Datenbanktabellen sichern oder auf einen früheren Stand zurücksetzen.</p></div>
                    <div className="flex flex-wrap gap-2"><input ref={databaseFileInput} type="file" accept=".cdbbackup,application/gzip" onChange={event => importFile(event.target.files?.[0], "database")} className="hidden"/><button type="button" onClick={() => databaseFileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3.5 py-2 text-sm hover:bg-gray-700"><Icon name="upload" className="h-4 w-4"/>DB-Backup einspielen</button><button type="button" onClick={() => { setBackupName(`Datenbank-Backup ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`); setDialog({ type: "createDatabaseBackup" }); }} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold hover:bg-violet-500"><Icon name="storage" className="h-4 w-4"/>Datenbank sichern</button></div>
                </div>
                <BackupTable databaseOnly backups={databaseBackups} emptyMessage="Noch kein Datenbank-Backup vorhanden." onDownload={backup => void download(getBackupDownload(backup.id))} onRestore={backup => setDialog({ type: "restoreDatabase", backup })} onDelete={backup => setDialog({ type: "deleteBackup", backup })} />
                <div className="border-t border-gray-700 bg-gray-900/40 px-5 py-3 text-xs text-gray-500">Ein Datenbank-Restore verändert keine Binärdateien in Garage. Dateimetadaten werden auf den Stand des Backups zurückgesetzt.</div>

                <div className="flex flex-wrap items-start justify-between gap-4 border-y border-gray-700 p-4 sm:p-5">
                    <div><h2 className="font-semibold">Shop-Datenbank-Backups</h2><p className="mt-1 text-sm text-gray-500">Den internen Artikelkatalog einschließlich Gruppen, Lieferanten und Shop-Zuordnungen separat übertragen.</p></div>
                    <div className="flex flex-wrap gap-2"><input ref={shopDatabaseFileInput} type="file" accept=".cshopbackup,application/gzip" onChange={event => importFile(event.target.files?.[0], "shop-database")} className="hidden"/><button type="button" onClick={() => shopDatabaseFileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3.5 py-2 text-sm hover:bg-gray-700"><Icon name="upload" className="h-4 w-4"/>Shop-Backup einspielen</button><button type="button" onClick={() => { setBackupName(`Shop-Datenbank-Backup ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`); setDialog({ type: "createShopDatabaseBackup" }); }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold hover:bg-emerald-500"><Icon name="storage" className="h-4 w-4"/>Shop-Datenbank sichern</button></div>
                </div>
                <BackupTable databaseOnly backups={shopDatabaseBackups} emptyMessage="Noch kein Shop-Datenbank-Backup vorhanden." onDownload={backup => void download(getBackupDownload(backup.id))} onRestore={backup => setDialog({ type: "restoreShopDatabase", backup })} onDelete={backup => setDialog({ type: "deleteBackup", backup })} />
                <div className="border-t border-gray-700 bg-gray-900/40 px-5 py-3 text-xs text-gray-500">Enthalten sind ausschließlich Shop-Stammdaten. Kunden, Projekte, Bestellungen und Dateien – einschließlich Artikelbildern – werden nicht exportiert.</div>
            </section>
        </div>

        {dialog?.type === "createBackup" && <ConfirmDialog title="Manuelles Backup erstellen" confirmLabel="Backup erstellen" busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => createStorageBackup(backupName), "Backup wurde erstellt.")}><label className="block text-left"><span className="mb-2 block text-xs font-medium text-gray-300">Bezeichnung</span><input autoFocus value={backupName} maxLength="120" onChange={event => setBackupName(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" /></label><p className="mt-3">Die Erstellung kann je nach Datenmenge einige Minuten dauern.</p></ConfirmDialog>}
        {dialog?.type === "createDatabaseBackup" && <ConfirmDialog title="Datenbank-Backup erstellen" confirmLabel="Datenbank sichern" busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => createDatabaseBackup(backupName), "Datenbank-Backup wurde erstellt.")}><label className="block text-left"><span className="mb-2 block text-xs font-medium text-gray-300">Bezeichnung</span><input autoFocus value={backupName} maxLength="120" onChange={event => setBackupName(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-violet-500" /></label><p className="mt-3">Gesichert werden die Betriebsdaten dieses Unternehmens, ohne Binärdateien aus Garage in das Archiv aufzunehmen.</p></ConfirmDialog>}
        {dialog?.type === "createShopDatabaseBackup" && <ConfirmDialog title="Shop-Datenbank-Backup erstellen" confirmLabel="Shop-Datenbank sichern" busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => createShopDatabaseBackup(backupName), "Shop-Datenbank-Backup wurde erstellt.")}><label className="block text-left"><span className="mb-2 block text-xs font-medium text-gray-300">Bezeichnung</span><input autoFocus value={backupName} maxLength="120" onChange={event => setBackupName(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" /></label><p className="mt-3">Gesichert werden nur Shop-Konfiguration, Lieferanten, Artikelgruppen, Artikel und Beschlag-Zuordnungen. Kunden- und Projektdaten sowie Artikelbilder bleiben vollständig außerhalb des Archivs.</p></ConfirmDialog>}
        {dialog?.type === "cleanup" && <ConfirmDialog title="Verwaiste Dateien bereinigen?" confirmLabel="Jetzt bereinigen" dangerous busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(cleanupStorage, `${summary.orphanCount || 0} verwaiste Objekte wurden zur Löschung vorgemerkt.`)}>Es werden ausschließlich Garage-Objekte entfernt, die mit keinem Datei- oder Projektdatensatz mehr verknüpft sind.</ConfirmDialog>}
        {dialog?.type === "deleteObject" && <ConfirmDialog title="Datei dauerhaft löschen?" confirmLabel="Datei löschen" dangerous busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => deleteStorageObject(dialog.object.id), "Datei wurde zur Löschung vorgemerkt.")}><strong className="text-gray-200">{objectLabel(dialog.object)}</strong> wird aus Garage und aus allen zugehörigen Datensätzen entfernt. Diese Aktion kann nur über ein Backup rückgängig gemacht werden.</ConfirmDialog>}
        {dialog?.type === "deleteFolder" && <ConfirmDialog title="Ordner samt Inhalt löschen?" confirmLabel="Ordner löschen" dangerous typed typedPhrase="ORDNER LÖSCHEN" busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => deleteStorageFolder(dialog.folder.path), result => `${result.deletedObjects} Objekte und ${result.deletedFiles} Dateiverknüpfungen wurden entfernt.`)}>Der Ordner <strong className="text-gray-200">{dialog.folder.path}</strong> wird rekursiv gelöscht. Alle enthaltenen Garage-Dateien sowie ihre Datei- und Projektdatensätze werden dauerhaft entfernt.</ConfirmDialog>}
        {dialog?.type === "restore" && <ConfirmDialog title="Backup wiederherstellen?" confirmLabel="Backup einspielen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => restoreStorageBackup(dialog.backup.id), "Backup wurde erfolgreich eingespielt.")}>Der aktuelle Stand der Betriebsdaten und Dateien wird durch <strong className="text-gray-200">{dialog.backup.name}</strong> ersetzt. Erstelle vorher ein aktuelles Backup, falls du zum jetzigen Stand zurückkehren möchtest.</ConfirmDialog>}
        {dialog?.type === "restoreDatabase" && <ConfirmDialog title="Datenbank wiederherstellen?" confirmLabel="Datenbank zurücksetzen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => restoreStorageBackup(dialog.backup.id), "Datenbank-Backup wurde erfolgreich eingespielt.")}>Die tenantgebundenen Datenbanktabellen werden durch <strong className="text-gray-200">{dialog.backup.name}</strong> ersetzt. Die Binärdateien in Garage bleiben unverändert; ihre Metadaten stammen anschließend aus dem Backup.</ConfirmDialog>}
        {dialog?.type === "restoreShopDatabase" && <ConfirmDialog title="Shop-Datenbank wiederherstellen?" confirmLabel="Shop-Katalog ersetzen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => restoreStorageBackup(dialog.backup.id), "Shop-Datenbank-Backup wurde erfolgreich eingespielt.")}>Der aktuelle interne Artikelkatalog wird durch <strong className="text-gray-200">{dialog.backup.name}</strong> ersetzt. Alle Kunden-, Projekt- und Bestelldaten bleiben unverändert.</ConfirmDialog>}
        {dialog?.type === "import" && <ConfirmDialog title="Externes Backup einspielen?" confirmLabel="Datei einspielen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => importStorageBackup(dialog.file), "Backup-Datei wurde erfolgreich eingespielt.")}>Die Datei <strong className="text-gray-200">{dialog.file.name}</strong> ersetzt den aktuellen Stand. Struktur, Version und Tenant-Zugehörigkeit des Archivformats werden vor dem Restore geprüft.</ConfirmDialog>}
        {dialog?.type === "importDatabase" && <ConfirmDialog title="Externes Datenbank-Backup einspielen?" confirmLabel="Datenbank einspielen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => importDatabaseBackup(dialog.file), "Datenbank-Backup wurde erfolgreich eingespielt.")}>Die Datei <strong className="text-gray-200">{dialog.file.name}</strong> ersetzt die tenantgebundenen Datenbanktabellen. Garage-Dateien werden nicht überschrieben oder gelöscht.</ConfirmDialog>}
        {dialog?.type === "importShopDatabase" && <ConfirmDialog title="Externes Shop-Datenbank-Backup einspielen?" confirmLabel="Shop-Katalog einspielen" dangerous typed busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => importShopDatabaseBackup(dialog.file), "Shop-Datenbank-Backup wurde erfolgreich eingespielt.")}>Die Datei <strong className="text-gray-200">{dialog.file.name}</strong> ersetzt ausschließlich den internen Artikelkatalog. Sie darf auch aus einem anderen Unternehmen stammen; Kunden-, Projekt- und Bestelldaten werden nicht verändert.</ConfirmDialog>}
        {dialog?.type === "deleteBackup" && <ConfirmDialog title="Backup löschen?" confirmLabel="Backup löschen" dangerous busy={busy} onCancel={() => setDialog(null)} onConfirm={() => void run(() => deleteStorageBackup(dialog.backup.id), "Backup wurde gelöscht.")}>Das Archiv <strong className="text-gray-200">{dialog.backup.name}</strong> wird dauerhaft aus Garage gelöscht.</ConfirmDialog>}
    </div>;
}
