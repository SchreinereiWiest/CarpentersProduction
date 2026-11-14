import { useEffect, useState } from "react";
import axios from "axios";

import { uploadJSONFile } from "../../../shared/api/file-api.js";
import {
    CUSTOM_WORK_TYPE_ID,
    companyFreeDaysCalendarPayload,
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings,
    normalizeCompanySettings,
    timeToMinutes
} from "../../../shared/settings/company-settings.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";

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
    for (const day of config.workWeek) {
        if (!day.enabled) continue;
        const dayStart = timeToMinutes(day.start);
        const dayEnd = timeToMinutes(day.end);
        if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayStart >= dayEnd) {
            return `${day.label}: Das Arbeitsende muss nach dem Arbeitsbeginn liegen.`;
        }
        const sortedBreaks = [...day.breaks].sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));
        for (let index = 0; index < sortedBreaks.length; index += 1) {
            const breakEntry = sortedBreaks[index];
            const breakStart = timeToMinutes(breakEntry.start);
            const breakEnd = timeToMinutes(breakEntry.end);
            if (breakStart < dayStart || breakEnd > dayEnd || breakStart >= breakEnd) {
                return `${day.label}: Die Pause „${breakEntry.label || index + 1}“ muss vollständig innerhalb der Tagesarbeitszeit liegen.`;
            }
            if (index > 0 && breakStart < timeToMinutes(sortedBreaks[index - 1].end)) {
                return `${day.label}: Pausenzeiten dürfen sich nicht überschneiden.`;
            }
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
    const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());

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

    const updateWorkDay = (weekday, key, value) => {
        setConfig(previous => ({
            ...previous,
            workWeek: previous.workWeek.map(day => day.weekday === weekday ? { ...day, [key]: value } : day)
        }));
    };

    const updateDayBreak = (weekday, id, key, value) => {
        setConfig(previous => ({
            ...previous,
            workWeek: previous.workWeek.map(day => day.weekday === weekday ? {
                ...day,
                breaks: day.breaks.map(entry => entry.id === id ? { ...entry, [key]: value } : entry)
            } : day)
        }));
    };

    const addDayBreak = weekday => {
        const id = `day-${weekday}-break-${Date.now()}`;
        setConfig(previous => ({
            ...previous,
            workWeek: previous.workWeek.map(day => day.weekday === weekday ? {
                ...day,
                breaks: [...day.breaks, { id, label: "Neue Pause", start: "10:00", end: "10:15" }]
            } : day)
        }));
    };

    const removeDayBreak = (weekday, id) => {
        setConfig(previous => ({
            ...previous,
            workWeek: previous.workWeek.map(day => day.weekday === weekday
                ? { ...day, breaks: day.breaks.filter(entry => entry.id !== id) }
                : day)
        }));
    };

    const addSpecialRule = () => setConfig(previous => ({
        ...previous,
        specialWorkRules: [...previous.specialWorkRules, {
            id: `work-rule-${Date.now()}`,
            label: "Jeder zweite Freitag frei",
            kind: "recurring-day-off",
            enabled: true,
            weekday: 5,
            intervalWeeks: 2,
            anchorDate: `${new Date().getFullYear()}-01-02`
        }]
    }));
    const updateSpecialRule = (id, key, value) => setConfig(previous => ({
        ...previous,
        specialWorkRules: previous.specialWorkRules.map(rule => rule.id === id ? { ...rule, [key]: value } : rule)
    }));
    const removeSpecialRule = id => setConfig(previous => ({
        ...previous,
        specialWorkRules: previous.specialWorkRules.filter(rule => rule.id !== id)
    }));

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
        const normalized = normalizeCompanySettings(config);
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
            const calendar = companyFreeDaysCalendarPayload(normalized, calendarYear);
            try {
                await axios.post("/api/calendar/company-days/sync", calendar);
                setMessage({
                    type: "success",
                    text: `Unternehmenseinstellungen gespeichert. ${calendar.days.length} wiederkehrende freie Tage für ${calendar.year} wurden im Kalender aktualisiert.`
                });
            } catch (calendarError) {
                console.error("Freie Tage konnten nicht synchronisiert werden:", calendarError);
                setMessage({
                    type: "error",
                    text: "Unternehmenseinstellungen wurden gespeichert, die betriebsfreien Tage konnten aber nicht in den Kalender übertragen werden."
                });
            }
            return true;
        } catch (error) {
            console.error("Unternehmenseinstellungen konnten nicht gespeichert werden:", error);
            setMessage({ type: "error", text: "Unternehmenseinstellungen konnten nicht gespeichert werden." });
            return false;
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="responsive-settings-panel h-full overflow-y-auto p-6 text-sm text-gray-500">Unternehmenseinstellungen werden geladen...</div>;
    }

    return (
        <div className="responsive-settings-panel h-full overflow-y-auto p-6">
            <div className="max-w-6xl space-y-6">
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
                    <div className="text-xs uppercase tracking-wide text-gray-500">Arbeitswoche und Tagespausen</div>
                    <p className="mt-2 text-sm text-gray-400">
                        Jeder Tag besitzt eigene Arbeits- und Pausenzeiten. Diese Blöcke steuern Zeiterfassung, Jahreskapazität und die stündliche Urlaubsabrechnung.
                    </p>
                    <div className="mt-4 space-y-4">
                        {config.workWeek.map(day => (
                            <div key={day.weekday} className={`rounded-xl border p-4 ${day.enabled ? "border-gray-700 bg-gray-900" : "border-gray-800 bg-gray-900/40"}`}>
                                <div className="grid items-end gap-3 sm:grid-cols-[minmax(120px,1fr)_110px_150px_150px_auto]">
                                    <strong className="self-center text-base text-gray-200">{day.label}</strong>
                                    <label className="flex items-center gap-2 self-center text-xs text-gray-400">
                                        <input type="checkbox" checked={day.enabled} onChange={event => updateWorkDay(day.weekday, "enabled", event.target.checked)} />
                                        Arbeitstag
                                    </label>
                                    <TimeField label="Arbeitsbeginn" value={day.start} onChange={value => updateWorkDay(day.weekday, "start", value)} />
                                    <TimeField label="Arbeitsende" value={day.end} onChange={value => updateWorkDay(day.weekday, "end", value)} />
                                    <button type="button" disabled={!day.enabled} onClick={() => addDayBreak(day.weekday)} className="rounded-lg border border-gray-600 px-3 py-2 text-xs hover:bg-gray-700 disabled:opacity-40">Pause hinzufügen</button>
                                </div>
                                {day.enabled && <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
                                    {!day.breaks.length && <p className="text-xs text-gray-600">Keine Pause – der Tagesblock läuft durchgehend.</p>}
                                    {day.breaks.map(entry => (
                                        <div key={entry.id} className="grid items-end gap-2 sm:grid-cols-[1fr_140px_140px_auto]">
                                            <TextField label="Pause" value={entry.label} onChange={value => updateDayBreak(day.weekday, entry.id, "label", value)} />
                                            <TimeField label="Von" value={entry.start} onChange={value => updateDayBreak(day.weekday, entry.id, "start", value)} />
                                            <TimeField label="Bis" value={entry.end} onChange={value => updateDayBreak(day.weekday, entry.id, "end", value)} />
                                            <DeleteButton label={`${day.label}: Pause löschen`} onClick={() => removeDayBreak(day.weekday, entry.id)} />
                                        </div>
                                    ))}
                                </div>}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">Wiederkehrende Sonderregeln</div>
                            <p className="mt-2 text-sm text-gray-400">
                                Beispielsweise kann jeder zweite Freitag als betriebsfrei definiert werden. Das Ankerdatum bestimmt, welche Woche die erste freie Woche ist.
                            </p>
                        </div>
                        <button type="button" onClick={addSpecialRule} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">Sonderregel hinzufügen</button>
                    </div>
                    <div className="mt-4 space-y-3">
                        {!config.specialWorkRules.length && <div className="rounded-lg border border-dashed border-gray-700 p-5 text-center text-sm text-gray-500">Keine wiederkehrende Sonderregel angelegt.</div>}
                        {config.specialWorkRules.map(rule => (
                            <div key={rule.id} className="grid items-end gap-3 rounded-lg bg-gray-900 p-3 lg:grid-cols-[auto_1fr_160px_120px_160px_auto]">
                                <label className="flex items-center gap-2 self-center text-xs text-gray-400"><input type="checkbox" checked={rule.enabled} onChange={event => updateSpecialRule(rule.id, "enabled", event.target.checked)} />Aktiv</label>
                                <TextField label="Bezeichnung" value={rule.label} onChange={value => updateSpecialRule(rule.id, "label", value)} />
                                <label><span className="mb-1 block text-xs text-gray-500">Wochentag</span><select value={rule.weekday} onChange={event => updateSpecialRule(rule.id, "weekday", Number(event.target.value))} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">{config.workWeek.map(day => <option key={day.weekday} value={day.weekday}>{day.label}</option>)}</select></label>
                                <label><span className="mb-1 block text-xs text-gray-500">Alle … Wochen</span><input type="number" min="1" max="52" value={rule.intervalWeeks} onChange={event => updateSpecialRule(rule.id, "intervalWeeks", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white" /></label>
                                <label><span className="mb-1 block text-xs text-gray-500">Ankerdatum</span><input type="date" value={rule.anchorDate} onChange={event => updateSpecialRule(rule.id, "anchorDate", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white" /></label>
                                <DeleteButton label="Sonderregel löschen" onClick={() => removeSpecialRule(rule.id)} />
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-blue-950 bg-blue-950/30 p-4">
                        <div><p className="text-sm font-medium text-blue-200">Betriebsfreie Tage im Kalender</p><p className="mt-1 text-xs text-blue-300/70">Bei jedem Speichern werden automatisch erzeugte Einträge des gewählten Jahres ersetzt. Sie erscheinen im Firmenkalender als „Betriebsfrei“. Einmalige freie Tage können weiterhin direkt im Kalender angelegt werden.</p></div>
                        <div className="flex items-end gap-2"><label className="text-xs text-gray-400">Kalenderjahr<input type="number" min="2000" max="2200" value={calendarYear} onChange={event => setCalendarYear(Number(event.target.value))} className="mt-1 block w-28 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white" /></label><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50">Speichern und Kalender aktualisieren</button></div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Tätigkeiten</div>
                    <p className="mt-2 text-sm text-gray-400">
                        Die Liste wird in Zeiterfassung und Mitarbeiterkalender verwendet. Bestehende Zeiteinträge behalten beim Löschen ihre gespeicherte ID.
                    </p>

                    <div className="mt-4 space-y-3">
                        {config.workTypes.map(type => (
                            <div key={type.id} className="grid grid-cols-1 items-end gap-3 rounded-lg bg-gray-900 p-3 sm:grid-cols-[1fr_180px_auto]">
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

                        <div className="grid grid-cols-1 items-end gap-3 rounded-lg border border-dashed border-gray-600 p-3 sm:grid-cols-[1fr_auto]">
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
