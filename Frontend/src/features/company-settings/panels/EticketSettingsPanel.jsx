import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import QRCode from "qrcode";

import { createPartCodePayload, getEticketInformationRows } from "@Engine/eticket/index.js";

const FIELD_LABELS = {
  pid: "PID", project: "Projekt", customer: "Kunde", partName: "Bauteilname",
  cabinet: "Korpus", dimensions: "Abmessungen", material: "Material",
  edges: "Kanten", cncProgram: "CNC-Programm", instance: "Physische Instanz"
};

const SAMPLE = {
  projectId: "PRJ-2026-0142", pid: "000042", instanceId: "187",
  project: "Empfangstheke Muster", customer: "Schreinerei Wiest", partName: "Seite links",
  cabinet: "Unterschrank 02", dimensions: "720 × 560 × 19 mm", material: "W980 ST2",
  edges: "V: ABS 2 mm · L/R: ABS 1 mm", cncProgram: "000042.xxl"
};

function SettingCard({ title, description, children }) {
  return <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
    <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
    {description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>;
}

function TextField({ label, value, onChange, placeholder }) {
  return <label className="block text-xs text-gray-400"><span className="mb-1 block">{label}</span><input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" /></label>;
}

function NumberField({ label, value, min, max, step = 1, suffix, onChange }) {
  return <label className="block text-xs text-gray-400"><span className="mb-1 block">{label}</span><span className="flex rounded border border-gray-700 bg-gray-950 focus-within:border-blue-500"><input type="number" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none" />{suffix && <span className="border-l border-gray-700 px-3 py-2 text-gray-500">{suffix}</span>}</span></label>;
}

function Toggle({ label, description, checked, onChange }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-gray-700 bg-gray-900/70 p-3"><span><span className="block text-sm text-gray-200">{label}</span>{description && <span className="mt-0.5 block text-xs text-gray-500">{description}</span>}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 size-4 accent-blue-500" /></label>;
}

function LabelPreview({ settings }) {
  const [qr, setQr] = useState("");
  const code = useMemo(() => createPartCodePayload(SAMPLE), []);
  const rows = getEticketInformationRows(SAMPLE, settings);

  useEffect(() => {
    let current = true;
    QRCode.toDataURL(code, { margin: 0, width: 320, errorCorrectionLevel: "M" })
      .then(url => current && setQr(url)).catch(() => current && setQr(""));
    return () => { current = false; };
  }, [code]);

  const codeBlock = <div className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-white p-1">
    {settings.code.type === "qr"
      ? <img src={qr} alt="QR-Code Vorschau" className="max-h-full max-w-full object-contain" />
      : <div className="flex h-3/4 w-full items-stretch justify-center gap-px" aria-label="Barcode Vorschau">{Array.from({ length: 34 }, (_, index) => <i key={index} className="bg-black" style={{ width: `${index % 5 === 0 ? 4 : index % 3 === 0 ? 2 : 1}px` }} />)}</div>}
  </div>;
  const info = <div className="min-h-0 overflow-hidden p-2 text-[clamp(6px,0.8vw,11px)] leading-tight text-gray-950">
    {settings.preprint.enabled && settings.preprint.title && <strong className="mb-1 block text-[1.3em] tracking-wide">{settings.preprint.title}</strong>}
    {rows.map(row => <div key={row.key} className="truncate"><b>{row.label}:</b> {row.value}</div>)}
    {settings.preprint.enabled && settings.preprint.footer && <div className="mt-1 truncate text-[0.85em] text-gray-500">{settings.preprint.footer}</div>}
  </div>;
  const grid = ["left", "right"].includes(settings.code.position)
    ? { gridTemplateColumns: settings.code.position === "left" ? "32% 68%" : "68% 32%" }
    : { gridTemplateRows: settings.code.position === "top" ? "42% 58%" : "58% 42%" };

  return <div className="mx-auto grid w-full max-w-2xl overflow-hidden bg-white shadow-2xl" style={{ aspectRatio: `${settings.label.widthMm}/${settings.label.heightMm}`, ...grid, border: settings.preprint.showBorder ? "2px solid #111827" : "1px dashed #9ca3af" }}>
    {settings.code.position === "left" || settings.code.position === "top" ? <>{codeBlock}{info}</> : <>{info}{codeBlock}</>}
  </div>;
}

export default function EticketSettingsPanel({ settings, onChange, onSave }) {
  const [testState, setTestState] = useState(null);
  const update = (section, key, value) => onChange({ ...settings, [section]: { ...settings[section], [key]: value } });
  const moveField = (field, direction) => {
    const order = [...settings.fieldOrder];
    const index = order.indexOf(field);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    onChange({ ...settings, fieldOrder: order });
  };
  const printTest = async () => {
    setTestState({ type: "pending", message: "Einstellungen werden gespeichert und das Testetikett wird übertragen …" });
    try {
      const saved = await onSave?.();
      if (saved === false) throw new Error("Einstellungen konnten nicht gespeichert werden.");
      const { data } = await axios.post("/api/etickets/print", { ...SAMPLE, productionPath: "2d" });
      setTestState({ type: "success", message: `Druckauftrag für PID ${data.pid} angenommen.` });
    } catch (error) {
      setTestState({ type: "error", message: error.response?.data?.message ?? error.message ?? "Testdruck fehlgeschlagen." });
    }
  };

  return <div className="min-h-0 flex-1 overflow-y-auto p-6">
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
      <div className="space-y-6">
        <SettingCard title="Etikettendruck" description="Der Server sendet ZPL- oder TSPL-Rohdaten direkt an den Netzwerk-Thermodrucker.">
          <Toggle label="Etikettensystem aktiv" checked={settings.enabled} onChange={enabled => onChange({ ...settings, enabled })} />
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Drucker / Hostname oder IP" value={settings.printer.host} placeholder="z. B. 192.168.10.42" onChange={value => update("printer", "host", value)} />
            <NumberField label="TCP-Port" value={settings.printer.port} min={1} max={65535} onChange={value => update("printer", "port", value)} />
            <label className="block text-xs text-gray-400"><span className="mb-1 block">Druckersprache</span><select value={settings.printer.language} onChange={event => update("printer", "language", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"><option value="zpl">ZPL (Zebra-kompatibel)</option><option value="tspl">TSPL (TSC-kompatibel)</option></select></label>
            <label className="block text-xs text-gray-400"><span className="mb-1 block">Auflösung</span><select value={settings.printer.dpi} onChange={event => update("printer", "dpi", Number(event.target.value))} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"><option value={203}>203 dpi</option><option value={300}>300 dpi</option><option value={600}>600 dpi</option></select></label>
          </div>
          <button type="button" disabled={!settings.enabled || !settings.printer.host || testState?.type === "pending"} onClick={printTest} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Testetikett drucken</button>
          {testState && <p className={`text-xs ${testState.type === "success" ? "text-emerald-400" : testState.type === "error" ? "text-red-400" : "text-blue-300"}`}>{testState.message}</p>}
        </SettingCard>

        <SettingCard title="Größe und Code">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField label="Breite" value={settings.label.widthMm} min={20} max={300} step={0.1} suffix="mm" onChange={value => update("label", "widthMm", value)} />
            <NumberField label="Höhe" value={settings.label.heightMm} min={15} max={300} step={0.1} suffix="mm" onChange={value => update("label", "heightMm", value)} />
            <NumberField label="Etikettenabstand" value={settings.label.gapMm} min={0} max={30} step={0.1} suffix="mm" onChange={value => update("label", "gapMm", value)} />
            <NumberField label="Kopien je Auftrag" value={settings.label.copies} min={1} max={20} onChange={value => update("label", "copies", value)} />
            <NumberField label="Codegröße" value={settings.code.sizeMm} min={10} max={80} step={0.5} suffix="mm" onChange={value => update("code", "sizeMm", value)} />
            <label className="block text-xs text-gray-400"><span className="mb-1 block">Codetyp</span><select value={settings.code.type} onChange={event => update("code", "type", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"><option value="qr">QR-Code</option><option value="code128">Barcode Code 128</option></select></label>
            <label className="block text-xs text-gray-400"><span className="mb-1 block">Codeposition</span><select value={settings.code.position} onChange={event => update("code", "position", event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"><option value="left">Links</option><option value="right">Rechts</option><option value="top">Oben</option><option value="bottom">Unten</option></select></label>
          </div>
        </SettingCard>

        <SettingCard title="Vordruck" description="Feste Gestaltungselemente, die auf jedem Etikett erscheinen.">
          <Toggle label="Vordruck verwenden" checked={settings.preprint.enabled} onChange={value => update("preprint", "enabled", value)} />
          <Toggle label="Rahmen drucken" checked={settings.preprint.showBorder} onChange={value => update("preprint", "showBorder", value)} />
          <div className="grid gap-3 md:grid-cols-2"><TextField label="Überschrift" value={settings.preprint.title} onChange={value => update("preprint", "title", value)} /><TextField label="Fußzeile" value={settings.preprint.footer} onChange={value => update("preprint", "footer", value)} /></div>
        </SettingCard>

        <SettingCard title="Informationen und Anordnung" description="Einträge ein- oder ausblenden und über die Pfeile in die gewünschte Reihenfolge bringen.">
          <div className="space-y-2">{settings.fieldOrder.map((field, index) => <div key={field} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/70 p-2"><input type="checkbox" checked={Boolean(settings.information[field])} onChange={event => update("information", field, event.target.checked)} className="size-4 accent-blue-500" /><span className="flex-1 text-sm text-gray-200">{FIELD_LABELS[field]}</span><button type="button" aria-label={`${FIELD_LABELS[field]} nach oben`} disabled={index === 0} onClick={() => moveField(field, -1)} className="rounded border border-gray-700 px-2 py-1 text-gray-400 disabled:opacity-30">↑</button><button type="button" aria-label={`${FIELD_LABELS[field]} nach unten`} disabled={index === settings.fieldOrder.length - 1} onClick={() => moveField(field, 1)} className="rounded border border-gray-700 px-2 py-1 text-gray-400 disabled:opacity-30">↓</button></div>)}</div>
        </SettingCard>
      </div>

      <aside className="xl:sticky xl:top-0 xl:self-start"><SettingCard title="Etikettenvorschau" description="Die Vorschau zeigt Größe, Anordnung, Vordruck und ausgewählte Informationen."><LabelPreview settings={settings} /><div className="rounded-lg border border-gray-700 bg-gray-950 p-3 font-mono text-[10px] leading-relaxed text-gray-500 break-all">{createPartCodePayload(SAMPLE)}</div></SettingCard></aside>
    </div>
  </div>;
}
