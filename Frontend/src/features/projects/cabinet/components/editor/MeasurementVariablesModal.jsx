import { useEffect, useMemo, useState } from "react";

const VARIABLE_NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u;

const createRowId = () =>
    globalThis.crypto?.randomUUID?.() ?? `variable-${Date.now()}-${Math.random()}`;

const normalizeRows = variables => (Array.isArray(variables) ? variables : []).map(variable => ({
    id: createRowId(),
    name: String(variable?.name ?? ""),
    value: String(variable?.value ?? "")
}));

export default function MeasurementVariablesModal({
    linkedVariables = [],
    variables = [],
    onCancel,
    onSave
}) {
    const [rows, setRows] = useState(() => normalizeRows(variables));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const linkedNames = useMemo(
        () => new Set(linkedVariables.map(variable => variable.name.toLocaleUpperCase("de-DE"))),
        [linkedVariables]
    );

    useEffect(() => {
        const closeOnEscape = event => {
            if (event.key === "Escape" && !saving) onCancel();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onCancel, saving]);

    const updateRow = (id, changes) => {
        setRows(current => current.map(row => row.id === id ? { ...row, ...changes } : row));
        setError("");
    };

    const addRow = () => {
        setRows(current => [...current, { id: createRowId(), name: "", value: "" }]);
        setError("");
    };

    const save = async event => {
        event.preventDefault();
        if (saving) return;

        const normalized = [];
        const names = new Set();
        for (const row of rows) {
            const name = row.name.trim();
            const rawValue = row.value.trim().replace(",", ".");
            const value = Number(rawValue);
            const comparableName = name.toLocaleUpperCase("de-DE");
            if (!VARIABLE_NAME.test(name)) {
                setError("Variablennamen müssen mit einem Buchstaben oder Unterstrich beginnen und dürfen keine Leerzeichen enthalten.");
                return;
            }
            if (!rawValue || !Number.isFinite(value)) {
                setError(`Für „${name}“ muss ein gültiger Zahlenwert angegeben werden.`);
                return;
            }
            if (names.has(comparableName) || linkedNames.has(comparableName)) {
                setError(`Die Variable „${name}“ ist bereits vorhanden.`);
                return;
            }
            names.add(comparableName);
            normalized.push({ name, value, unit: "mm", label: name, status: "manual" });
        }

        setSaving(true);
        setError("");
        try {
            await onSave(normalized);
        } catch (saveError) {
            console.error("Aufmaßvariablen konnten nicht gespeichert werden", saveError);
            setError("Die Variablen konnten nicht gespeichert werden. Bitte versuche es erneut.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4">
            <form
                onSubmit={save}
                role="dialog"
                aria-modal="true"
                aria-labelledby="measurement-variables-title"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-gray-700 p-5">
                    <div>
                        <h2 id="measurement-variables-title" className="text-lg font-semibold text-white">
                            Variablen
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Aufmaßwerte stehen in Formeln des Cabinet Editors zur Verfügung. Eigene Variablen werden projektweit im Aufmaß gespeichert.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        aria-label="Schließen"
                        className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                    >
                        ✕
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                    <section aria-labelledby="linked-variables-title">
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 id="linked-variables-title" className="text-sm font-semibold text-gray-200">
                                Aus Aufmaßobjekten
                            </h3>
                            <span className="text-xs text-gray-500">Werte werden in der Aufmaß-Ansicht bearbeitet</span>
                        </div>
                        {linkedVariables.length > 0 ? (
                            <div className="mt-3 overflow-hidden rounded-lg border border-gray-700">
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,0.55fr)_auto] gap-3 bg-gray-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                    <span>Variable</span>
                                    <span>Wert</span>
                                    <span>Quelle</span>
                                </div>
                                {linkedVariables.map(variable => (
                                    <div key={variable.name.toLocaleUpperCase("de-DE")} className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,0.55fr)_auto] items-center gap-3 border-t border-gray-800 px-3 py-2.5 text-sm">
                                        <span className="truncate font-mono text-blue-300">{variable.name}</span>
                                        <span className="tabular-nums text-gray-100">{variable.value} {variable.unit}</span>
                                        <span className="max-w-48 truncate text-xs text-gray-500" title={variable.label}>{variable.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500">
                                Im Aufmaß wurden noch keine Messobjekte mit einer Variablen verknüpft.
                            </p>
                        )}
                    </section>

                    <section aria-labelledby="manual-variables-title">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 id="manual-variables-title" className="text-sm font-semibold text-gray-200">
                                    Eigene Variablen
                                </h3>
                                <p className="mt-1 text-xs text-gray-500">Namen dürfen Buchstaben, Zahlen und Unterstriche enthalten.</p>
                            </div>
                            <button
                                type="button"
                                onClick={addRow}
                                className="shrink-0 rounded border border-blue-700 bg-blue-950/60 px-3 py-2 text-sm text-blue-200 hover:bg-blue-900/70"
                            >
                                + Variable hinzufügen
                            </button>
                        </div>

                        {rows.length > 0 ? (
                            <div className="mt-3 space-y-2">
                                {rows.map((row, index) => (
                                    <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(8rem,0.65fr)_auto] items-end gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                                        <label className="text-xs text-gray-400">
                                            Name
                                            <input
                                                autoFocus={index === rows.length - 1 && !row.name}
                                                value={row.name}
                                                onChange={event => updateRow(row.id, {
                                                    name: event.target.value
                                                        .replace(/\s+/g, "_")
                                                        .replace(/[^\p{L}\p{N}_]/gu, "")
                                                        .replace(/^\p{N}+/u, "")
                                                })}
                                                placeholder="z. B. sockel_hoehe"
                                                className="mt-1 w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-blue-500"
                                            />
                                        </label>
                                        <label className="text-xs text-gray-400">
                                            Wert in mm
                                            <input
                                                inputMode="decimal"
                                                value={row.value}
                                                onChange={event => updateRow(row.id, { value: event.target.value })}
                                                placeholder="0"
                                                className="mt-1 w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm tabular-nums text-white outline-none focus:border-blue-500"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setRows(current => current.filter(candidate => candidate.id !== row.id))}
                                            aria-label={`${row.name || "Variable"} entfernen`}
                                            className="rounded border border-gray-600 px-3 py-2 text-sm text-gray-400 hover:border-red-700 hover:bg-red-950/40 hover:text-red-300"
                                        >
                                            Entfernen
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500">
                                Noch keine eigenen Variablen angelegt.
                            </p>
                        )}
                    </section>

                    {error && (
                        <div role="alert" className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}
                </div>

                <footer className="flex justify-end gap-3 border-t border-gray-700 p-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Speichern …" : "Variablen speichern"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
