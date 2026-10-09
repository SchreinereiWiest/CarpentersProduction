import React, { useEffect, useState } from "react";
import { buildPartList } from "../../engine/partList/buildPartList.js";

const createRowKey = () => `row:${Date.now()}:${Math.random()}`;

const collectPartRows = partList => (partList ?? [])
    .flatMap(root => root?.Children ?? [])
    .map(part => ({
        ...part,
        _editorRowKey: part._generatedId ?? createRowKey()
    }));

export default function CabinetPresetModal({
    cabinet,
    initialName = "",
    materials = [],
    defaultConfig = {},
    dialogTitle = "Cabinet-Preset speichern",
    saveLabel = "Preset speichern",
    onCancel,
    onSave
}) {
    const [name, setName] = useState(initialName);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewError, setPreviewError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadPartList = async () => {
            setLoading(true);
            setPreviewError("");

            try {
                const partList = await buildPartList(
                    [{ ...cabinet, quantity: 1 }],
                    materials,
                    defaultConfig
                );

                if (!cancelled) {
                    setRows(collectPartRows(partList));
                }
            } catch (loadError) {
                console.error("Preset-Teileliste konnte nicht erstellt werden:", loadError);
                if (!cancelled) {
                    setPreviewError("Die Teileliste konnte nicht erstellt werden.");
                    setRows([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadPartList();
        return () => {
            cancelled = true;
        };
    }, [cabinet, materials, defaultConfig]);

    const updateRow = (rowKey, changes) => {
        setRows(previous => previous.map(row =>
            row._editorRowKey === rowKey
                ? { ...row, ...changes }
                : row
        ));
    };

    const addPart = () => {
        setRows(previous => [...previous, {
            _editorRowKey: createRowKey(),
            Objektname: "Neues Bauteil",
            Plattentyp: "KO",
            Anzahl: 1,
            L: 0,
            B: 0,
            T: 0,
            MID: "",
            Maserung: "",
            Kante: ":::",
            Notiz: ""
        }]);
    };

    const save = async () => {
        if (!name.trim() || loading || saving || previewError) return;

        const partListPreset = rows.map(({ _editorRowKey, ...part }) => part);
        setSaving(true);
        setSaveError("");
        try {
            await onSave({
                name: name.trim(),
                cabinet: {
                    ...cabinet,
                    partListPreset
                }
            });
        } catch (saveError) {
            console.error("Cabinet-Preset konnte nicht gespeichert werden:", saveError);
            setSaveError("Das Preset konnte nicht gespeichert werden. Bitte versuche es erneut.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="cabinet-preset-title"
                className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-gray-700 p-5">
                    <div>
                        <h2 id="cabinet-preset-title" className="text-lg font-semibold text-white">
                            {dialogTitle}
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Vergib einen Namen und passe die erzeugte Teileliste bei Bedarf an.
                        </p>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Schließen" className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">
                        ✕
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    <label className="block max-w-lg">
                        <span className="mb-1 block text-xs text-gray-400">Presetname</span>
                        <input
                            autoFocus
                            value={name}
                            onChange={event => setName(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === "Enter" && name.trim() && !loading) save();
                            }}
                            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            placeholder="z. B. Unterschrank mit Auszug"
                        />
                    </label>

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-200">Teileliste</h3>
                            <p className="text-xs text-gray-500">Änderungen werden beim Einfügen des Presets auf diesen Korpus angewendet.</p>
                        </div>
                        <button type="button" onClick={addPart} disabled={loading} className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">
                            Bauteil hinzufügen
                        </button>
                    </div>

                    {loading ? (
                        <div className="rounded border border-gray-800 bg-gray-950 p-8 text-center text-sm text-gray-400">
                            Teileliste wird erstellt …
                        </div>
                    ) : previewError ? (
                        <div role="alert" className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
                            {previewError}
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="rounded border border-gray-800 bg-gray-950 p-6 text-center text-sm text-gray-500">
                            Keine Bauteile vorhanden. Über „Bauteil hinzufügen“ kannst du Positionen ergänzen.
                        </div>
                    ) : (
                        <div className="max-h-[48vh] overflow-auto rounded border border-gray-700">
                            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                                <thead className="sticky top-0 bg-gray-800 text-xs uppercase tracking-wide text-gray-400">
                                    <tr>
                                        <th className="px-3 py-2">Bauteil</th>
                                        <th className="w-20 px-2 py-2">Anzahl</th>
                                        <th className="w-24 px-2 py-2">L (mm)</th>
                                        <th className="w-24 px-2 py-2">B (mm)</th>
                                        <th className="w-24 px-2 py-2">T (mm)</th>
                                        <th className="w-28 px-2 py-2">Material</th>
                                        <th className="w-24 px-2 py-2">Kante</th>
                                        <th className="px-3 py-2">Notiz</th>
                                        <th className="w-12 px-2 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row._editorRowKey} className="border-t border-gray-800">
                                            <td className="px-2 py-1.5">
                                                <input aria-label="Bauteilname" value={row.Objektname ?? ""} onChange={event => updateRow(row._editorRowKey, { Objektname: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-gray-100" />
                                            </td>
                                            {["Anzahl", "L", "B", "T"].map(field => (
                                                <td key={field} className="px-1 py-1.5">
                                                    <input aria-label={field} type="number" step="0.5" value={row[field] ?? 0} onChange={event => updateRow(row._editorRowKey, { [field]: Number(event.target.value) || 0 })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-gray-100" />
                                                </td>
                                            ))}
                                            <td className="px-1 py-1.5">
                                                <input aria-label="Materialnummer" value={row.MID ?? ""} onChange={event => updateRow(row._editorRowKey, { MID: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-gray-100" />
                                            </td>
                                            <td className="px-1 py-1.5">
                                                <input aria-label="Kante" value={row.Kante ?? ""} onChange={event => updateRow(row._editorRowKey, { Kante: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-gray-100" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input aria-label="Notiz" value={row.Notiz ?? ""} onChange={event => updateRow(row._editorRowKey, { Notiz: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-gray-100" />
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <button type="button" onClick={() => setRows(previous => previous.filter(item => item._editorRowKey !== row._editorRowKey))} aria-label={`${row.Objektname || "Bauteil"} entfernen`} title="Bauteil entfernen" className="rounded px-2 py-1 text-gray-500 hover:bg-red-950 hover:text-red-300">
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {saveError && (
                        <div role="alert" className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
                            {saveError}
                        </div>
                    )}
                </div>

                <footer className="flex justify-end gap-3 border-t border-gray-700 p-4">
                    <button type="button" onClick={onCancel} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                        Abbrechen
                    </button>
                    <button type="button" onClick={save} disabled={!name.trim() || loading || saving || Boolean(previewError)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? "Speichern …" : saveLabel}
                    </button>
                </footer>
            </section>
        </div>
    );
}
