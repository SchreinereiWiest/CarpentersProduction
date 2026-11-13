import { useMemo, useState } from "react";
import { formatGermanDate } from "../../../shared/utils/date.js";
import {
  buildEventPayload,
  dateKey,
  durationInDays,
  timeKey
} from "../engine/calendar.js";

const inputClass = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-slate-400";

const productionTypes = [
  ["project", "Gesamter Projektzeitraum"],
  ["measurement", "Aufmaß"],
  ["planning", "Planung"],
  ["manufacturing", "Fertigung"],
  ["installation", "Montage"],
  ["appointment", "Einzeltermin"]
];

const personalTypes = [
  ["appointment", "Termin"],
  ["vacation", "Urlaub"],
  ["other", "Sonstiges"]
];

const blankForm = ({ date, admin }) => ({
  scope: admin ? "production" : "personal",
  type: admin ? "project" : "appointment",
  title: "",
  description: "",
  projectId: "",
  allDay: admin,
  startDate: dateKey(date),
  startTime: "08:00",
  endDate: dateKey(date),
  endTime: "09:00",
  duration: 1
});

const eventForm = event => ({
  scope: event.scope,
  type: event.type,
  title: event.title ?? "",
  description: event.description ?? "",
  projectId: event.projectId ?? "",
  allDay: event.allDay,
  startDate: dateKey(event.startAt),
  startTime: timeKey(event.startAt),
  endDate: dateKey(event.endAt),
  endTime: timeKey(event.endAt),
  duration: event.allDay ? durationInDays(event) : 1
});

export default function CalendarEventForm({
  event,
  focusDate,
  projects,
  admin,
  readOnly,
  saving,
  onSave,
  onDelete,
  onNew
}) {
  const [form, setForm] = useState(() => event ? eventForm(event) : blankForm({ date: focusDate, admin }));
  const [error, setError] = useState("");

  const typeOptions = form.scope === "production" ? productionTypes : personalTypes;
  const projectGroups = useMemo(() => ({
    active: projects.filter(project => project.status === "active"),
    inactive: projects.filter(project => project.status === "inactive")
  }), [projects]);

  const set = (name, value) => setForm(current => {
    const next = { ...current, [name]: value };
    if (name === "scope") {
      next.type = value === "production" ? "project" : "appointment";
      next.projectId = "";
      next.allDay = value === "production";
    }
    if (name === "startDate" && current.endDate === current.startDate) next.endDate = value;
    return next;
  });

  const submit = async submitEvent => {
    submitEvent.preventDefault();
    setError("");
    try {
      await onSave({ ...(event?.id ? { id: event.id } : {}), ...buildEventPayload(form) });
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError?.response?.data?.error || submitError.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{event ? "Termindetails" : "Neuer Termin"}</h2>
          {event?.project && <p className="mt-1 text-xs text-slate-400">{event.project.title}</p>}
        </div>
        {event && (
          <button type="button" onClick={onNew} className="text-xs text-sky-400 hover:text-sky-300">
            Neuer Termin
          </button>
        )}
      </div>

      {admin && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-900 p-1">
          {[['production', 'Produktion'], ['personal', 'Persönlich']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={readOnly}
              onClick={() => set("scope", value)}
              className={`rounded-md px-2 py-2 text-xs font-medium ${form.scope === value ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <label className={labelClass}>
        Typ
        <select className={inputClass} value={form.type} disabled={readOnly} onChange={e => set("type", e.target.value)}>
          {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {form.scope === "production" && (
        <label className={labelClass}>
          Projekt {form.type !== "appointment" && <span className="text-rose-400">*</span>}
          <select className={inputClass} value={form.projectId} disabled={readOnly} onChange={e => set("projectId", e.target.value)}>
            <option value="">Ohne Projekt</option>
            {projectGroups.active.length > 0 && (
              <optgroup label="Aktive Projekte">
                {projectGroups.active.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
              </optgroup>
            )}
            {projectGroups.inactive.length > 0 && (
              <optgroup label="Inaktive Projekte">
                {projectGroups.inactive.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
              </optgroup>
            )}
          </select>
          {form.projectId && (
            <span className="mt-1 block normal-case text-slate-500">
              Projektstart: {formatGermanDate(projects.find(project => project.id === form.projectId)?.startDate)}
            </span>
          )}
        </label>
      )}

      <label className={labelClass}>
        Titel {form.projectId ? "(optional)" : "*"}
        <input className={inputClass} value={form.title} disabled={readOnly} onChange={e => set("title", e.target.value)} placeholder="z. B. Küchenmontage" />
      </label>

      <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
        <input type="checkbox" checked={form.allDay} disabled={readOnly} onChange={e => set("allDay", e.target.checked)} className="size-4 accent-sky-500" />
        Ganztägig / über mehrere Tage
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Startdatum
          <input type="date" className={inputClass} value={form.startDate} disabled={readOnly} onChange={e => set("startDate", e.target.value)} required />
        </label>
        {form.allDay ? (
          <label className={labelClass}>
            Dauer (Tage)
            <input type="number" min="1" max="365" className={inputClass} value={form.duration} disabled={readOnly} onChange={e => set("duration", e.target.value)} required />
          </label>
        ) : (
          <label className={labelClass}>
            Startzeit
            <input type="time" className={inputClass} value={form.startTime} disabled={readOnly} onChange={e => set("startTime", e.target.value)} required />
          </label>
        )}
      </div>

      {!form.allDay && (
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Enddatum
            <input type="date" className={inputClass} value={form.endDate} disabled={readOnly} onChange={e => set("endDate", e.target.value)} required />
          </label>
          <label className={labelClass}>
            Endzeit
            <input type="time" className={inputClass} value={form.endTime} disabled={readOnly} onChange={e => set("endTime", e.target.value)} required />
          </label>
        </div>
      )}

      <label className={labelClass}>
        Notiz
        <textarea className={`${inputClass} min-h-20 resize-y`} value={form.description} disabled={readOnly} onChange={e => set("description", e.target.value)} />
      </label>

      {readOnly && <p className="rounded-lg bg-slate-900 p-3 text-xs text-slate-400">Produktionszeiten können nur von Administratoren bearbeitet werden.</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</p>}

      {!readOnly && (
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">
            {saving ? "Speichern…" : event ? "Änderungen speichern" : "Termin anlegen"}
          </button>
          {event && (
            <button type="button" disabled={saving} onClick={() => onDelete(event)} className="rounded-lg border border-rose-800 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/50">
              Löschen
            </button>
          )}
        </div>
      )}
    </form>
  );
}
