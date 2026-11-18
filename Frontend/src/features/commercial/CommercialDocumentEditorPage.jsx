import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import SideBar from "../../shared/components/sideBar.jsx";
import { createCommercialDocument, loadCommercialDocument, loadDocumentTemplates, saveCommercialDocument } from "./commercialApi.js";
import { A4_HEIGHT_MM, A4_WIDTH_MM, FIELD_KEY_MAP, normalizeDocumentLayout } from "./document-layout/documentLayout.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const germanDate = new Intl.DateTimeFormat("de-DE");
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const emptyItem = index => ({ id: `manual-${Date.now()}-${index}`, description: "Neue Position", details: "", unit: "Stk.", quantity: 1, unitPrice: 0, discountPercent: 0, source: "manual" });

const calculate = (items, vatPercent) => {
  const net = round(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discountPercent) || 0) / 100), 0));
  const vat = round(net * (Number(vatPercent) || 0) / 100);
  return { net, vatPercent: Number(vatPercent) || 0, vat, gross: round(net + vat) };
};

const dateValue = value => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const dateLabel = value => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : germanDate.format(date);
};
const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kunde";
const customerAddress = customer => {
  const address = customer?.addresses?.[0];
  return [customerName(customer), address && `${address.street || ""} ${address.houseNumber || ""}`.trim(), address && `${address.postalCode || ""} ${address.city || ""}`.trim()].filter(Boolean).join("\n");
};

const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const automaticValue = (document, key, totals) => {
  if (has(document.fieldValues, key)) return document.fieldValues[key];
  const values = {
    documentType: document.documentType === "invoice" ? "Rechnung" : "Angebot",
    documentNumber: document.documentNumber || "",
    issuedAt: dateLabel(document.issuedAt),
    dueAt: dateLabel(document.dueAt),
    customerName: customerName(document.customer),
    customerAddress: customerAddress(document.customer),
    customerNumber: document.customer?.customerNumber || "",
    projectTitle: document.project?.title || "",
    commissionTitle: document.commission?.title || "",
    title: document.title || "",
    introText: document.introText || "",
    net: money.format(totals.net),
    vat: money.format(totals.vat),
    gross: money.format(totals.gross),
    notes: document.notes || "",
    pageNumber: "Seite 1"
  };
  return values[key] ?? "";
};

const objectStyle = item => ({
  left: `${item.x / A4_WIDTH_MM * 100}%`,
  top: `${item.y / A4_HEIGHT_MM * 100}%`,
  width: `${item.width / A4_WIDTH_MM * 100}%`,
  height: `${Math.max(item.height, 0.35) / A4_HEIGHT_MM * 100}%`
});

function A4Input({ item, document, totals, onChange }) {
  const isDate = item.key === "issuedAt" || item.key === "dueAt";
  const value = isDate ? dateValue(document[item.key]) : automaticValue(document, item.key, totals);
  const meta = FIELD_KEY_MAP[item.key] || {};
  const computed = ["net", "vat", "gross", "pageNumber"].includes(item.key);
  const common = {
    value,
    type: isDate ? "date" : "text",
    readOnly: computed,
    onChange: event => onChange(item.key, event.target.value),
    "aria-label": meta.label || item.key,
    className: "h-full w-full resize-none overflow-hidden rounded-[2px] border border-dashed border-sky-300/70 bg-sky-50/20 px-[0.45cqw] py-[0.2cqw] leading-tight text-inherit outline-none transition hover:bg-sky-50/50 focus:border-solid focus:border-emerald-500 focus:bg-emerald-50/40 read-only:border-transparent read-only:bg-transparent",
    style: { textAlign: item.align || "left" }
  };
  return meta.multiline || item.multiline ? <textarea {...common}/> : <input {...common}/>;
}

