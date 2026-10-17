import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { uploadJSONFile } from "../../../services/apiTemplates.js";
import {
  loadCompanySettings,
  normalizeCompanySettings
} from "../../../services/companySettings.js";
import { uploadGlobalFile } from "../../../services/globalMemoryCache.js";

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

function NumberField({ label, value, min, max, hint, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
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

function SnapshotCard({ snapshot }) {
  const references = Object.values(snapshot.objectReferences || {});
  const actualCenters = snapshot.actual?.costCenters || [];
  return (
    <details className="rounded-xl border border-gray-700 bg-gray-900/50">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-white">{snapshot.projectTitle}</div>
            <div className="mt-1 text-xs text-gray-500">
              {snapshot.projectNumber || "Ohne Projektnummer"} · freigegeben {dateTime.format(new Date(snapshot.releasedAt))}
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
          <h3 className="text-sm font-semibold text-gray-200">Versionierte Objektreferenzen</h3>
          <div className="mt-3 space-y-2">
            {references.map(reference => (
              <div key={reference.fileId} className="rounded bg-gray-950 p-3 text-xs">
                <div className="font-semibold text-gray-300">{reference.fileName} · Version {reference.serverVersion}</div>
                <div className="mt-1 break-all font-mono text-gray-500">{reference.objectKey}</div>
              </div>
            ))}
          </div>
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
            {snapshots.length ? snapshots.map(snapshot => <SnapshotCard key={snapshot.id} snapshot={snapshot} />) : (
              <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-sm text-gray-500">Noch keine Nachkalkulation wurde freigegeben.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
