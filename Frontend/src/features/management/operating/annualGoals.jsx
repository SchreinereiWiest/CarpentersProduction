import { useState } from "react";
import { useManagement } from "../hooks/useManagement.js";

const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-blue-500";
const dateOnly = value => value ? String(value).slice(0, 10) : "";
const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });

const goalPayload = (goal, changes = {}) => ({
  year: goal.year,
  typeId: goal.typeId,
  typeLabel: goal.typeLabel,
  unit: goal.unit,
  title: goal.title,
  targetValue: goal.targetValue,
  targetDate: dateOnly(goal.targetDate),
  actualValue: goal.actualValue,
  actualDate: dateOnly(goal.actualDate),
  note: goal.note || "",
  ...changes
});

export default function AnnualGoals() {
  const { workspace, companySettings, year, setYear, busy, request } = useManagement();
  const goalTypes = companySettings.management.goalTypes;
  const firstType = goalTypes[0];
  const [form, setForm] = useState(() => ({
    typeId: firstType?.id || "",
    title: firstType?.label || "",
    targetValue: "",
    targetDate: `${year}-12-31`,
    note: ""
  }));

  const create = async event => {
    event.preventDefault();
    const type = goalTypes.find(item => item.id === form.typeId);
    if (!type) return;
    const success = await request("post", "/goals", {
      ...form,
      year,
      typeLabel: type.label,
      unit: type.unit
    }, "Jahresziel angelegt.");
    if (success) setForm(current => ({ ...current, title: type.label, targetValue: "", note: "" }));
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Jahreszielplanung {year}</h1><p className="mt-1 text-sm text-gray-400">Soll zum Stichtag festlegen, Zwischenstände dokumentieren und nach Jahresende mit dem Istwert vergleichen.</p></div>
      <div className="flex flex-wrap gap-2">
        {[...new Set(workspace.goalYears)].filter(value => value !== year).slice(0, 5).map(value => <button key={value} type="button" onClick={() => setYear(value)} className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white">Vergleich {value}</button>)}
      </div>
    </div>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <h2 className="font-semibold">Neues Soll-Ziel</h2>
      <form onSubmit={create} className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr_180px_180px_2fr_auto] lg:items-end">
        <Field label="Datentyp"><select required value={form.typeId} onChange={event => {
          const type = goalTypes.find(item => item.id === event.target.value);
          setForm(current => ({ ...current, typeId: event.target.value, title: type?.label || current.title }));
        }} className={inputClass}>{goalTypes.map(item => <option key={item.id} value={item.id}>{item.label} ({item.unit})</option>)}</select></Field>
        <Field label="Zielbezeichnung"><input required value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className={inputClass} /></Field>
        <Field label="Sollwert"><input required type="number" step="0.01" value={form.targetValue} onChange={event => setForm(current => ({ ...current, targetValue: event.target.value }))} className={inputClass} /></Field>
        <Field label="Stichtag"><input required type="date" value={form.targetDate} onChange={event => setForm(current => ({ ...current, targetDate: event.target.value }))} className={inputClass} /></Field>
        <Field label="Erläuterung"><input value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} className={inputClass} placeholder="Messmethode oder gewünschte Wirkung" /></Field>
        <button type="submit" disabled={busy || !goalTypes.length} className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium disabled:opacity-50">Ziel anlegen</button>
      </form>
    </section>

    {!workspace.goals.length && <div className="rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-500">Für {year} sind noch keine Jahresziele angelegt.</div>}
    <div className="grid gap-5 xl:grid-cols-2">
      {workspace.goals.map(goal => <GoalCard key={goal.id} goal={goal} busy={busy} request={request} />)}
    </div>
  </div>;
}

function GoalCard({ goal, busy, request }) {
  const latest = goal.actualValue ?? goal.checkpoints.at(-1)?.value ?? 0;
  const variance = goal.actualValue === null ? null : Number(goal.actualValue) - Number(goal.targetValue);
  const progress = Number(goal.targetValue) !== 0 ? latest / Number(goal.targetValue) * 100 : 0;
  const [checkpoint, setCheckpoint] = useState({ date: today(), value: "", note: "" });
  const [actual, setActual] = useState({ value: goal.actualValue ?? "", date: dateOnly(goal.actualDate) || today() });
  const [showActual, setShowActual] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [edit, setEdit] = useState({
    title: goal.title,
    targetValue: goal.targetValue,
    targetDate: dateOnly(goal.targetDate),
    note: goal.note || ""
  });

  const addCheckpoint = async event => {
    event.preventDefault();
    if (await request("post", `/goals/${goal.id}/checkpoints`, checkpoint, "Zwischenstand gespeichert.")) setCheckpoint(current => ({ ...current, value: "", note: "" }));
  };
  const saveActual = async event => {
    event.preventDefault();
    if (await request("put", `/goals/${goal.id}`, goalPayload(goal, { actualValue: actual.value, actualDate: actual.date }), "Istwert und Soll-Ist-Vergleich gespeichert.")) setShowActual(false);
  };
  const saveTarget = async event => {
    event.preventDefault();
    if (await request("put", `/goals/${goal.id}`, goalPayload(goal, edit), "Soll-Ziel aktualisiert.")) setShowEdit(false);
  };

  return <article className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-wider text-blue-400">{goal.typeLabel}</p><h2 className="mt-1 text-lg font-semibold">{goal.title}</h2><p className="mt-1 text-sm text-gray-500">Stichtag {new Date(goal.targetDate).toLocaleDateString("de-DE")}</p></div>
      <div className="flex gap-3"><button type="button" onClick={() => setShowEdit(value => !value)} className="text-sm text-blue-300">Soll bearbeiten</button><button type="button" disabled={busy} onClick={() => window.confirm("Jahresziel wirklich löschen?") && request("delete", `/goals/${goal.id}`, undefined, "Jahresziel gelöscht.")} className="text-sm text-red-300">Löschen</button></div>
    </div>
    {showEdit && <form onSubmit={saveTarget} className="mt-4 grid gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:grid-cols-2">
      <Field label="Zielbezeichnung"><input required value={edit.title} onChange={event => setEdit(current => ({ ...current, title: event.target.value }))} className={inputClass} /></Field>
      <Field label={`Sollwert (${goal.unit})`}><input required type="number" step="0.01" value={edit.targetValue} onChange={event => setEdit(current => ({ ...current, targetValue: event.target.value }))} className={inputClass} /></Field>
      <Field label="Stichtag"><input required type="date" value={edit.targetDate} onChange={event => setEdit(current => ({ ...current, targetDate: event.target.value }))} className={inputClass} /></Field>
      <Field label="Erläuterung"><input value={edit.note} onChange={event => setEdit(current => ({ ...current, note: event.target.value }))} className={inputClass} /></Field>
      <div className="flex gap-2 sm:col-span-2 sm:justify-end"><button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-gray-700 px-4 py-2">Abbrechen</button><button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2">Soll speichern</button></div>
    </form>}
    <div className="mt-5 grid grid-cols-3 gap-3">
      <Value label="Soll" value={`${numberFormat.format(goal.targetValue)} ${goal.unit}`} />
      <Value label="Aktueller Stand" value={`${numberFormat.format(latest)} ${goal.unit}`} />
      <Value label="Soll / Ist" value={variance === null ? "Noch offen" : `${variance >= 0 ? "+" : ""}${numberFormat.format(variance)} ${goal.unit}`} tone={variance === null ? "" : variance >= 0 ? "good" : "bad"} />
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-950"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
    {goal.note && <p className="mt-4 text-sm text-gray-400">{goal.note}</p>}

    <div className="mt-5 border-t border-gray-700 pt-4">
      <h3 className="text-sm font-medium">Zwischenstände</h3>
      <div className="mt-3 space-y-2">
        {goal.checkpoints.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 px-3 py-2 text-sm">
          <span className="text-gray-500">{new Date(item.date).toLocaleDateString("de-DE")}</span><span className="font-medium">{numberFormat.format(item.value)} {goal.unit}</span><span className="min-w-0 flex-1 truncate text-gray-500">{item.note}</span>
          <button type="button" aria-label="Zwischenstand löschen" onClick={() => request("delete", `/goals/${goal.id}/checkpoints/${item.id}`, undefined, "Zwischenstand gelöscht.")} className="text-red-300">×</button>
        </div>)}
      </div>
      <form onSubmit={addCheckpoint} className="mt-3 grid gap-2 sm:grid-cols-[140px_120px_1fr_auto]">
        <input required type="date" value={checkpoint.date} onChange={event => setCheckpoint(current => ({ ...current, date: event.target.value }))} className={inputClass} aria-label="Datum Zwischenstand" />
        <input required type="number" step="0.01" value={checkpoint.value} onChange={event => setCheckpoint(current => ({ ...current, value: event.target.value }))} className={inputClass} placeholder="Wert" aria-label="Wert Zwischenstand" />
        <input value={checkpoint.note} onChange={event => setCheckpoint(current => ({ ...current, note: event.target.value }))} className={inputClass} placeholder="Notiz (optional)" aria-label="Notiz Zwischenstand" />
        <button type="submit" disabled={busy} className="rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300">Hinzufügen</button>
      </form>
    </div>

    <div className="mt-5 border-t border-gray-700 pt-4">
      {!showActual ? <button type="button" onClick={() => setShowActual(true)} className="rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">{goal.actualValue === null ? "Istwert zum Jahresabschluss erfassen" : "Istwert korrigieren"}</button>
        : <form onSubmit={saveActual} className="flex flex-wrap items-end gap-3">
          <Field label={`Istwert (${goal.unit})`}><input required type="number" step="0.01" value={actual.value} onChange={event => setActual(current => ({ ...current, value: event.target.value }))} className={inputClass} /></Field>
          <Field label="Ist-Datum"><input required type="date" value={actual.date} onChange={event => setActual(current => ({ ...current, date: event.target.value }))} className={inputClass} /></Field>
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2">Soll-Ist-Vergleich abschließen</button>
          <button type="button" onClick={() => setShowActual(false)} className="rounded-lg border border-gray-700 px-4 py-2">Abbrechen</button>
        </form>}
    </div>
  </article>;
}

function Field({ label, children }) { return <label className="block text-sm text-gray-400"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Value({ label, value, tone }) { return <div className="rounded-xl bg-gray-900 p-3"><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 font-semibold ${tone === "good" ? "text-green-300" : tone === "bad" ? "text-red-300" : "text-gray-100"}`}>{value}</p></div>; }