function PositionsField({ item, document, updateItem, addItem, removeItem }) {
  return <div className="h-full overflow-auto rounded-[2px] border border-dashed border-sky-300/70 bg-white/80 text-zinc-900 focus-within:border-solid focus-within:border-emerald-500">
    <table className="w-full table-fixed border-collapse" style={{ fontSize: `${Math.max(6, item.fontSize || 8) * 0.145}cqw` }}><thead style={{ background: item.accent || "#166534", color: "white" }}><tr><th className="w-[7%] px-[0.4cqw] py-[0.35cqw] text-left">Pos.</th><th className="px-[0.4cqw] text-left">Beschreibung</th><th className="w-[12%] px-[0.4cqw] text-right">Menge</th><th className="w-[17%] px-[0.4cqw] text-right">Preis</th><th className="w-[17%] px-[0.4cqw] text-right">Gesamt</th><th className="w-[5%]"/></tr></thead><tbody>{(document.items || []).map((row, index) => {
      const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) * (1 - (Number(row.discountPercent) || 0) / 100);
      return <tr key={row.id || index} className="border-b border-zinc-300 align-top"><td className="px-[0.4cqw] py-[0.35cqw]">{index + 1}</td><td className="p-[0.25cqw]"><input aria-label={`Beschreibung Position ${index + 1}`} value={row.description || ""} onChange={event => updateItem(index, "description", event.target.value)} className="w-full bg-transparent px-[0.2cqw] outline-none"/><textarea aria-label={`Details Position ${index + 1}`} value={row.details || ""} onChange={event => updateItem(index, "details", event.target.value)} rows="2" className="mt-[0.2cqw] w-full resize-none bg-transparent px-[0.2cqw] text-zinc-500 outline-none"/></td><td className="p-[0.25cqw]"><input aria-label={`Menge Position ${index + 1}`} type="number" min="0.01" step="0.01" value={row.quantity} onChange={event => updateItem(index, "quantity", event.target.value)} className="w-full bg-transparent text-right outline-none"/><input aria-label={`Einheit Position ${index + 1}`} value={row.unit || ""} onChange={event => updateItem(index, "unit", event.target.value)} className="mt-[0.2cqw] w-full bg-transparent text-right text-zinc-500 outline-none"/></td><td className="p-[0.25cqw]"><input aria-label={`Einzelpreis Position ${index + 1}`} type="number" min="0" step="0.01" value={row.unitPrice} onChange={event => updateItem(index, "unitPrice", event.target.value)} className="w-full bg-transparent text-right outline-none"/><label className="mt-[0.2cqw] flex items-center justify-end gap-[0.2cqw] text-zinc-500"><input aria-label={`Rabatt Position ${index + 1}`} type="number" min="0" max="99.99" step="0.01" value={row.discountPercent || 0} onChange={event => updateItem(index, "discountPercent", event.target.value)} className="w-2/3 bg-transparent text-right outline-none"/> % Rabatt</label></td><td className="px-[0.4cqw] py-[0.35cqw] text-right">{money.format(lineTotal)}</td><td className="p-[0.2cqw]"><button type="button" aria-label={`Position ${index + 1} entfernen`} onClick={() => removeItem(index)} className="text-rose-600">×</button></td></tr>;
    })}</tbody></table>
    <button type="button" onClick={addItem} className="m-[0.5cqw] rounded border border-zinc-300 px-[0.8cqw] py-[0.25cqw] text-zinc-600 hover:bg-zinc-100">+ Position</button>
  </div>;
}

function A4Document({ layout, document, totals, onFieldChange, updateItem, addItem, removeItem }) {
  return <div className="relative mx-auto w-full max-w-[794px] overflow-hidden bg-white text-zinc-900 shadow-2xl" style={{ aspectRatio: `${A4_WIDTH_MM}/${A4_HEIGHT_MM}`, background: layout.page.background, containerType: "inline-size" }}>
    {layout.objects.filter(item => item.visible !== false).map(item => {
      if (item.type === "rect") return <div key={item.id} className="pointer-events-none absolute" style={{ ...objectStyle(item), background: item.fill || "transparent", border: `${item.strokeWidth || 0}px solid ${item.stroke || "transparent"}` }}/>;
      if (item.type === "line") return <div key={item.id} className="pointer-events-none absolute" style={{ ...objectStyle(item), height: 0, borderTop: `${Math.max(0.5, item.strokeWidth || 0.5)}px solid ${item.stroke || "#18181b"}` }}/>;
      if (item.type === "image") return <div key={item.id} className="pointer-events-none absolute" style={objectStyle(item)}>{item.src && <img src={item.src} alt="" className="h-full w-full" style={{ objectFit: item.fit || "contain" }}/>}</div>;
      const style = { ...objectStyle(item), color: item.color || "#18181b", fontSize: `${(item.fontSize || 9) * 0.168}cqw`, fontWeight: item.fontWeight || 400, textAlign: item.align || "left" };
      if (item.type === "text") return <div key={item.id} className="pointer-events-none absolute whitespace-pre-wrap leading-tight" style={style}>{item.text}</div>;
      if (item.key === "positions") return <div key={item.id} className="absolute" style={style}><PositionsField item={item} document={document} updateItem={updateItem} addItem={addItem} removeItem={removeItem}/></div>;
      return <label key={item.id} className="absolute leading-tight" style={style}><A4Input item={item} document={document} totals={totals} onChange={onFieldChange}/></label>;
    })}
  </div>;
}

