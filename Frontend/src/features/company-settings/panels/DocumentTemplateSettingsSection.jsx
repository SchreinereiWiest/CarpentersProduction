import { useEffect, useState } from "react";
import axios from "axios";

import { loadPdfJs } from "../../../shared/pdf/loadPdfJs.js";
import { createDefaultDocumentLayout, layoutFromTemplateAnalysis, normalizeDocumentLayout } from "../../commercial/document-layout/documentLayout.js";
import DocumentLayoutEditor from "./DocumentLayoutEditor.jsx";

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

const typeLabel = value => value === "universal" ? "Angebot & Rechnung" : value === "invoice" ? "Rechnung" : "Angebot";
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
      const color = [pixels[index], pixels[index + 1], pixels[index + 2]].map(value => Math.min(255, Math.round(value / 32) * 32));
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
  const result = { version: 1, pageCount: pdf.numPages, pageSize, textBlocks, fields, imageCount, colors };
  return { ...result, layout: layoutFromTemplateAnalysis(result) };
}

const emptyAnalysis = layout => ({ version: 1, pageCount: 1, pageSize: { width: 595.28, height: 841.89 }, textBlocks: [], fields: [], imageCount: 0, colors: [], layout });

export default function DocumentTemplateSettingsSection() {
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState("recognition");
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("universal");
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [editorId, setEditorId] = useState(null);
  const [layout, setLayout] = useState(createDefaultDocumentLayout());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const response = await axios.get("/api/commercial/templates");
    setTemplates(response.data.templates || []);
    return response.data.templates || [];
  };
  useEffect(() => {
    let active = true;
    axios.get("/api/commercial/templates").then(response => {
      if (active) setTemplates(response.data.templates || []);
    }).catch(() => {
      if (active) setMessage({ type: "error", text: "Belegvorlagen konnten nicht geladen werden." });
    });
    return () => { active = false; };
  }, []);

  const editTemplate = template => {
    setEditorId(template.id);
    setName(template.name);
    setDocumentType(template.documentType);
    setLayout(normalizeDocumentLayout(template.analysis?.layout));
    setTab("layout");
    setMessage(null);
  };

  const newManual = () => {
    setEditorId(null);
    setName("Neue Belegvorlage");
    setDocumentType("universal");
    setLayout(createDefaultDocumentLayout());
    setTab("layout");
    setMessage(null);
  };

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
      const response = await axios.post("/api/commercial/templates", form);
      await load();
      setFile(null);
      setAnalysis(null);
      editTemplate(response.data.template);
      setMessage({ type: "success", text: "Vorlage wurde erkannt. Das abgeleitete A4-Layout kann jetzt geprüft und angepasst werden." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Vorlage konnte nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  const saveLayout = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = editorId
        ? await axios.put(`/api/commercial/templates/${editorId}/layout`, { name, documentType, layout })
        : await axios.post("/api/commercial/templates/manual", { name, documentType, analysis: emptyAnalysis(layout) });
      setEditorId(response.data.template.id);
      await load();
      setMessage({ type: "success", text: "A4-Layout wurde gespeichert und steht im Belegeditor zur Auswahl." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Layout konnte nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  const openTemplate = async template => {
    if (!template.file) return editTemplate(template);
    const response = await axios.get(`/api/commercial/templates/${template.id}/download`);
    window.open(response.data.downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-xl border border-emerald-900/60 bg-gray-800 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Belege</div><h2 className="mt-1 font-semibold">Vorlagenerkennung & Layout-Editor</h2><p className="mt-1 max-w-3xl text-sm text-gray-500">Firmenbeleg erkennen lassen oder ein A4-Layout frei aus Text, Datenfeldern, Linien, Farben und Logo aufbauen.</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{templates.length} Vorlagen</span></div>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setTab("recognition")} className={`rounded-lg px-4 py-2 text-sm ${tab === "recognition" ? "bg-emerald-600 font-semibold" : "bg-gray-900 text-gray-400"}`}>PDF erkennen</button><button type="button" onClick={() => setTab("layout")} className={`rounded-lg px-4 py-2 text-sm ${tab === "layout" ? "bg-emerald-600 font-semibold" : "bg-gray-900 text-gray-400"}`}>Layout-Editor</button><button type="button" onClick={newManual} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700">+ Leeres Layout</button></div>
      {templates.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{templates.map(template => <article key={template.id} className={`rounded-lg border bg-gray-900 p-3 ${editorId === template.id ? "border-sky-600" : "border-gray-700"}`}><button type="button" onClick={() => editTemplate(template)} className="block w-full text-left"><span className="block font-medium text-emerald-200">{template.name}</span><span className="mt-1 block text-xs text-gray-500">{typeLabel(template.documentType)} · {template.analysis?.layout?.objects?.length || 0} Layoutelemente</span></button><div className="mt-3 flex gap-2"><button type="button" onClick={() => editTemplate(template)} className="rounded border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800">Bearbeiten</button>{template.file && <button type="button" onClick={() => openTemplate(template)} className="rounded border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800">Original-PDF</button>}</div></article>)}</div>}
      {message && <div role="status" className={`mt-4 rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-950/30 text-emerald-200" : "border-rose-800 bg-rose-950/30 text-rose-200"}`}>{message.text}</div>}

      {tab === "recognition" && <form onSubmit={upload} className="mt-5 rounded-xl border border-dashed border-gray-600 bg-gray-950/40 p-4">
        <div className="grid gap-4 md:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium text-gray-300">Vorlagenname</span><input required value={name} onChange={event => setName(event.target.value)} placeholder="z. B. Angebot Firmenlayout 2026" className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 outline-none focus:border-emerald-500"/></label><label><span className="mb-1.5 block text-sm font-medium text-gray-300">Verwendung</span><select value={documentType} onChange={event => setDocumentType(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5"><option value="universal">Angebot & Rechnung</option><option value="quote">Nur Angebot</option><option value="invoice">Nur Rechnung</option></select></label></div>
        <label className="mt-4 block cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-4 text-center hover:border-emerald-700"><span className="text-sm font-medium text-gray-200">{file ? file.name : "Firmenbeleg als PDF auswählen"}</span><span className="mt-1 block text-xs text-gray-500">Maximal 25 MB · Textanker und Positionen werden vor dem Upload erkannt</span><input type="file" accept="application/pdf" onChange={chooseFile} className="sr-only"/></label>
        {analysis && <div className="mt-4 grid gap-3 rounded-lg bg-gray-900 p-4 text-sm sm:grid-cols-4"><div><span className="block text-xs text-gray-500">Seiten</span><span className="font-semibold">{analysis.pageCount}</span></div><div><span className="block text-xs text-gray-500">Textblöcke</span><span className="font-semibold">{analysis.textBlocks.length}</span></div><div><span className="block text-xs text-gray-500">Datenfelder</span><span className="font-semibold">{analysis.fields.length}</span></div><div><span className="block text-xs text-gray-500">Layoutelemente</span><span className="font-semibold">{analysis.layout.objects.length}</span></div><div className="sm:col-span-4 text-gray-300">{analysis.fields.map(field => field.label).join(" · ") || "Keine typischen Anker erkannt; ein vollständiges Standardlayout wurde erzeugt."}</div></div>}
        <div className="mt-4 flex justify-end"><button disabled={busy || !analysis || !name.trim()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Bitte warten …" : "Erkennen & im Editor öffnen"}</button></div>
      </form>}

      {tab === "layout" && <div className="mt-5">
        <div className="mb-4 grid gap-3 rounded-xl border border-gray-700 bg-gray-950/40 p-4 md:grid-cols-[1fr_260px_auto]"><label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Vorlagenname</span><input value={name} onChange={event => setName(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2"/></label><label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Verwendung</span><select value={documentType} onChange={event => setDocumentType(event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2"><option value="universal">Angebot & Rechnung</option><option value="quote">Nur Angebot</option><option value="invoice">Nur Rechnung</option></select></label><button type="button" onClick={saveLayout} disabled={busy || !name.trim()} className="self-end rounded-lg bg-emerald-600 px-5 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-40">{busy ? "Speichert …" : "Layout speichern"}</button></div>
        <DocumentLayoutEditor value={layout} onChange={setLayout}/>
      </div>}
    </section>
  );
}
