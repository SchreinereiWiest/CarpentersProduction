import { useEffect, useState } from "react";
import { uploadJSONFile } from "../../../shared/api/file-api.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";
import { loadCompanySettings, normalizeCompanySettings } from "../../../shared/settings/company-settings.js";

const slug = (label, fallback) => String(label || fallback)
  .toLocaleLowerCase("de-DE")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || fallback;

function RowActions({ index, count, onMove, onDelete }) {
  return <div className="flex gap-1">
    <button type="button" aria-label="Nach oben" disabled={index === 0} onClick={() => onMove(-1)} className="rounded border border-gray-700 px-2 py-2 disabled:opacity-30">↑</button>
    <button type="button" aria-label="Nach unten" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded border border-gray-700 px-2 py-2 disabled:opacity-30">↓</button>
    <button type="button" onClick={onDelete} className="rounded border border-red-900 px-3 py-2 text-red-300">Löschen</button>
  </div>;
}

export default function ManagementSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCompanySettings().then(setSettings).catch(() => setMessage("Einstellungen konnten nicht geladen werden."));
  }, []);

  if (!settings) return <div className="h-full overflow-y-auto p-6 text-gray-400">Management-Einstellungen werden geladen …</div>;

  const management = settings.management;
  const updateList = (key, updater) => setSettings(current => ({
    ...current,
    management: { ...current.management, [key]: updater(current.management[key]) }
  }));
  const update = (key, id, field, value) => updateList(key, items => items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const move = (key, index, delta) => updateList(key, items => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    return next;
  });
  const add = key => updateList(key, items => {
    const label = key === "workflowStates" ? "Neuer Status" : "Neuer Zieltyp";
    const id = `${slug(label, key === "workflowStates" ? "status" : "ziel")}-${Date.now()}`;
    return [...items, key === "workflowStates" ? { id, label } : { id, label, unit: "Wert" }];
  });

  const save = async () => {
    if (!management.workflowStates.length || management.workflowStates.some(item => !item.label.trim())) {
      setMessage("Mindestens ein vollständig benannter Management-Status ist erforderlich.");
      return;
    }
    if (new Set(management.workflowStates.map(item => item.id)).size !== management.workflowStates.length
      || new Set(management.workflowStates.map(item => item.label.trim().toLocaleLowerCase("de-DE"))).size !== management.workflowStates.length) {
      setMessage("Management-Status müssen eindeutige IDs und Bezeichnungen besitzen.");
      return;
    }
    if (!management.goalTypes.length || management.goalTypes.some(item => !item.label.trim() || !item.unit.trim())) {
      setMessage("Mindestens ein Zieltyp mit Bezeichnung und Einheit ist erforderlich.");
      return;
    }
    if (new Set(management.goalTypes.map(item => item.id)).size !== management.goalTypes.length
      || new Set(management.goalTypes.map(item => item.label.trim().toLocaleLowerCase("de-DE"))).size !== management.goalTypes.length) {
      setMessage("Zieltypen müssen eindeutige IDs und Bezeichnungen besitzen.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const normalized = normalizeCompanySettings(settings);
      await uploadGlobalFile({
        file: "settings-company.json",
        data: normalized,
        uploadFunction: { upload: uploadJSONFile, path: "/api/settings/company" }
      });
      setSettings(normalized);
      setMessage("Management-Einstellungen gespeichert.");
    } catch {
      setMessage("Management-Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="responsive-settings-panel h-full overflow-y-auto p-6">
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Management</h1>
        <p className="mt-1 text-sm text-gray-500">Statusspalten des Projektboards und Kennzahlen der Jahreszielplanung konfigurieren.</p>
      </div>
      {message && <div className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm">{message}</div>}

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-semibold">Projektstatus im Management</h2><p className="mt-1 text-sm text-gray-400">Die Reihenfolge entspricht den Spalten von links nach rechts. Der allgemeine Projektstatus bleibt davon getrennt.</p></div>
          <button type="button" onClick={() => add("workflowStates")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm">Status hinzufügen</button>
        </div>
        <div className="mt-4 space-y-2">
          {management.workflowStates.map((item, index) => <div key={item.id} className="grid items-end gap-3 rounded-lg bg-gray-900 p-3 sm:grid-cols-[36px_1fr_180px_auto]">
            <span className="pb-2 text-center text-sm text-gray-500">{index + 1}</span>
            <label><span className="mb-1 block text-xs text-gray-500">Bezeichnung</span><input value={item.label} onChange={event => update("workflowStates", item.id, "label", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2" /></label>
            <div><span className="mb-1 block text-xs text-gray-500">Technische ID</span><div className="truncate rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-500">{item.id}</div></div>
            <RowActions index={index} count={management.workflowStates.length} onMove={delta => move("workflowStates", index, delta)} onDelete={() => updateList("workflowStates", items => items.filter(entry => entry.id !== item.id))} />
          </div>)}
        </div>
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-semibold">Datentypen der Jahresziele</h2><p className="mt-1 text-sm text-gray-400">Bezeichnung und Einheit werden beim Anlegen eines Zieles als historische Momentaufnahme gespeichert.</p></div>
          <button type="button" onClick={() => add("goalTypes")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm">Zieltyp hinzufügen</button>
        </div>
        <div className="mt-4 space-y-2">
          {management.goalTypes.map((item, index) => <div key={item.id} className="grid items-end gap-3 rounded-lg bg-gray-900 p-3 sm:grid-cols-[1fr_180px_auto]">
            <label><span className="mb-1 block text-xs text-gray-500">Kennzahl</span><input value={item.label} onChange={event => update("goalTypes", item.id, "label", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2" /></label>
            <label><span className="mb-1 block text-xs text-gray-500">Einheit</span><input value={item.unit} onChange={event => update("goalTypes", item.id, "unit", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2" /></label>
            <RowActions index={index} count={management.goalTypes.length} onMove={delta => move("goalTypes", index, delta)} onDelete={() => updateList("goalTypes", items => items.filter(entry => entry.id !== item.id))} />
          </div>)}
        </div>
      </section>

      <div className="flex justify-end pb-6"><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium disabled:opacity-50">{saving ? "Wird gespeichert …" : "Einstellungen speichern"}</button></div>
    </div>
  </div>;
}
