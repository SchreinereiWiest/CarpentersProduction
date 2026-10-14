import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { createThreeWayMerge, formatMergeValue } from "../../services/threeWayMerge.js";
import {
    getProjectFileSyncEntry,
    resolveProjectFileConflict
} from "../../services/projectMemoryCache.js";
import { getCachedApiResponse } from "../../services/offlineRepository.js";
import { dismissOfflineNotice } from "../../services/offlineStatus.js";

const destinationFor = entry => {
    const routes = {
        "cabinet.json": "Cabinet",
        "nesting.json": "Nesting",
        "list.json": "List",
        "procurement.json": "Purchasing"
    };
    return routes[entry.file]
        ? `/Projects/${routes[entry.file]}/${entry.projectId}`
        : `/Projects/${entry.projectId}`;
};

export default function OfflineMergeView() {
    const { conflictKey } = useParams();
    const navigate = useNavigate();
    const [entry, setEntry] = useState(null);
    const [projectTitle, setProjectTitle] = useState("Projekt");
    const [choices, setChoices] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const key = decodeURIComponent(conflictKey || "");

    useEffect(() => {
        getProjectFileSyncEntry(key).then(async value => {
            setEntry(value);
            if (value?.projectId) {
                const cached = await getCachedApiResponse(`/api/projects/get/${value.projectId}`);
                setProjectTitle(cached?.data?.project?.title || "Projekt");
            }
        });
    }, [key]);

    const initialMerge = useMemo(() => entry
        ? createThreeWayMerge(entry.baseData, entry.data, entry.remoteData)
        : { merged: null, conflicts: [], automatic: [] }, [entry]);
    const result = useMemo(() => entry
        ? createThreeWayMerge(entry.baseData, entry.data, entry.remoteData, choices)
        : initialMerge, [choices, entry, initialMerge]);
    const allChosen = initialMerge.conflicts.every(conflict => choices[conflict.path]);

    const save = async () => {
        setSaving(true);
        setError("");
        try {
            const response = await resolveProjectFileConflict(key, result.merged);
            if (response.status === "conflict") {
                setError("Die Serverversion hat sich erneut geändert. Bitte prüfe den aktualisierten Konflikt.");
                setEntry(await getProjectFileSyncEntry(key));
                setChoices({});
                return;
            }
            dismissOfflineNotice(`conflict:${key}`);
            navigate(destinationFor(entry));
        } catch (saveError) {
            setError(saveError.message || "Der Merge konnte nicht gespeichert werden.");
        } finally {
            setSaving(false);
        }
    };

    if (!entry) {
        return <div className="min-h-screen bg-gray-950 p-8 text-gray-200">Konflikt wird geladen …</div>;
    }

    return (
        <main className="h-dvh overflow-y-auto bg-gray-950 px-4 py-8 text-white sm:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header>
                    <div className="text-xs font-medium uppercase tracking-widest text-red-400">Synchronisierungskonflikt</div>
                    <h1 className="mt-2 text-2xl font-semibold">{projectTitle} · {entry.file}</h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Deine Bearbeitung basiert auf Version {entry.baseVersion}. Auf dem Server liegt Version {entry.remoteVersion}.
                    </p>
                </header>

                <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                    <h2 className="font-semibold">Änderungen zusammenführen</h2>
                    <p className="mt-1 text-sm text-gray-400">
                        {initialMerge.automatic.length} Änderungen konnten automatisch übernommen werden. Wähle für jeden verbleibenden Konflikt eine Version.
                    </p>
                    <div className="mt-5 space-y-4">
                        {initialMerge.conflicts.map(conflict => (
                            <div key={conflict.path} className="rounded-lg border border-gray-700 bg-gray-950 p-4">
                                <div className="mb-3 break-all text-sm font-medium text-gray-200">{conflict.path}</div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {[["local", "Lokale Version", conflict.local], ["server", "Serverversion", conflict.remote]].map(([value, label, content]) => (
                                        <label key={value} className={`cursor-pointer rounded-lg border p-3 ${choices[conflict.path] === value ? "border-blue-500 bg-blue-950/30" : "border-gray-700 bg-gray-900"}`}>
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <input
                                                    type="radio"
                                                    name={conflict.path}
                                                    checked={choices[conflict.path] === value}
                                                    onChange={() => setChoices(previous => ({ ...previous, [conflict.path]: value }))}
                                                />
                                                {label}
                                            </div>
                                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-400">{formatMergeValue(content)}</pre>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {!initialMerge.conflicts.length && (
                            <div className="rounded-lg border border-green-900 bg-green-950/20 p-4 text-sm text-green-300">
                                Alle Änderungen konnten automatisch zusammengeführt werden.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                    <h2 className="font-semibold">Vorschau des zusammengeführten Ergebnisses</h2>
                    <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-300">{JSON.stringify(result.merged, null, 2)}</pre>
                    <p className="mt-3 text-xs text-amber-300">
                        Korpus- und Nesting-Geometrien müssen anschließend im jeweiligen Editor geprüft werden; der generische Merge führt noch keine grafische Geometrievalidierung aus.
                    </p>
                </section>

                {error && <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

                <div className="flex justify-end gap-3 pb-8">
                    <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Später entscheiden</button>
                    <button type="button" onClick={save} disabled={!allChosen || saving} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {saving ? "Wird synchronisiert …" : "Merge speichern und synchronisieren"}
                    </button>
                </div>
            </div>
        </main>
    );
}
