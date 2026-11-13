import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { summarizeManualCabinetDimensions } from "@Engine/calculation/snapshots.mjs";
import { uploadJSONFile } from "../../../shared/api/file-api.js";
import {
  loadCompanySettings,
  normalizeCompanySettings
} from "../../../shared/settings/company-settings.js";
import { uploadGlobalFile } from "../../../shared/cache/global-cache.js";

const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

const weightLabels = {
  text: "Titel und Beschreibung",
  projectType: "Projektart",
  cabinetCount: "Korpusanzahl",
  complexity: "Konstruktive Komplexität",
  volume: "Abmessungsvolumen",
  partCount: "Anzahl Listenteile",
  materials: "Materialübereinstimmung"
};

function NumberField({ label, value, min = 0, max, step = "0.01", hint, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-right text-white outline-none focus:border-blue-500"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function TextField({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
      />
    </label>
  );
}

const createCostCenter = () => ({
  id: globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random()}`,
  name: "",
  hours: 0,
  hourlyRate: 0
});

const createCabinetDimension = () => ({
  id: globalThis.crypto?.randomUUID?.() || `cabinet-${Date.now()}-${Math.random()}`,
  type: "",
  quantity: 1,
  width: 0,
  height: 0,
  depth: 0,
  sections: 0,
  fronts: 0,
  functions: 0
});

const emptyManualSnapshot = costCenters => ({
  projectTitle: "",
  projectNumber: "",
  projectType: "",
  description: "",
  structureMode: "aggregate",
  cabinetDimensions: [createCabinetDimension()],
  cabinetCount: 0,
  cabinetTypes: 0,
  sections: 0,
  fronts: 0,
  functions: 0,
  complexity: 0,
  volume: 0,
  partCount: 0,
  totalAreaM2: 0,
  materialIds: "",
  materialCost: 0,
  plannedHours: 0,
  costCenters: costCenters?.length ? costCenters.map(center => ({ ...center, hours: 0 })) : [createCostCenter()]
});

const snapshotToManualForm = snapshot => ({
  projectTitle: snapshot.projectTitle || "",
  projectNumber: snapshot.projectNumber || "",
  projectType: snapshot.projectType || "",
  description: snapshot.description || "",
  structureMode: snapshot.cabinetSummary?.entryMode === "dimensions" ? "dimensions" : "aggregate",
  cabinetDimensions: snapshot.cabinetSummary?.cabinetDimensions?.length
    ? snapshot.cabinetSummary.cabinetDimensions.map(row => ({ ...row }))
    : [createCabinetDimension()],
  cabinetCount: snapshot.cabinetCount || 0,
  cabinetTypes: snapshot.cabinetTypes || 0,
  sections: snapshot.cabinetSummary?.sections || 0,
  fronts: snapshot.cabinetSummary?.fronts || 0,
  functions: snapshot.cabinetSummary?.functions || 0,
  complexity: snapshot.complexity || 0,
  volume: snapshot.volume || 0,
  partCount: snapshot.listSummary?.partCount || 0,
  totalAreaM2: snapshot.listSummary?.totalAreaM2 || 0,
  materialIds: (snapshot.listSummary?.materialIds || []).join(", "),
  materialCost: snapshot.materialCost || 0,
  plannedHours: snapshot.plannedHours || 0,
  costCenters: snapshot.actual?.costCenters?.length
    ? snapshot.actual.costCenters.map(center => ({ ...center }))
    : [createCostCenter()]
});

function ManualPostCalculationForm({ value, editing, saving, onChange, onCancel, onSubmit }) {
  const update = (key, nextValue) => onChange(current => ({ ...current, [key]: nextValue }));
  const updateCenter = (id, key, nextValue) => onChange(current => ({
    ...current,
    costCenters: current.costCenters.map(center => center.id === id
      ? { ...center, [key]: nextValue }
      : center)
  }));
  const updateDimension = (id, key, nextValue) => onChange(current => ({
    ...current,
    cabinetDimensions: current.cabinetDimensions.map(row => row.id === id
      ? { ...row, [key]: nextValue }
      : row)
  }));
  const actualHours = value.costCenters.reduce((sum, center) => sum + Math.max(0, Number(center.hours) || 0), 0);
  const dimensionSummary = summarizeManualCabinetDimensions(value.cabinetDimensions);
  const calculateComplexity = () => update("complexity", Math.round((
    Math.max(0, Number(value.cabinetCount) || 0)
    + Math.max(0, Number(value.sections) || 0) * 0.18
    + Math.max(0, Number(value.fronts) || 0) * 0.28
    + Math.max(0, Number(value.functions) || 0) * 0.35
  ) * 100) / 100);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-blue-900/70 bg-blue-950/10 p-5">
      <div>
        <h3 className="font-semibold text-white">{editing ? "Manuelle Nachkalkulation bearbeiten" : "Manuelle Nachkalkulation erfassen"}</h3>
        <p className="mt-1 text-sm text-gray-400">Diese Angaben bilden unmittelbar einen Vergleichsdatensatz für die automatische Stundenschätzung.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Projektbezeichnung" value={value.projectTitle} placeholder="z. B. Einbauschrank Dachschräge" onChange={next => update("projectTitle", next)} />
        <TextField label="Projektnummer" value={value.projectNumber} placeholder="Optional" onChange={next => update("projectNumber", next)} />
        <TextField label="Projektart" value={value.projectType} placeholder="z. B. Einbaumöbel" onChange={next => update("projectType", next)} />
        <NumberField label="Materialkosten" value={value.materialCost} max="1000000000" hint="Netto in €" onChange={next => update("materialCost", next)} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-300">Beschreibung und Besonderheiten</span>
        <textarea value={value.description} rows="3" onChange={event => update("description", event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" placeholder="Bauart, Einbausituation, besondere Beschläge oder Fertigungsmerkmale" />
      </label>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-gray-200">Korpus- und Strukturmerkmale</h4>
          <div className="inline-flex rounded-lg border border-gray-700 bg-gray-950 p-1" role="tablist" aria-label="Erfassung der Strukturmerkmale">
            <button type="button" role="tab" aria-selected={value.structureMode === "aggregate"} onClick={() => update("structureMode", "aggregate")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${value.structureMode === "aggregate" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Summenwerte</button>
            <button type="button" role="tab" aria-selected={value.structureMode === "dimensions"} onClick={() => update("structureMode", "dimensions")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${value.structureMode === "dimensions" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>Korpus-Außenmaße</button>
          </div>
        </div>
        {value.structureMode === "aggregate" ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <NumberField label="Korpusanzahl" value={value.cabinetCount} step="1" max="100000" onChange={next => update("cabinetCount", next)} />
            <NumberField label="Korpustypen" value={value.cabinetTypes} step="1" max="100000" onChange={next => update("cabinetTypes", next)} />
            <NumberField label="Sektionen gesamt" value={value.sections} step="1" max="1000000" onChange={next => update("sections", next)} />
            <NumberField label="Fronten gesamt" value={value.fronts} step="1" max="1000000" onChange={next => update("fronts", next)} />
            <NumberField label="Funktionen gesamt" value={value.functions} step="1" max="1000000" onChange={next => update("functions", next)} />
            <NumberField label="Volumen" value={value.volume} max="10000000" hint="Gesamtes Korpusvolumen in m³" onChange={next => update("volume", next)} />
            <div>
              <NumberField label="Komplexitätsindex" value={value.complexity} max="10000000" hint="Entspricht dem Index der Projektanalyse" onChange={next => update("complexity", next)} />
              <button type="button" onClick={calculateComplexity} className="mt-2 text-xs font-medium text-blue-300 hover:text-blue-200">Aus Struktur berechnen</button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-500">Ein Eintrag entspricht einem Korpustyp. Stückzahl und Außenmaße berechnen Anzahl und Volumen; Sektionen, Fronten und Funktionen verfeinern den Komplexitätsindex.</p>
            {value.cabinetDimensions.map((row, index) => (
              <div key={row.id} className="grid gap-3 rounded-lg border border-gray-700 bg-gray-900/70 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_90px_repeat(3,110px)_repeat(3,100px)_auto]">
                <TextField label={`Korpustyp ${index + 1}`} value={row.type} placeholder="z. B. Hochschrank" onChange={next => updateDimension(row.id, "type", next)} />
                <NumberField label="Stück" value={row.quantity} min="1" step="1" max="100000" onChange={next => updateDimension(row.id, "quantity", next)} />
                <NumberField label="Breite" value={row.width} max="100000" hint="mm" onChange={next => updateDimension(row.id, "width", next)} />
                <NumberField label="Höhe" value={row.height} max="100000" hint="mm" onChange={next => updateDimension(row.id, "height", next)} />
                <NumberField label="Tiefe" value={row.depth} max="100000" hint="mm" onChange={next => updateDimension(row.id, "depth", next)} />
                <NumberField label="Sektionen" value={row.sections} step="1" max="100000" onChange={next => updateDimension(row.id, "sections", next)} />
                <NumberField label="Fronten" value={row.fronts} step="1" max="100000" onChange={next => updateDimension(row.id, "fronts", next)} />
                <NumberField label="Funktionen" value={row.functions} step="1" max="100000" onChange={next => updateDimension(row.id, "functions", next)} />
                <button type="button" aria-label={`${row.type || `Korpustyp ${index + 1}`} entfernen`} onClick={() => onChange(current => ({ ...current, cabinetDimensions: current.cabinetDimensions.filter(item => item.id !== row.id) }))} className="self-end rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-800 hover:text-red-300">Entfernen</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-950 px-4 py-3">
              <button type="button" onClick={() => onChange(current => ({ ...current, cabinetDimensions: [...current.cabinetDimensions, createCabinetDimension()] }))} className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-800">+ Korpustyp</button>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-300">
                <span>{dimensionSummary.cabinetTypes} Typen</span>
                <span>{dimensionSummary.cabinetCount} Korpusse</span>
                <span>{decimal.format(dimensionSummary.volume)} m³</span>
                <span>Komplexität {decimal.format(dimensionSummary.complexity)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-200">Stückliste und Materialien</h4>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <NumberField label="Anzahl Listenteile" value={value.partCount} step="1" max="10000000" onChange={next => update("partCount", next)} />
          <NumberField label="Plattenfläche" value={value.totalAreaM2} max="10000000" hint="Gesamtfläche in m²" onChange={next => update("totalAreaM2", next)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-300">Materialkennungen</span>
            <textarea value={value.materialIds} rows="2" onChange={event => update("materialIds", event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500" placeholder="Durch Komma oder Zeilenumbruch trennen" />
          </label>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h4 className="text-sm font-semibold text-gray-200">Plan- und Iststunden</h4><p className="mt-1 text-xs text-gray-500">Für die Schätzung werden die Iststunden je Kostenstelle verwendet.</p></div>
          <button type="button" onClick={() => onChange(current => ({ ...current, costCenters: [...current.costCenters, createCostCenter()] }))} className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-800">+ Kostenstelle</button>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <NumberField label="Planstunden gesamt" value={value.plannedHours} max="100000" hint="Optional, für die Abweichung" onChange={next => update("plannedHours", next)} />
          <div className="space-y-3">
            {value.costCenters.map(center => (
              <div key={center.id} className="grid gap-3 rounded-lg border border-gray-700 bg-gray-900/70 p-3 sm:grid-cols-[minmax(160px,1fr)_140px_160px_auto]">
                <TextField label="Kostenstelle" value={center.name} placeholder="z. B. Werkstatt" onChange={next => updateCenter(center.id, "name", next)} />
                <NumberField label="Iststunden" value={center.hours} max="100000" onChange={next => updateCenter(center.id, "hours", next)} />
                <NumberField label="Stundensatz" value={center.hourlyRate} max="1000000" hint="€/h" onChange={next => updateCenter(center.id, "hourlyRate", next)} />
                <button type="button" aria-label={`${center.name || "Kostenstelle"} entfernen`} onClick={() => onChange(current => ({ ...current, costCenters: current.costCenters.filter(item => item.id !== center.id) }))} className="self-end rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-800 hover:text-red-300">Entfernen</button>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 text-right text-sm font-semibold text-emerald-300">Iststunden gesamt: {decimal.format(actualHours)} h</div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-700 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm hover:bg-gray-800">Abbrechen</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichert …" : editing ? "Änderungen speichern" : "Nachkalkulation übernehmen"}</button>
      </div>
    </form>
  );
}

function SnapshotCard({ snapshot, onEdit, onDelete, deleting }) {
  const references = Object.values(snapshot.objectReferences || {});
  const actualCenters = snapshot.actual?.costCenters || [];
  return (
    <details className="rounded-xl border border-gray-700 bg-gray-900/50">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-white">{snapshot.projectTitle}</div>
            <div className="mt-1 text-xs text-gray-500">
              {snapshot.source === "manual" ? "Manuell erfasst" : snapshot.projectNumber || "Ohne Projektnummer"} · freigegeben {dateTime.format(new Date(snapshot.releasedAt))}
              {snapshot.releasedBy ? ` durch ${snapshot.releasedBy}` : ""}
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-blue-950 px-2.5 py-1 text-blue-200">Plan {decimal.format(snapshot.plannedHours)} h</span>
            <span className="rounded-full bg-emerald-950 px-2.5 py-1 text-emerald-200">Ist {decimal.format(snapshot.actualHours)} h</span>
          </div>
        </div>
      </summary>
      <div className="grid gap-5 border-t border-gray-700 p-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Filter- und Kalkulationsdaten</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Projektart</dt><dd>{snapshot.projectType || "–"}</dd></div>
            <div><dt className="text-gray-500">Korpusse</dt><dd>{snapshot.cabinetCount}</dd></div>
            <div><dt className="text-gray-500">Komplexität</dt><dd>{decimal.format(snapshot.complexity)}</dd></div>
            <div><dt className="text-gray-500">Volumen</dt><dd>{decimal.format(snapshot.volume)} m³</dd></div>
            <div><dt className="text-gray-500">Materialbasis</dt><dd>{money.format(snapshot.materialCost)}</dd></div>
            <div><dt className="text-gray-500">Abweichung</dt><dd>{decimal.format(snapshot.varianceHours)} h</dd></div>
            <div><dt className="text-gray-500">Listenteile</dt><dd>{decimal.format(snapshot.listSummary?.partCount || 0)}</dd></div>
            <div><dt className="text-gray-500">Materialien</dt><dd>{snapshot.listSummary?.materialCount || 0}</dd></div>
          </dl>
          {actualCenters.length > 0 && (
            <div className="mt-4 space-y-1 text-sm">
              {actualCenters.map(center => (
                <div key={center.id} className="flex justify-between gap-3 rounded bg-gray-950 px-3 py-2">
                  <span>{center.name}</span>
                  <span>{decimal.format(center.hours)} h · {money.format(center.hourlyRate)}/h</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{snapshot.source === "manual" ? "Datenquelle" : "Versionierte Objektreferenzen"}</h3>
          {snapshot.source === "manual" ? (
            <div className="mt-3 rounded bg-gray-950 p-3 text-sm text-gray-400">Dieser Vergleichsdatensatz wurde manuell erfasst und besitzt keine Projektdatei-Referenzen.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {references.map(reference => (
                <div key={reference.fileId} className="rounded bg-gray-950 p-3 text-xs">
                  <div className="font-semibold text-gray-300">{reference.fileName} · Version {reference.serverVersion}</div>
                  <div className="mt-1 break-all font-mono text-gray-500">{reference.objectKey}</div>
                </div>
              ))}
            </div>
          )}
          {snapshot.source === "manual" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onEdit(snapshot)} className="rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-800">Bearbeiten</button>
              <button type="button" disabled={deleting} onClick={() => onDelete(snapshot)} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50">{deleting ? "Entfernt …" : "Entfernen"}</button>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

export default function EstimationSettingsPanel() {
  const [companySettings, setCompanySettings] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualForm, setManualForm] = useState(null);
  const [editingManualId, setEditingManualId] = useState(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [settings, response] = await Promise.all([
        loadCompanySettings(),
        axios.get("/api/settings/calculation-snapshots")
      ]);
      setCompanySettings(settings);
      setSnapshots(response.data.snapshots || []);
    } catch (error) {
      console.error("Stundenschätzungs-Einstellungen konnten nicht geladen werden", error);
      setMessage({ type: "error", text: "Einstellungen oder Snapshots konnten nicht geladen werden." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      loadCompanySettings(),
      axios.get("/api/settings/calculation-snapshots")
    ]).then(([settings, response]) => {
      if (!active) return;
      setCompanySettings(settings);
      setSnapshots(response.data.snapshots || []);
    }).catch(error => {
      console.error("Stundenschätzungs-Einstellungen konnten nicht geladen werden", error);
      if (active) setMessage({ type: "error", text: "Einstellungen oder Snapshots konnten nicht geladen werden." });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const estimation = companySettings?.estimation;
  const weightTotal = useMemo(
    () => Object.values(estimation?.weights || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [estimation?.weights]
  );
  const suggestedCostCenters = useMemo(() => {
    const centers = new Map();
    for (const snapshot of snapshots) {
      for (const center of snapshot.actual?.costCenters || []) {
        if (center?.id && center?.name && !centers.has(String(center.id))) {
          centers.set(String(center.id), {
            id: String(center.id),
            name: center.name,
            hours: 0,
            hourlyRate: Number(center.hourlyRate) || 0
          });
        }
      }
    }
    return [...centers.values()];
  }, [snapshots]);
  const updateEstimation = (key, value) => setCompanySettings(previous => ({
    ...previous,
    estimation: { ...previous.estimation, [key]: value }
  }));
  const updateWeight = (key, value) => setCompanySettings(previous => ({
    ...previous,
    estimation: {
      ...previous.estimation,
      weights: { ...previous.estimation.weights, [key]: value }
    }
  }));
  const updateOllama = (key, value) => setCompanySettings(previous => ({
    ...previous,
    estimation: {
      ...previous.estimation,
      ollama: { ...previous.estimation.ollama, [key]: value }
    }
  }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const normalized = normalizeCompanySettings(companySettings);
      await uploadGlobalFile({
        file: "settings-company.json",
        data: normalized,
        uploadFunction: { upload: uploadJSONFile, path: "/api/settings/company" }
      });
      setCompanySettings(normalized);
      setMessage({ type: "success", text: "Einstellungen der Stundenschätzung wurden gespeichert." });
    } catch (error) {
      console.error("Stundenschätzungs-Einstellungen konnten nicht gespeichert werden", error);
      setMessage({ type: "error", text: "Einstellungen konnten nicht gespeichert werden." });
    } finally {
      setSaving(false);
    }
  };

  const openNewManual = () => {
    setEditingManualId(null);
    setManualForm(emptyManualSnapshot(suggestedCostCenters));
    setMessage(null);
  };

  const editManual = snapshot => {
    setEditingManualId(snapshot.id);
    setManualForm(snapshotToManualForm(snapshot));
    setMessage(null);
  };

  const closeManual = () => {
    setEditingManualId(null);
    setManualForm(null);
  };

  const saveManual = async event => {
    event.preventDefault();
    setManualSaving(true);
    setMessage(null);
    try {
      const response = editingManualId
        ? await axios.put(`/api/settings/calculation-snapshots/manual/${editingManualId}`, manualForm)
        : await axios.post("/api/settings/calculation-snapshots/manual", manualForm);
      const snapshot = response.data.snapshot;
      setSnapshots(current => [snapshot, ...current.filter(item => item.id !== snapshot.id)]);
      closeManual();
      setMessage({ type: "success", text: editingManualId ? "Manuelle Nachkalkulation wurde aktualisiert." : "Manuelle Nachkalkulation wurde in die Stundenschätzung übernommen." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Die manuelle Nachkalkulation konnte nicht gespeichert werden." });
    } finally {
      setManualSaving(false);
    }
  };

  const removeManual = async snapshot => {
    if (!globalThis.confirm(`Manuelle Nachkalkulation „${snapshot.projectTitle}“ wirklich entfernen?`)) return;
    setDeletingId(snapshot.id);
    setMessage(null);
    try {
      await axios.delete(`/api/settings/calculation-snapshots/manual/${snapshot.id}`);
      setSnapshots(current => current.filter(item => item.id !== snapshot.id));
      if (editingManualId === snapshot.id) closeManual();
      setMessage({ type: "success", text: "Manuelle Nachkalkulation wurde entfernt." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Die manuelle Nachkalkulation konnte nicht entfernt werden." });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !estimation) {
    return <div className="h-full overflow-y-auto p-6 text-sm text-gray-500">Stundenschätzung wird geladen …</div>;
  }

  return (
    <div className="responsive-settings-panel h-full overflow-y-auto p-6">
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Stundenschätzung</h1>
            <p className="mt-1 text-sm text-gray-500">Snapshot-Suche, Gewichtung und vorbereitete lokale Ollama-Anbindung verwalten.</p>
          </div>
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
            {saving ? "Speichert …" : "Einstellungen speichern"}
          </button>
        </div>

        {message && <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/40 text-green-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>{message.text}</div>}

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h2 className="font-semibold">Suche und Treffermenge</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <NumberField label="Index-Kandidaten" value={estimation.candidatePoolSize} min="5" max="500" hint="Neueste freigegebene Snapshots der ersten Filterstufe" onChange={value => updateEstimation("candidatePoolSize", value)} />
            <NumberField label="Maximale Treffer" value={estimation.maximumMatches} min="1" max="20" hint="Für Detailprüfung und Stundenprognose" onChange={value => updateEstimation("maximumMatches", value)} />
            <NumberField label="Mindestähnlichkeit" value={estimation.minimumSimilarity} min="0" max="100" hint="Treffer unter diesem Prozentwert werden verworfen" onChange={value => updateEstimation("minimumSimilarity", value)} />
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Manuelle Nachkalkulation</h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-500">Historische Aufträge ohne vollständige Projektdateien können mit allen für die automatische Schätzung relevanten Struktur-, Material- und Istzeitdaten erfasst werden.</p>
            </div>
            {!manualForm && <button type="button" onClick={openNewManual} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500">+ Nachkalkulation erfassen</button>}
          </div>
          {manualForm && (
            <div className="mt-5">
              <ManualPostCalculationForm value={manualForm} editing={Boolean(editingManualId)} saving={manualSaving} onChange={setManualForm} onCancel={closeManual} onSubmit={saveManual} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold">Gewichtung</h2><p className="mt-1 text-sm text-gray-500">Relative Anteile der indexbasierten Ähnlichkeitsbewertung.</p></div>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs text-gray-400">Summe {weightTotal}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(weightLabels).map(([key, label]) => (
              <NumberField key={key} label={label} value={estimation.weights[key]} min="0" max="100" onChange={value => updateWeight(key, value)} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-3">
            <input id="ollama-enabled" type="checkbox" checked={estimation.ollama.enabled} onChange={event => updateOllama("enabled", event.target.checked)} className="h-4 w-4" />
            <label htmlFor="ollama-enabled" className="font-semibold">Lokale Ollama-Pipeline vorbereiten</label>
          </div>
          <p className="mt-2 text-sm text-gray-500">Die Felder werden bereits gespeichert. Aktiv verwendet werden sie erst mit der Embedding- und Erklärpipeline.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TextField label="Ollama-URL" value={estimation.ollama.baseUrl} placeholder="http://ollama:11434" onChange={value => updateOllama("baseUrl", value)} />
            <TextField label="Embedding-Modell" value={estimation.ollama.embeddingModel} placeholder="nomic-embed-text" onChange={value => updateOllama("embeddingModel", value)} />
            <TextField label="Erklärmodell" value={estimation.ollama.explanationModel} placeholder="z. B. llama3.2" onChange={value => updateOllama("explanationModel", value)} />
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">Freigegebene Nachkalkulations-Snapshots</h2><p className="mt-1 text-sm text-gray-500">{snapshots.length} tenantgebundene Datensätze im Suchindex.</p></div>
            <button type="button" onClick={load} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700">Aktualisieren</button>
          </div>
          <div className="mt-4 space-y-3">
            {snapshots.length ? snapshots.map(snapshot => <SnapshotCard key={snapshot.id} snapshot={snapshot} onEdit={editManual} onDelete={removeManual} deleting={deletingId === snapshot.id} />) : (
              <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-sm text-gray-500">Noch keine Nachkalkulation wurde freigegeben.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
