import { useEffect, useMemo, useState } from "react";

import { uploadJSONFile } from "../../../services/apiTemplates";
import {
    CUSTOM_WORK_TYPE_ID,
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings,
    normalizeCompanySettings,
    timeToMinutes
} from "../../../services/companySettings";
import { uploadGlobalFile } from "../../../services/globalMemoryCache";

const emptyWorkType = { id: "", label: "" };

function createWorkTypeId(label, existingIds) {
    const base = label
        .toLocaleLowerCase("de-DE")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "taetigkeit";

    let id = base;
    let suffix = 2;

    while (existingIds.has(id) || id === CUSTOM_WORK_TYPE_ID) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }

    return id;
}

function validateSettings(config) {
    const start = timeToMinutes(config.workingHours.start);
    const end = timeToMinutes(config.workingHours.end);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        return "Das Arbeitsende muss nach dem Arbeitsbeginn liegen.";
    }

    const sortedBreaks = [...config.breaks]
        .sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));

    for (let index = 0; index < sortedBreaks.length; index += 1) {
        const breakEntry = sortedBreaks[index];
        const breakStart = timeToMinutes(breakEntry.start);
        const breakEnd = timeToMinutes(breakEntry.end);

        if (breakStart < start || breakEnd > end || breakStart >= breakEnd) {
            return `Die Pause „${breakEntry.label || index + 1}“ muss vollständig innerhalb der Arbeitszeit liegen.`;
        }

        if (index > 0 && breakStart < timeToMinutes(sortedBreaks[index - 1].end)) {
            return "Pausenzeiten dürfen sich nicht überschneiden.";
        }
    }

    if (config.workTypes.length === 0) {
        return "Mindestens eine Tätigkeit muss vorhanden sein.";
    }

    const ids = config.workTypes.map(type => type.id);
    const labels = config.workTypes.map(type => type.label.trim().toLocaleLowerCase("de-DE"));

    if (new Set(ids).size !== ids.length || new Set(labels).size !== labels.length) {
        return "Tätigkeiten müssen eindeutige Bezeichnungen besitzen.";
    }

    if (config.workTypes.some(type => !type.label.trim())) {
        return "Eine Tätigkeit darf keine leere Bezeichnung haben.";
    }

    return null;
}

