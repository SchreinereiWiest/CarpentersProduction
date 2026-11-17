import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import SideBar from "../../shared/components/sideBar.jsx";
import { createCommercialDocument, loadCommercialDocument, loadDocumentTemplates, saveCommercialDocument } from "./commercialApi.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const emptyItem = index => ({ id: `manual-${Date.now()}-${index}`, description: "Neue Position", details: "", unit: "Stk.", quantity: 1, unitPrice: 0, discountPercent: 0, source: "manual" });

const calculate = (items, vatPercent) => {
  const net = round(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discountPercent) || 0) / 100), 0));
  const vat = round(net * (Number(vatPercent) || 0) / 100);
  return { net, vatPercent: Number(vatPercent) || 0, vat, gross: round(net + vat) };
};

const dateValue = value => value ? new Date(value).toISOString().slice(0, 10) : "";
const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kunde";

function Input({ label, ...props }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span><input {...props} className={`w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500 ${props.className || ""}`}/></label>;
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
        const created = await createCommercialDocument({
          customerId: searchParams.get("customerId"),
          projectId: searchParams.get("projectId") || null,
          commissionId: searchParams.get("commissionId") || null,
          documentType: searchParams.get("type") === "invoice" ? "invoice" : "quote",
          title: searchParams.get("type") === "invoice" ? "Rechnung" : "Angebot",
          templateId: availableTemplates.find(template => [searchParams.get("type"), "universal"].includes(template.documentType))?.id || null,
          items: undefined,
          vatPercent: 19,
          issuedAt: new Date().toISOString()
        });
        if (!active) return;
        navigate(`/Belege/${created.id}`, { replace: true });
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Beleg konnte nicht angelegt werden.");
      }
    };
    load().finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [documentId, navigate, searchParams]);

  const totals = useMemo(() => calculate(document?.items || [], vatPercent), [document?.items, vatPercent]);
  const update = (key, value) => setDocument(current => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => update("items", document.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));

  const save = async () => {
    if (!document) return false;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const saved = await saveCommercialDocument(document.id, { ...document, vatPercent, totals });
      setDocument(saved);
      setVatPercent(saved.totals?.vatPercent ?? vatPercent);
      setMessage("Beleg wurde gespeichert.");
      return true;
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Beleg konnte nicht gespeichert werden.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!document) return;
    if (!await save()) return;
    const template = templates.find(item => item.id === document.templateId);
    const accent = template?.analysis?.colors?.[0]?.match(/^#([0-9a-f]{6})$/i)?.[1];
    const rgb = accent ? [Number.parseInt(accent.slice(0, 2), 16), Number.parseInt(accent.slice(2, 4), 16), Number.parseInt(accent.slice(4, 6), 16)] : [22, 101, 52];
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFillColor(...rgb);
    pdf.rect(0, 0, 210, 18, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text(template?.name ? `Layout: ${template.name}` : "CarpentersProduction", 14, 11);
    pdf.setTextColor(24, 24, 27);
    pdf.setFontSize(22);
    pdf.text(document.documentType === "invoice" ? "Rechnung" : "Angebot", 14, 34);
    pdf.setFontSize(10);
    pdf.text(`${document.documentNumber || "Entwurf"} · ${dateValue(document.issuedAt)}`, 14, 42);
    pdf.setFontSize(11);
    pdf.text(customerName(document.customer), 14, 56);
    const address = document.customer?.addresses?.[0];
    if (address) pdf.text([`${address.street || ""} ${address.houseNumber || ""}`.trim(), `${address.postalCode || ""} ${address.city || ""}`.trim()].filter(Boolean), 14, 63);
    pdf.setFontSize(13);
    pdf.text(document.title || "", 14, 82);
    pdf.setFontSize(10);
    const intro = pdf.splitTextToSize(document.introText || "Vielen Dank für Ihre Anfrage. Wir bieten Ihnen folgende Leistungen an:", 182);
    pdf.text(intro, 14, 90);
    autoTable(pdf, {
      startY: 98 + intro.length * 4,
      head: [["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Gesamt"]],
      body: document.items.map((item, index) => [index + 1, `${item.description}${item.details ? `\n${item.details}` : ""}`, `${item.quantity} ${item.unit}`, money.format(item.unitPrice), money.format((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discountPercent) || 0) / 100))]),
      theme: "grid",
      headStyles: { fillColor: rgb },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 13 }, 2: { cellWidth: 24, halign: "right" }, 3: { cellWidth: 30, halign: "right" }, 4: { cellWidth: 30, halign: "right" } }
    });
    const finalY = pdf.lastAutoTable.finalY + 8;
    pdf.text(`Netto: ${money.format(totals.net)}`, 196, finalY, { align: "right" });
    pdf.text(`MwSt. (${vatPercent} %): ${money.format(totals.vat)}`, 196, finalY + 6, { align: "right" });
    pdf.setFontSize(12);
    pdf.text(`Gesamt: ${money.format(totals.gross)}`, 196, finalY + 14, { align: "right" });
    if (document.notes) { pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(document.notes, 182), 14, finalY + 28); }
    pdf.save(`${document.documentNumber || "Beleg"}.pdf`);
  };

  if (loading) return <div className="h-dvh bg-gray-900 p-10 text-slate-400">Belegeditor wird geladen …</div>;

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
      <SideBar selected={5}/>
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><Link to={document?.customerId ? `/Kontakte/${document.customerId}` : "/Kontakte"} className="text-sm text-sky-400 hover:text-sky-300">← Zur Kundenübersicht</Link><div className="mt-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Belegerstellung</div><h1 className="mt-1 text-2xl font-bold">{document?.documentType === "invoice" ? "Rechnung" : "Angebot"} {document?.documentNumber}</h1><p className="mt-1 text-sm text-slate-400">{document?.project?.title || document?.commission?.title || customerName(document?.customer)}</p></div>{document && <div className="flex gap-2"><button onClick={save} disabled={saving} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{saving ? "Speichert …" : "Entwurf speichern"}</button><button onClick={downloadPdf} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">PDF erstellen</button></div>}</header>
        {message && <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</div>}{error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
        {document && <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-5"><h2 className="font-semibold">Kopf & Zuordnung</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Input label="Titel" value={document.title || ""} onChange={event => update("title", event.target.value)}/><Input label="Belegnummer" value={document.documentNumber || ""} onChange={event => update("documentNumber", event.target.value)}/><Input label="Ausstellungsdatum" type="date" value={dateValue(document.issuedAt)} onChange={event => update("issuedAt", event.target.value)}/><Input label="Fällig am" type="date" value={dateValue(document.dueAt)} onChange={event => update("dueAt", event.target.value)}/><label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Einleitung</span><textarea rows="3" value={document.introText || ""} onChange={event => update("introText", event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500"/></label></div></section>
            <section className="rounded-xl border border-slate-700 bg-slate-800/80 p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Positionen</h2><p className="mt-1 text-sm text-slate-400">Projektpreise wurden als editierbare Ausgangspositionen übernommen.</p></div><button type="button" onClick={() => update("items", [...document.items, emptyItem(document.items.length)])} className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">+ Position</button></div><div className="mt-4 space-y-3">{document.items.map((item, index) => <article key={item.id || index} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_120px_90px_auto]"><Input label={`Pos. ${index + 1}`} value={item.description} onChange={event => updateItem(index, "description", event.target.value)}/><Input label="Menge" type="number" min="0.01" step="0.01" value={item.quantity} onChange={event => updateItem(index, "quantity", event.target.value)}/><Input label="Einzelpreis" type="number" min="0" step="0.01" value={item.unitPrice} onChange={event => updateItem(index, "unitPrice", event.target.value)}/><Input label="Rabatt %" type="number" min="0" max="99.99" step="0.01" value={item.discountPercent || 0} onChange={event => updateItem(index, "discountPercent", event.target.value)}/><button type="button" aria-label={`Position ${index + 1} entfernen`} onClick={() => update("items", document.items.filter((_row, rowIndex) => rowIndex !== index))} className="self-end rounded-lg border border-rose-900 px-3 py-2.5 text-rose-300 hover:bg-rose-950">✕</button></div><textarea aria-label={`Details Position ${index + 1}`} rows="2" value={item.details || ""} onChange={event => updateItem(index, "details", event.target.value)} placeholder="Leistungsbeschreibung" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"/></article>)}</div></section>
          </div>
          <aside className="space-y-6"><section className="rounded-xl border border-slate-700 bg-slate-800/80 p-5"><h2 className="font-semibold">Vorlage & Status</h2><label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Erkannte PDF-Vorlage</span><select value={document.templateId || ""} onChange={event => update("templateId", event.target.value || null)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="">Standardlayout</option>{templates.filter(template => template.documentType === "universal" || template.documentType === document.documentType).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span><select value={document.status} onChange={event => update("status", event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="draft">Entwurf</option><option value="sent">Versendet</option><option value="accepted">Angenommen</option><option value="paid">Bezahlt</option><option value="cancelled">Storniert</option></select></label>{templates.find(template => template.id === document.templateId) && <div className="mt-4 rounded-lg bg-slate-950 p-3 text-xs text-slate-400">{templates.find(template => template.id === document.templateId).analysis?.pageCount} Seite(n), {templates.find(template => template.id === document.templateId).analysis?.fields?.length || 0} Felder und {templates.find(template => template.id === document.templateId).analysis?.imageCount || 0} Bildelemente erkannt.</div>}</section><section className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5"><h2 className="font-semibold text-emerald-100">Summen</h2><label className="mt-4 block"><span className="mb-1.5 block text-xs text-slate-400">Mehrwertsteuer</span><input type="number" min="0" step="0.01" value={vatPercent} onChange={event => setVatPercent(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-right"/></label><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Netto</dt><dd>{money.format(totals.net)}</dd></div><div className="flex justify-between"><dt>MwSt.</dt><dd>{money.format(totals.vat)}</dd></div><div className="flex justify-between border-t border-slate-700 pt-3 text-lg font-bold"><dt>Brutto</dt><dd>{money.format(totals.gross)}</dd></div></dl></section><section className="rounded-xl border border-slate-700 bg-slate-800/80 p-5"><label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Hinweise / Zahlungskonditionen</span><textarea rows="6" value={document.notes || ""} onChange={event => update("notes", event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"/></label></section></aside>
        </div>}
      </div></main>
    </div>
  );
}
