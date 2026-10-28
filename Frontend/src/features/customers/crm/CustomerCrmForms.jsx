import { useState } from "react";
import { initialAppointmentTimes } from "./customerCrmUtils.js";

const inputClass = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-slate-400";

export function CommunicationForm({ projects, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    type: "phone",
    subject: "",
    content: "",
    followUpDate: "",
    projectId: ""
  });
  const [error, setError] = useState("");
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError("");
    try {
      await onSubmit({
        ...form,
        projectId: form.projectId || null,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null
      });
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError?.response?.data?.error || submitError.message);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-700 bg-slate-800 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Kontakt erfassen</h2>
          <p className="mt-1 text-xs text-slate-400">Telefonie, E-Mail, Schriftverkehr oder interne Notiz</p>
        </div>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Art
          <select className={inputClass} value={form.type} onChange={event => set("type", event.target.value)}>
            <option value="phone">Telefonat</option>
            <option value="email">E-Mail</option>
            <option value="letter">Schriftverkehr</option>
            <option value="meeting">Besprechung</option>
            <option value="note">Notiz</option>
            <option value="other">Sonstiges</option>
          </select>
        </label>
        <label className={labelClass}>Projekt
          <select className={inputClass} value={form.projectId} onChange={event => set("projectId", event.target.value)}>
            <option value="">Allgemeiner Kundenkontakt</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label className={labelClass}>Betreff
          <input className={inputClass} value={form.subject} onChange={event => set("subject", event.target.value)} placeholder="Kurze Zusammenfassung" />
        </label>
        <label className={labelClass}>Wiedervorlage
          <input type="datetime-local" className={inputClass} value={form.followUpDate} onChange={event => set("followUpDate", event.target.value)} />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Inhalt
          <textarea required className={`${inputClass} min-h-28 resize-y`} value={form.content} onChange={event => set("content", event.target.value)} placeholder="Gesprächsnotiz oder Inhalt des Schriftverkehrs" />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-950/50 p-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">Abbrechen</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">{busy ? "Speichern…" : "Kontakt speichern"}</button>
      </div>
    </form>
  );
}

export function AppointmentForm({ projects, addresses, busy, onSubmit, onCancel }) {
  const defaults = initialAppointmentTimes();
  const [form, setForm] = useState({
    appointmentType: "customer",
    title: "",
    description: "",
    projectId: "",
    addressId: "",
    ...defaults
  });
  const [error, setError] = useState("");
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError("");
    try {
      await onSubmit({
        ...form,
        projectId: form.projectId || null,
        addressId: form.addressId || null,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: "planned"
      });
    } catch (submitError) {
      setError(submitError?.response?.data?.message || submitError?.response?.data?.error || submitError.message);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-700 bg-slate-800 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Kundentermin erfassen</h2>
          <p className="mt-1 text-xs text-slate-400">Termin optional einem Projekt und einer Kundenadresse zuordnen</p>
        </div>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Titel
          <input required className={inputClass} value={form.title} onChange={event => set("title", event.target.value)} placeholder="z. B. Beratung vor Ort" />
        </label>
        <label className={labelClass}>Art
          <select className={inputClass} value={form.appointmentType} onChange={event => set("appointmentType", event.target.value)}>
            <option value="customer">Kundentermin</option>
            <option value="consultation">Beratung</option>
            <option value="measurement">Aufmaß</option>
            <option value="handover">Übergabe</option>
            <option value="service">Service</option>
          </select>
        </label>
        <label className={labelClass}>Beginn
          <input required type="datetime-local" className={inputClass} value={form.startAt} onChange={event => set("startAt", event.target.value)} />
        </label>
        <label className={labelClass}>Ende
          <input required type="datetime-local" className={inputClass} value={form.endAt} onChange={event => set("endAt", event.target.value)} />
        </label>
        <label className={labelClass}>Projekt
          <select className={inputClass} value={form.projectId} onChange={event => set("projectId", event.target.value)}>
            <option value="">Ohne Projekt</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label className={labelClass}>Adresse
          <select className={inputClass} value={form.addressId} onChange={event => set("addressId", event.target.value)}>
            <option value="">Keine Adresse</option>
            {addresses.map(address => <option key={address.id} value={address.id}>{address.street} {address.houseNumber}, {address.city}</option>)}
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Notiz
          <textarea className={`${inputClass} min-h-24 resize-y`} value={form.description} onChange={event => set("description", event.target.value)} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-950/50 p-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">Abbrechen</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">{busy ? "Speichern…" : "Termin speichern"}</button>
      </div>
    </form>
  );
}
