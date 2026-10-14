import { useEffect, useState } from "react";
import axios from "axios";
import { getGlobalFile, uploadGlobalFile } from "../../../services/globalMemoryCache.js";
import { downloadFile, uploadJSONFile } from "../../../services/apiTemplates.js";
import {
    clearOfflineData,
    downloadProjectData,
    getOfflineStorageSummary,
    isOfflineModeEnabled,
    setOfflineModeEnabled
} from "../../../services/offlineRepository.js";

const DEFAULT_CONFIG = {
    schemaVersion: 2,
    offlineMode: false,
    preloadMode: "active",
    selectedProjectIds: []
};

const formatBytes = value => {
    if (!value) return "–";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
};

export default function CacheSettingsPanel() {
    const [config, setConfig] = useState({
        ...DEFAULT_CONFIG,
        offlineMode: isOfflineModeEnabled()
    });
    const [projects, setProjects] = useState([]);
    const [summary, setSummary] = useState({ projects: 0, apiEntries: 0, usageBytes: 0, quotaBytes: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [message, setMessage] = useState(null);

    const refreshSummary = async () => setSummary(await getOfflineStorageSummary());

    useEffect(() => {
        Promise.allSettled([
            getGlobalFile({
                file: "settings-cache.json",
                loadFromServer: { download: downloadFile, path: "/api/settings/cache" },
                noExpiration: true
            }),
            axios.get("/api/projects/getAll"),
            getOfflineStorageSummary()
        ]).then(([settingsResult, projectsResult, summaryResult]) => {
            if (settingsResult.status === "fulfilled" && settingsResult.value) {
                setConfig(previous => ({
                    ...previous,
                    ...settingsResult.value,
                    schemaVersion: 2,
                    offlineMode: isOfflineModeEnabled()
                }));
            }
            if (projectsResult.status === "fulfilled") {
                setProjects(projectsResult.value.data?.projects ?? []);
            }
            if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
            setLoading(false);
        });
    }, []);

    const updateConfig = (key, value) => setConfig(previous => ({ ...previous, [key]: value }));

    const toggleOfflineMode = async enabled => {
        updateConfig("offlineMode", enabled);
        await setOfflineModeEnabled(enabled);
    };

    const toggleProject = projectId => {
        setConfig(previous => ({
            ...previous,
            selectedProjectIds: previous.selectedProjectIds.includes(projectId)
                ? previous.selectedProjectIds.filter(id => id !== projectId)
                : [...previous.selectedProjectIds, projectId]
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage(null);
        const data = {
            schemaVersion: 2,
            offlineMode: Boolean(config.offlineMode),
            preloadMode: config.preloadMode,
            selectedProjectIds: config.selectedProjectIds
        };
        try {
            await setOfflineModeEnabled(data.offlineMode);
            await uploadGlobalFile({
                file: "settings-cache.json",
                data,
                uploadFunction: { upload: uploadJSONFile, path: "/api/settings/cache" }
            });
            setMessage({ type: "success", text: "Offline-Einstellungen gespeichert." });
        } catch (error) {
            console.error("Offline-Einstellungen konnten nicht gespeichert werden", error);
            setMessage({ type: "error", text: "Die Einstellungen konnten nicht auf dem Server gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    const handleDownload = async () => {
        if (config.preloadMode === "selected" && !config.selectedProjectIds.length) {
            setMessage({ type: "error", text: "Wähle mindestens ein Projekt aus." });
            return;
        }
        setDownloading(true);
        setProgress({ current: 0, total: 0, label: "Projektdaten werden vorbereitet …" });
        setMessage(null);
        try {
            const { bundle, failures } = await downloadProjectData({
                mode: config.preloadMode,
                projectIds: config.selectedProjectIds,
                onProgress: setProgress
            });
            await refreshSummary();
            setMessage({
                type: failures.length ? "error" : "success",
                text: failures.length
                    ? `${bundle.projects.length} Projekte wurden vorbereitet, ${failures.length} Dateien konnten nicht geladen werden.`
                    : `${bundle.projects.length} Projekte sind jetzt offline verfügbar.`
            });
        } catch (error) {
            console.error("Offline-Download fehlgeschlagen", error);
            setMessage({ type: "error", text: "Die Offline-Daten konnten nicht vollständig heruntergeladen werden." });
        } finally {
            setDownloading(false);
            setProgress(null);
        }
    };

    const handleClear = async () => {
        setClearing(true);
        setMessage(null);
        try {
            await clearOfflineData();
            await refreshSummary();
            setMessage({ type: "success", text: "Alle lokalen Projekt- und API-Daten wurden gelöscht." });
        } catch (error) {
            console.error("Offline-Daten konnten nicht gelöscht werden", error);
            setMessage({ type: "error", text: "Die lokalen Daten konnten nicht gelöscht werden." });
        } finally {
            setClearing(false);
        }
    };

    if (loading) {
        return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Offline-Einstellungen werden geladen …</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl space-y-6">
                <header>
                    <h1 className="text-xl font-semibold">Offline-Modus</h1>
                    <p className="mt-1 text-sm text-gray-500">Projekte und Anwendungsdaten lokal speichern, bearbeiten und später versioniert synchronisieren.</p>
                </header>

                {message && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/40 text-green-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>
                        {message.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-100">Offline-Modus auf diesem Gerät</h2>
                            <p className="mt-1 max-w-2xl text-xs text-gray-400">API-Antworten werden nur für heruntergeladene Projekte gespeichert. Bei aktivem Offline-Modus werden zusätzlich benötigte Ansichten lokal vorgehalten.</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input type="checkbox" checked={config.offlineMode} onChange={event => toggleOfflineMode(event.target.checked)} className="peer sr-only" />
                            <span className="h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:bg-blue-600 peer-checked:after:translate-x-5" />
                        </label>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:max-w-2xl sm:grid-cols-3">
                        <div className="rounded-lg bg-gray-900 p-3"><div className="text-xl font-semibold">{summary.projects}</div><div className="text-xs text-gray-500">Offline-Projekte</div></div>
                        <div className="rounded-lg bg-gray-900 p-3"><div className="text-xl font-semibold">{summary.apiEntries}</div><div className="text-xs text-gray-500">Lokale Datensätze</div></div>
                        <div className="rounded-lg bg-gray-900 p-3"><div className="text-xl font-semibold">{formatBytes(summary.usageBytes)}</div><div className="text-xs text-gray-500">von {formatBytes(summary.quotaBytes)} Browser-Speicher</div></div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <h2 className="text-sm font-semibold text-gray-100">Projekte herunterladen</h2>
                    <p className="mt-1 text-xs text-gray-400">Projekt, Kunde, Termine, Zeiten, Materialstamm und erzeugte JSON-Dateien werden in IndexedDB gespeichert.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {[["active", "Alle aktiven Projekte"], ["selected", "Ausgewählte Projekte"]].map(([value, label]) => (
                            <label key={value} className={`cursor-pointer rounded-lg border p-3 text-sm ${config.preloadMode === value ? "border-blue-500 bg-blue-950/20" : "border-gray-700 bg-gray-900"}`}>
                                <input type="radio" name="preloadMode" value={value} checked={config.preloadMode === value} onChange={() => updateConfig("preloadMode", value)} className="mr-2" />
                                {label}
                            </label>
                        ))}
                    </div>

                    {config.preloadMode === "selected" && (
                        <div className="mt-4 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2">
                            {projects.map(project => (
                                <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm hover:bg-gray-800">
                                    <input type="checkbox" checked={config.selectedProjectIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
                                    <span className="min-w-0 flex-1 truncate">{project.title}</span>
                                    <span className="text-xs text-gray-500">{project.projectNumber || project.status}</span>
                                </label>
                            ))}
                            {!projects.length && <div className="p-2 text-xs text-gray-500">Keine Projekte verfügbar.</div>}
                        </div>
                    )}

                    {progress && (
                        <div className="mt-4 rounded-lg bg-gray-900 p-3 text-xs text-gray-400">
                            <div className="truncate">{progress.label}</div>
                            {progress.total > 0 && <div className="mt-1">{progress.current} von {progress.total} Dateien</div>}
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button type="button" onClick={handleDownload} disabled={downloading} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
                            {downloading ? "Offline-Daten werden geladen …" : "Offline-Daten herunterladen"}
                        </button>
                    </div>
                </section>

                <section className="rounded-xl border border-red-900/60 bg-gray-800 p-5">
                    <h2 className="text-sm font-semibold text-red-400">Lokale Daten verwalten</h2>
                    <p className="mt-2 text-xs text-gray-400">Löscht heruntergeladene Projekte und API-Datensätze. Globale Einstellungen bleiben erhalten.</p>
                    <div className="mt-4 flex justify-end">
                        <button type="button" onClick={handleClear} disabled={clearing} className="rounded border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50">
                            {clearing ? "Wird gelöscht …" : "Offline-Daten löschen"}
                        </button>
                    </div>
                </section>

                <div className="flex justify-end border-t border-gray-800 pb-6 pt-5">
                    <button type="button" onClick={saveSettings} disabled={saving} className="rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                        {saving ? "Speichern …" : "Einstellungen speichern"}
                    </button>
                </div>
            </div>
        </div>
    );
}
