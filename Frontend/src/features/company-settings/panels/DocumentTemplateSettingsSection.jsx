import { useEffect, useState } from "react";
import axios from "axios";

import { loadPdfJs } from "../../../shared/pdf/loadPdfJs.js";

const FIELD_PATTERNS = [
  ["documentNumber", "Belegnummer", /(?:angebots|rechnungs|beleg|auftrags)[-\s]?(?:nr\.?|nummer)/i],
  ["issuedAt", "Belegdatum", /(?:angebots|rechnungs|beleg)?datum/i],
  ["customerNumber", "Kundennummer", /kunden[-\s]?(?:nr\.?|nummer)/i],
  ["recipient", "Empfängeranschrift", /(?:rechnungsempfänger|lieferanschrift|anschrift)/i],
  ["items", "Positionstabelle", /(?:pos\.?|position|beschreibung|menge|einzelpreis)/i],
  ["net", "Nettosumme", /(?:netto|zwischensumme)/i],
  ["vat", "Mehrwertsteuer", /(?:mwst\.?|mehrwertsteuer|umsatzsteuer)/i],
  ["gross", "Gesamtsumme", /(?:gesamt|brutto|endbetrag)/i],
  ["dueAt", "Zahlungsziel", /(?:zahlungsziel|fällig|zahlbar bis)/i]
];

const rgbToHex = ([red, green, blue]) => `#${[red, green, blue].map(value => value.toString(16).padStart(2, "0")).join("")}`;

async function extractColors(page) {
  try {
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = globalThis.document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    await page.render({ canvasContext: context, viewport }).promise;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const counts = new Map();
    for (let index = 0; index < pixels.length; index += 80) {
      const color = [pixels[index], pixels[index + 1], pixels[index + 2]].map(value => Math.round(value / 32) * 32).map(value => Math.min(255, value));
      const spread = Math.max(...color) - Math.min(...color);
      if (spread < 25 || color.every(value => value > 225) || color.every(value => value < 30)) continue;
      const hex = rgbToHex(color);
      counts.set(hex, (counts.get(hex) || 0) + 1);
    }
    return [...counts].sort((left, right) => right[1] - left[1]).slice(0, 5).map(([hex]) => hex);
  } catch {
    return [];
  }
}

async function analyzeDocumentTemplate(file) {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const textBlocks = [];
  const fields = [];
  let imageCount = 0;
  let pageSize = null;
  let colors = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    if (!pageSize) pageSize = { width: Math.round(viewport.width * 100) / 100, height: Math.round(viewport.height * 100) / 100 };
    const [content, operators] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
    for (const item of content.items || []) {
      const text = String(item.str || "").trim();
      if (!text) continue;
      const block = { text, page: pageNumber, x: item.transform?.[4] || 0, y: viewport.height - (item.transform?.[5] || 0), width: item.width || 0, height: item.height || Math.abs(item.transform?.[3] || 0) };
      if (textBlocks.length < 500) textBlocks.push(block);
      for (const [key, label, pattern] of FIELD_PATTERNS) {
        if (!fields.some(field => field.key === key) && pattern.test(text)) fields.push({ key, label, page: pageNumber, anchorText: text });
      }
    }
    imageCount += (operators.fnArray || []).filter(operator => [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintJpegXObject, pdfjs.OPS.paintImageMaskXObject].includes(operator)).length;
    if (pageNumber === 1) colors = await extractColors(page);
  }
  return { version: 1, pageCount: pdf.numPages, pageSize, textBlocks, fields, imageCount, colors };
}