export default function CompanySettingsPanel() {
    const [config, setConfig] = useState(DEFAULT_COMPANY_SETTINGS);
    const [newWorkType, setNewWorkType] = useState(emptyWorkType);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setConfig(await loadCompanySettings());
            } catch (error) {
                console.warn("Unternehmenseinstellungen konnten nicht geladen werden:", error);
                setMessage({
                    type: "error",
                    text: "Die gespeicherten Einstellungen konnten nicht geladen werden. Es werden Standardwerte angezeigt."
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const sortedBreaks = useMemo(
        () => [...config.breaks].sort(
            (left, right) => timeToMinutes(left.start) - timeToMinutes(right.start)
        ),
        [config.breaks]
    );

    const updateWorkingHours = (key, value) => {
        setConfig(previous => ({
            ...previous,
            workingHours: {
                ...previous.workingHours,
                [key]: value
            }
        }));
    };

    const updateBreak = (id, key, value) => {
        setConfig(previous => ({
            ...previous,
            breaks: previous.breaks.map(entry => (
                entry.id === id ? { ...entry, [key]: value } : entry
            ))
        }));
    };

    const addBreak = () => {
        const id = `break-${Date.now()}`;

        setConfig(previous => ({
            ...previous,
            breaks: [
                ...previous.breaks,
                { id, label: "Neue Pause", start: "10:00", end: "10:15" }
            ]
        }));
    };

    const removeBreak = id => {
        setConfig(previous => ({
            ...previous,
            breaks: previous.breaks.filter(entry => entry.id !== id)
        }));
    };

    const updateWorkType = (id, label) => {
        setConfig(previous => ({
            ...previous,
            workTypes: previous.workTypes.map(type => (
                type.id === id ? { ...type, label } : type
            ))
        }));
    };

    const addWorkType = () => {
        const label = newWorkType.label.trim();
        if (!label) return;

        const ids = new Set(config.workTypes.map(type => type.id));
        const id = createWorkTypeId(label, ids);

        setConfig(previous => ({
            ...previous,
            workTypes: [...previous.workTypes, { id, label }]
        }));
        setNewWorkType(emptyWorkType);
    };

    const removeWorkType = id => {
        setConfig(previous => ({
            ...previous,
            workTypes: previous.workTypes.filter(type => type.id !== id)
        }));
    };

    const save = async () => {
        const normalized = normalizeCompanySettings({
            ...config,
            breaks: sortedBreaks
        });
        const validationMessage = validateSettings(normalized);

        if (validationMessage) {
            setMessage({ type: "error", text: validationMessage });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            await uploadGlobalFile({
                file: "settings-company.json",
                data: normalized,
                uploadFunction: {
                    upload: uploadJSONFile,
                    path: "/api/settings/company"
                }
            });

            setConfig(normalized);
            setMessage({ type: "success", text: "Unternehmenseinstellungen gespeichert." });
        } catch (error) {
            console.error("Unternehmenseinstellungen konnten nicht gespeichert werden:", error);
            setMessage({ type: "error", text: "Unternehmenseinstellungen konnten nicht gespeichert werden." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Unternehmenseinstellungen werden geladen...</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl space-y-6">
                <div>
                    <h1 className="text-xl font-semibold">Unternehmen</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Arbeitszeiten, Pausen und Tätigkeiten zentral verwalten.
                    </p>
                </div>

                {message && (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${
                        message.type === "success"
                            ? "border-green-800 bg-green-950/40 text-green-300"
                            : "border-red-800 bg-red-950/40 text-red-300"
                    }`}>
                        {message.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Reguläre Arbeitszeit</div>
                    <div className="mt-4 grid max-w-xl grid-cols-2 gap-4">
                        <TimeField
                            label="Arbeitsbeginn"
                            value={config.workingHours.start}
                            onChange={value => updateWorkingHours("start", value)}
                        />
                        <TimeField
                            label="Arbeitsende"
                            value={config.workingHours.end}
                            onChange={value => updateWorkingHours("end", value)}
                        />
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">Pausenzeiten</div>
                            <p className="mt-2 text-sm text-gray-400">
                                Pausen teilen den Kalender automatisch in Arbeitszeitblöcke.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={addBreak}
                            className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                        >
                            Pause hinzufügen
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        {sortedBreaks.map(entry => (
                            <div key={entry.id} className="grid grid-cols-[1fr_140px_140px_auto] items-end gap-3 rounded-lg bg-gray-900 p-3">
                                <TextField
                                    label="Bezeichnung"
                                    value={entry.label}
                                    onChange={value => updateBreak(entry.id, "label", value)}
                                />
                                <TimeField
                                    label="Von"
                                    value={entry.start}
                                    onChange={value => updateBreak(entry.id, "start", value)}
                                />
                                <TimeField
                                    label="Bis"
                                    value={entry.end}
                                    onChange={value => updateBreak(entry.id, "end", value)}
                                />
                                <DeleteButton label="Pause löschen" onClick={() => removeBreak(entry.id)} />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Tätigkeiten</div>
                    <p className="mt-2 text-sm text-gray-400">
                        Die Liste wird in Zeiterfassung und Mitarbeiterkalender verwendet. Bestehende Zeiteinträge behalten beim Löschen ihre gespeicherte ID.
                    </p>

                    <div className="mt-4 space-y-3">
                        {config.workTypes.map(type => (
                            <div key={type.id} className="grid grid-cols-[1fr_180px_auto] items-end gap-3 rounded-lg bg-gray-900 p-3">
                                <TextField
                                    label="Bezeichnung"
                                    value={type.label}
                                    onChange={value => updateWorkType(type.id, value)}
                                />
                                <div>
                                    <span className="mb-1 block text-xs text-gray-500">Technische ID</span>
                                    <div className="rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-500">
                                        {type.id}
                                    </div>
                                </div>
                                <DeleteButton label="Tätigkeit löschen" onClick={() => removeWorkType(type.id)} />
                            </div>
                        ))}

                        <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-lg border border-dashed border-gray-600 p-3">
                            <TextField
                                label="Neue Tätigkeit"
                                value={newWorkType.label}
                                placeholder="z. B. Planung"
                                onChange={value => setNewWorkType({ id: "", label: value })}
                                onKeyDown={event => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        addWorkType();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                disabled={!newWorkType.label.trim()}
                                onClick={addWorkType}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
                            >
                                Hinzufügen
                            </button>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pb-6">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={save}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                    >
                        {saving ? "Wird gespeichert..." : "Einstellungen speichern"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TextField({ label, value, onChange, placeholder, onKeyDown }) {
    return (
        <label>
            <span className="mb-1 block text-xs text-gray-500">{label}</span>
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={event => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
        </label>
    );
}

function TimeField({ label, value, onChange }) {
    return (
        <label>
            <span className="mb-1 block text-xs text-gray-500">{label}</span>
            <input
                type="time"
                value={value}
                onChange={event => onChange(event.target.value)}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
        </label>
    );
}

function DeleteButton({ label, onClick }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className="rounded-lg border border-red-900 px-3 py-2 text-red-300 hover:bg-red-950/60"
        >
            Löschen
        </button>
    );
}