function Control({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>;
}

const controlClass = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500";

function hexToRgb(value, fallback = [24, 24, 27]) {
  const match = String(value || "").match(/^#([0-9a-f]{6})$/i);
  return match ? [0, 2, 4].map(offset => Number.parseInt(match[1].slice(offset, offset + 2), 16)) : fallback;
}

function createPdf(document, layout, totals) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const setText = item => {
    pdf.setTextColor(...hexToRgb(item.color));
    pdf.setFontSize(item.fontSize || 9);
    pdf.setFont("helvetica", Number(item.fontWeight) >= 700 ? "bold" : "normal");
  };
  for (const item of layout.objects.filter(entry => entry.visible !== false)) {
    if (item.type === "rect") {
      pdf.setFillColor(...hexToRgb(item.fill, [255, 255, 255]));
      pdf.setDrawColor(...hexToRgb(item.stroke, hexToRgb(item.fill, [255, 255, 255])));
      pdf.setLineWidth(item.strokeWidth || 0);
      pdf.rect(item.x, item.y, item.width, item.height, item.strokeWidth ? "FD" : "F");
      continue;
    }
    if (item.type === "line") {
      pdf.setDrawColor(...hexToRgb(item.stroke));
      pdf.setLineWidth(item.strokeWidth || 0.4);
      pdf.line(item.x, item.y, item.x + item.width, item.y + item.height);
      continue;
    }
    if (item.type === "image" && item.src) {
      try { pdf.addImage(item.src, undefined, item.x, item.y, item.width, item.height); } catch { /* Ungültige Bilddaten überspringen. */ }
      continue;
    }
    if (item.type === "field" && item.key === "positions") {
      const accent = hexToRgb(item.accent || "#166534");
      autoTable(pdf, {
        startY: item.y,
        margin: { left: item.x, right: A4_WIDTH_MM - item.x - item.width },
        tableWidth: item.width,
        head: [["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Gesamt"]],
        body: (document.items || []).map((row, index) => [index + 1, `${row.description || ""}${row.details ? `\n${row.details}` : ""}`, `${row.quantity} ${row.unit || ""}`, money.format(Number(row.unitPrice) || 0), money.format((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0) * (1 - (Number(row.discountPercent) || 0) / 100))]),
        theme: "grid",
        headStyles: { fillColor: accent },
        styles: { fontSize: item.fontSize || 8 },
        columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 23, halign: "right" }, 3: { cellWidth: 29, halign: "right" }, 4: { cellWidth: 29, halign: "right" } }
      });
      continue;
    }
    setText(item);
    const value = item.type === "text" ? item.text || "" : String(automaticValue(document, item.key, totals) || "");
    const lines = pdf.splitTextToSize(value, item.width);
    pdf.text(lines, item.align === "right" ? item.x + item.width : item.align === "center" ? item.x + item.width / 2 : item.x, item.y + (item.fontSize || 9) * 0.35, { align: item.align || "left", maxWidth: item.width });
  }
  pdf.save(`${document.documentNumber || "Beleg"}.pdf`);
}