export default function DocumentTemplateSettingsSection() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("universal");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = () => axios.get("/api/commercial/templates").then(response => setTemplates(response.data.templates || []));
  useEffect(() => { load().catch(() => setMessage({ type: "error", text: "Belegvorlagen konnten nicht geladen werden." })); }, []);

  const chooseFile = async event => {
    const selected = event.target.files?.[0];
    setFile(selected || null);
    setAnalysis(null);
    setMessage(null);
    if (!selected) return;
    if (!name) setName(selected.name.replace(/\.pdf$/i, ""));
    setBusy(true);
    try {
      setAnalysis(await analyzeDocumentTemplate(selected));
    } catch (error) {
      console.error("PDF-Vorlage konnte nicht analysiert werden", error);
      setMessage({ type: "error", text: "Die PDF-Datei konnte nicht analysiert werden." });
    } finally {
      setBusy(false);
    }
  };

  const upload = async event => {
    event.preventDefault();
    if (!file || !analysis) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("template", file);
      form.append("name", name);
      form.append("documentType", documentType);
      form.append("analysis", JSON.stringify(analysis));
      await axios.post("/api/commercial/templates", form);
      await load();
      setFile(null);
      setAnalysis(null);
      setName("");
      setMessage({ type: "success", text: "Vorlage wurde analysiert und für den Belegeditor gespeichert." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Vorlage konnte nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  const openTemplate = async id => {
    const response = await axios.get(`/api/commercial/templates/${id}/download`);
    window.open(response.data.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-xl border border-emerald-900/60 bg-gray-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Belege</div><h2 className="mt-1 font-semibold">PDF-Vorlagen erkennen</h2><p className="mt-1 max-w-3xl text-sm text-gray-500">Einen aktuellen Firmenbeleg hochladen. Textpositionen, Farben, Bildelemente und typische Eingabefelder werden lokal im Browser erkannt und als editierbares Layout für Angebote und Rechnungen bereitgestellt.</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{templates.length} Vorlagen</span></div>
      {templates.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{templates.map(template => <button type="button" key={template.id} onClick={() => openTemplate(template.id)} className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-left hover:border-emerald-700"><span className="block font-medium text-emerald-200">{template.name}</span><span className="mt-1 block text-xs text-gray-500">{template.documentType === "universal" ? "Angebot & Rechnung" : template.documentType === "invoice" ? "Rechnung" : "Angebot"} · {template.analysis?.fields?.length || 0} Felder · {template.analysis?.imageCount || 0} Bildelemente</span></button>)}</div>}
      <form onSubmit={upload} className="mt-5 rounded-xl border border-dashed border-gray-600 bg-gray-950/40 p-4">
        <div className="grid gap-4 md:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-gray-300">Vorlagenname</span><input required value={name} onChange={event => setName(event.target.value)} placeholder="z. B. Angebot Firmenlayout 2026" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-emerald-500"/></label><label><span className="mb-1.5 block text-sm font-medium text-gray-300">Verwendung</span><select value={documentType} onChange={event => setDocumentType(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5"><option value="universal">Angebot & Rechnung</option><option value="quote">Nur Angebot</option><option value="invoice">Nur Rechnung</option></select></label></div>
        <label className="mt-4 block cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-4 text-center hover:border-emerald-700"><span className="text-sm font-medium text-gray-200">{file ? file.name : "Firmenbeleg als PDF auswählen"}</span><span className="mt-1 block text-xs text-gray-500">Maximal 25 MB · Analyse erfolgt vor dem Upload</span><input type="file" accept="application/pdf" onChange={chooseFile} className="sr-only"/></label>
        {analysis && <div className="mt-4 grid gap-3 rounded-lg bg-gray-900 p-4 text-sm sm:grid-cols-4"><div><span className="block text-xs text-gray-500">Seiten</span><span className="font-semibold">{analysis.pageCount}</span></div><div><span className="block text-xs text-gray-500">Textblöcke</span><span className="font-semibold">{analysis.textBlocks.length}</span></div><div><span className="block text-xs text-gray-500">Felder</span><span className="font-semibold">{analysis.fields.length}</span></div><div><span className="block text-xs text-gray-500">Bildelemente</span><span className="font-semibold">{analysis.imageCount}</span></div><div className="sm:col-span-4"><span className="block text-xs text-gray-500">Erkannte Felder</span><span className="mt-1 block text-gray-300">{analysis.fields.map(field => field.label).join(" · ") || "Noch keine typischen Felder erkannt; Text und Layout werden dennoch übernommen."}</span></div></div>}
        {message && <div role="status" className={`mt-4 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-950/30 text-emerald-200" : "border-rose-800 bg-rose-950/30 text-rose-200"}`}>{message.text}</div>}
        <div className="mt-4 flex justify-end"><button disabled={busy || !analysis || !name.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Analysiert …" : "Vorlage übernehmen"}</button></div>
      </form>
    </section>
  );
}