export default function CommercialDocumentEditorPage() {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const creating = useRef(false);
  const [document, setDocument] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [vatPercent, setVatPercent] = useState(19);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const availableTemplates = await loadDocumentTemplates();
        if (!active) return;
        setTemplates(availableTemplates);
        if (documentId) {
          const existing = await loadCommercialDocument(documentId);
          if (!active) return;
          setDocument(existing);
          setVatPercent(existing.totals?.vatPercent ?? 19);
          return;
        }
        if (creating.current) return;
        creating.current = true;
        const type = searchParams.get("type") === "invoice" ? "invoice" : "quote";
        const selectedTemplate = availableTemplates.find(template => [type, "universal"].includes(template.documentType));
        const created = await createCommercialDocument({
          customerId: searchParams.get("customerId"),
          projectId: searchParams.get("projectId") || null,
          commissionId: searchParams.get("commissionId") || null,
          documentType: type,
          title: type === "invoice" ? "Rechnung" : "Angebot",
          templateId: selectedTemplate?.id || null,
          layout: selectedTemplate?.analysis?.layout || {},
          items: undefined,
          vatPercent: 19,
          issuedAt: new Date().toISOString()
        });
        if (active) navigate(`/Belege/${created.id}`, { replace: true });
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Beleg konnte nicht angelegt werden.");
      }
    };
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [documentId, navigate, searchParams]);

  const totals = calculate(document?.items || [], vatPercent);
  const layout = normalizeDocumentLayout(document?.layout);
  const update = (key, value) => setDocument(current => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => update("items", document.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const updateField = (key, value) => {
    const direct = { documentNumber: "documentNumber", title: "title", introText: "introText", notes: "notes" };
    if (direct[key]) return update(direct[key], value);
    if (key === "issuedAt" || key === "dueAt") return update(key, value);
    setDocument(current => ({ ...current, fieldValues: { ...(current.fieldValues || {}), [key]: value } }));
  };

  const selectTemplate = templateId => {
    const template = templates.find(item => item.id === templateId);
    setDocument(current => ({ ...current, templateId: templateId || null, layout: template ? normalizeDocumentLayout(template.analysis?.layout) : normalizeDocumentLayout(null) }));
  };

  const save = async () => {
    if (!document) return false;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const saved = await saveCommercialDocument(document.id, { ...document, layout, vatPercent, totals });
      setDocument(saved);
      setVatPercent(saved.totals?.vatPercent ?? vatPercent);
      setMessage("Beleg und ausgefüllte Layoutfelder wurden gespeichert.");
      return true;
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Beleg konnte nicht gespeichert werden.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!document || !await save()) return;
    createPdf({ ...document, totals }, layout, totals);
  };

  if (loading) return <div className="h-dvh bg-gray-900 p-10 text-slate-400">Belegeditor wird geladen …</div>;

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
      <SideBar selected={5}/>
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><Link to={document?.customerId ? `/Kontakte/${document.customerId}` : "/Kontakte"} className="text-sm text-sky-400 hover:text-sky-300">← Zur Kundenübersicht</Link><div className="mt-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Visueller Belegeditor</div><h1 className="mt-1 text-2xl font-bold">{document?.documentType === "invoice" ? "Rechnung" : "Angebot"} {document?.documentNumber}</h1><p className="mt-1 text-sm text-slate-400">{document?.project?.title || document?.commission?.title || customerName(document?.customer)}</p></div>{document && <div className="flex gap-2"><button onClick={save} disabled={saving} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{saving ? "Speichert …" : "Entwurf speichern"}</button><button onClick={downloadPdf} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">PDF erstellen</button></div>}</header>
        {message && <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</div>}{error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
        {document && <>
          <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/80 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Vorlage, Status & allgemeine Daten</h2><p className="mt-1 text-sm text-slate-400">Die Felder auf dem A4-Beleg darunter können direkt wie in einem PDF ausgefüllt werden.</p></div><span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-300">A4 · {layout.objects.length} Elemente</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Control label="Vorlage"><select value={document.templateId || ""} onChange={event => selectTemplate(event.target.value)} className={controlClass}><option value="">Standardlayout</option>{templates.filter(template => template.documentType === "universal" || template.documentType === document.documentType).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Control>
            <Control label="Status"><select value={document.status} onChange={event => update("status", event.target.value)} className={controlClass}><option value="draft">Entwurf</option><option value="sent">Versendet</option><option value="accepted">Angenommen</option><option value="paid">Bezahlt</option><option value="cancelled">Storniert</option></select></Control>
            <Control label="Belegnummer"><input value={document.documentNumber || ""} onChange={event => update("documentNumber", event.target.value)} className={controlClass}/></Control>
            <Control label="Ausstellungsdatum"><input type="date" value={dateValue(document.issuedAt)} onChange={event => update("issuedAt", event.target.value)} className={controlClass}/></Control>
            <Control label="Fällig am"><input type="date" value={dateValue(document.dueAt)} onChange={event => update("dueAt", event.target.value)} className={controlClass}/></Control>
            <Control label="MwSt. %"><input type="number" min="0" step="0.01" value={vatPercent} onChange={event => setVatPercent(event.target.value)} className={`${controlClass} text-right`}/></Control>
            <div className="sm:col-span-2 xl:col-span-4"><Control label="Betreff / Titel"><input value={document.title || ""} onChange={event => update("title", event.target.value)} className={controlClass}/></Control></div>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2 xl:col-span-2"><div className="rounded-lg bg-slate-950 p-3 text-sm"><span className="block text-xs text-slate-500">Netto</span>{money.format(totals.net)}</div><div className="rounded-lg bg-slate-950 p-3 text-sm"><span className="block text-xs text-slate-500">MwSt.</span>{money.format(totals.vat)}</div><div className="rounded-lg bg-emerald-950/50 p-3 text-sm font-bold text-emerald-200"><span className="block text-xs font-normal text-emerald-500">Gesamt</span>{money.format(totals.gross)}</div></div>
          </div></section>
          <section className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-3 sm:p-6 lg:p-10"><div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400"><span>Belegvorschau · direkt in den markierten Feldern schreiben</span><span>Weiße A4-Seite · 210 × 297 mm</span></div><A4Document layout={layout} document={document} totals={totals} onFieldChange={updateField} updateItem={updateItem} addItem={() => update("items", [...document.items, emptyItem(document.items.length)])} removeItem={index => update("items", document.items.filter((_item, itemIndex) => itemIndex !== index))}/></section>
        </>}
      </div></main>
    </div>
  );
}
