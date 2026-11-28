import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { useAuth } from "../../app/providers/AuthContext.js";
import SideBar from "../../shared/components/sideBar.jsx";
import { loadCompanySettings } from "../../shared/settings/company-settings.js";
import { assignCommercialDocument, createCommercialDocument, loadCommercialDocument, loadCommercialDocumentAssignees, saveCommercialDocument } from "./commercialApi.js";
import { documentFieldLabel, fontFamilyValue, layoutObjectPosition, normalizeDocumentLayout } from "./document-layout/documentLayout.js";
import { COMMERCIAL_DOCUMENT_TYPES, commercialDocumentLabel } from "./documentTypes.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const germanDate = new Intl.DateTimeFormat("de-DE");
const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const makeItemId = () => globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emptyItem = () => ({ id: makeItemId(), description: "Neue Position", details: "", unit: "Stk.", quantity: 1, unitPrice: 0, discountPercent: 0, source: "manual" });

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
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : germanDate.format(date);
};

const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kunde";
const customerAddress = customer => {
  const address = customer?.addresses?.[0];
  return [customerName(customer), address && `${address.street || ""} ${address.houseNumber || ""}`.trim(), address && `${address.postalCode || ""} ${address.city || ""}`.trim()].filter(Boolean).join("\n");
};

const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const documentFieldValue = (document, key) => {
  if (has(document?.fieldValues, key)) return document.fieldValues[key];
  const values = {
    issuerName: "",
    issuerAddress: "",
    issuerContact: "",
    senderLine: "",
    customerName: customerName(document?.customer),
    customerAddress: customerAddress(document?.customer),
    customerNumber: document?.customer?.customerNumber || "",
    projectTitle: document?.project?.title || document?.commission?.title || "",
    projectNumber: document?.project?.projectNumber || document?.commission?.commissionNumber || "",
    commissionTitle: document?.commission?.title || "",
    closingText: "",
    footerText: ""
  };
  return values[key] ?? "";
};

const MATERIALIZED_FIELDS = [
  "issuerName",
  "issuerAddress",
  "issuerContact",
  "senderLine",
  "customerName",
  "customerAddress",
  "customerNumber",
  "projectTitle",
  "projectNumber",
  "commissionTitle",
  "closingText",
  "footerText"
];

function Control({ label, children, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>;
}

const roleLabel = role => ({ admin: "Administrator", manager: "Manager", user: "Mitarbeiter" })[role] || "Mitarbeiter";

function DocumentAssigneeDialog({ document, onClose, onAssigned }) {
  const [assignees, setAssignees] = useState([]);
  const [userId, setUserId] = useState(document.assignedTo?.id || "");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    let active = true;
    loadCommercialDocumentAssignees()
      .then(items => active && setAssignees(items))
      .catch(requestError => active && setDialogError(requestError.response?.data?.message || "Mitarbeiter konnten nicht geladen werden."));
    return () => { active = false; };
  }, []);

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setDialogError("");
    try {
      onAssigned(await assignCommercialDocument(document.id, userId));
      onClose();
    } catch (requestError) {
      setDialogError(requestError.response?.data?.message || "Die Bearbeitung konnte nicht zugewiesen werden.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="commercial-assignee-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 id="commercial-assignee-title" className="text-xl font-semibold">Bearbeitung zuweisen</h2><p className="mt-1 truncate text-sm text-slate-400">{document.documentNumber ? `${document.documentNumber} · ` : ""}{document.title}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">✕</button></div>
      {dialogError && <p role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-300">{dialogError}</p>}
      <label className="mt-5 block text-sm text-slate-300">Bearbeiter<select aria-label="Bearbeiter" value={userId} onChange={event => setUserId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"><option value="">Nicht zugewiesen</option>{assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name} · {roleLabel(assignee.role)}</option>)}</select></label>
      <p className="mt-3 text-xs leading-5 text-slate-500">Der Beleg erscheint als offene Aufgabe unter „Meine Aufträge“ auf der Startseite des ausgewählten Mitarbeiters.</p>
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Abbrechen</button><button type="submit" disabled={busy} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50">{busy ? "Weist zu …" : "Bearbeitung zuweisen"}</button></div>
    </form>
  </div>;
}

const controlClass = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500";
const paperInputClass = "w-full rounded-lg border border-orange-300 bg-orange-50/70 px-2 py-1.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-orange-400 focus:border-amber-500 focus:bg-orange-50";

function DocumentField({ editing, label, value, onChange, multiline = false, rows = 2, type = "text", placeholder = "", className = "", inputClassName = "" }) {
  if (!editing) return <div className={`whitespace-pre-wrap ${className}`}>{String(value || "").trim() || <span className="text-zinc-400">—</span>}</div>;
  const common = {
    "aria-label": label,
    value: value ?? "",
    onChange: event => onChange(event.target.value),
    placeholder,
    className: `${paperInputClass} ${inputClassName} ${className}`
  };
  return multiline ? <textarea {...common} rows={rows}/> : <input {...common} type={type}/>;
}

function InsertPositionButton({ index, onInsert }) {
  return <div className="group relative h-5">
    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-zinc-300 opacity-0 transition group-hover:opacity-100"/>
    <button type="button" aria-label={`Position an Stelle ${index + 1} einfügen`} title="Position einfügen" onClick={() => onInsert(index)} className="absolute left-1/2 top-1/2 z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-emerald-600 bg-white text-base font-semibold leading-none text-emerald-700 shadow-sm transition hover:bg-emerald-600 hover:text-white">+</button>
  </div>;
}

function PositionEditor({ item, index, editing, onChange, onRemove }) {
  const total = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (1 - (Number(item.discountPercent) || 0) / 100);
  if (!editing) return <article className="grid grid-cols-[2.2rem_minmax(0,1fr)] gap-2 border-b border-zinc-200 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_6.5rem_7rem] sm:gap-3">
    <div className="text-sm tabular-nums text-zinc-500">{index + 1}</div>
    <div><div className="font-medium">{item.description}</div>{item.details && <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{item.details}</div>}</div>
    <div className="col-start-2 text-sm tabular-nums text-zinc-600 sm:col-start-auto sm:text-right">{item.quantity} {item.unit}</div>
    <div className="text-right text-sm tabular-nums text-zinc-600">{money.format(Number(item.unitPrice) || 0)}{Number(item.discountPercent) > 0 && <span className="block text-xs text-zinc-400">− {item.discountPercent} %</span>}</div>
    <div className="text-right font-medium tabular-nums">{money.format(total)}</div>
  </article>;

  const input = (key, label, options = {}) => <input aria-label={`${label} Position ${index + 1}`} type={options.type || "text"} min={options.min} max={options.max} step={options.step} value={item[key] ?? ""} onChange={event => onChange(index, key, event.target.value)} className={`${paperInputClass} ${options.className || ""}`}/>;
  return <article className="rounded-xl border border-orange-200 bg-orange-50/40 p-3">
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Position {index + 1}</span><button type="button" aria-label={`Position ${index + 1} entfernen`} onClick={() => onRemove(index)} className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Entfernen</button></div>
    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_7rem_6rem]">
      <div>{input("description", "Beschreibung")}<textarea aria-label={`Details Position ${index + 1}`} value={item.details || ""} onChange={event => onChange(index, "details", event.target.value)} rows="2" placeholder="Details, Ausführung, Material …" className={`${paperInputClass} mt-2 resize-y text-sm`}/></div>
      <div>{input("quantity", "Menge", { type: "number", min: "0.01", step: "0.01", className: "text-right" })}</div>
      <div>{input("unit", "Einheit", { className: "text-right" })}</div>
      <div>{input("unitPrice", "Einzelpreis", { type: "number", min: "0", step: "0.01", className: "text-right" })}</div>
      <div>{input("discountPercent", "Rabatt", { type: "number", min: "0", max: "99.99", step: "0.01", className: "text-right" })}<div className="mt-2 text-right text-xs font-medium tabular-nums text-zinc-600">{money.format(total)}</div></div>
    </div>
  </article>;
}

function DocumentPaper({ document, editing, totals, vatPercent, onFieldChange, onItemChange, onInsertItem, onRemoveItem }) {
  const field = key => documentFieldValue(document, key);
  const typeLabel = document.documentType === "invoice" ? "Rechnung" : "Angebot";
  return <section aria-label="Beleginhalt" className="mx-auto w-full max-w-[960px] overflow-hidden rounded-sm bg-white text-zinc-900 shadow-2xl">
    <div className="border-b-[5px] border-emerald-700 px-5 py-7 sm:px-10 lg:px-14">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)] sm:items-start">
        <div>
          <DocumentField editing={editing} label="Firmenname" value={field("issuerName")} onChange={value => onFieldChange("issuerName", value)} placeholder="Firmenname" className="text-xl font-bold tracking-tight sm:text-2xl" inputClassName="font-bold"/>
          <div className="mt-2 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
            <DocumentField editing={editing} label="Firmenanschrift" value={field("issuerAddress")} onChange={value => onFieldChange("issuerAddress", value)} multiline rows={3} placeholder="Straße und Ort"/>
            <DocumentField editing={editing} label="Firmenkontakt" value={field("issuerContact")} onChange={value => onFieldChange("issuerContact", value)} multiline rows={3} placeholder="Telefon, E-Mail, Internet"/>
          </div>
        </div>
        <div className="sm:text-right"><div className="text-3xl font-light tracking-tight text-emerald-800 sm:text-4xl">{typeLabel}</div><div className="mt-2 text-sm text-zinc-500">{document.documentNumber || "ohne Belegnummer"}</div></div>
      </div>
    </div>

    <div className="px-5 py-7 sm:px-10 lg:px-14">
      <DocumentField editing={editing} label="Absenderzeile" value={field("senderLine")} onChange={value => onFieldChange("senderLine", value)} placeholder="Firmenname · Straße · Ort" className="text-xs text-zinc-500"/>
      <div className="mt-4 grid gap-8 sm:grid-cols-[minmax(0,1fr)_18rem]">
        <DocumentField editing={editing} label="Kundenanschrift" value={field("customerAddress")} onChange={value => onFieldChange("customerAddress", value)} multiline rows={5} placeholder="Name und vollständige Anschrift" className="min-h-28 leading-6"/>
        <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] content-start gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500">Belegnummer</dt><dd className="text-right font-medium">{document.documentNumber || "—"}</dd>
          <dt className="text-zinc-500">Datum</dt><dd className="text-right">{dateLabel(document.issuedAt)}</dd>
          <dt className="text-zinc-500">Fällig am</dt><dd className="text-right">{dateLabel(document.dueAt)}</dd>
          <dt className="text-zinc-500">Kundennr.</dt><dd><DocumentField editing={editing} label="Kundennummer im Beleg" value={field("customerNumber")} onChange={value => onFieldChange("customerNumber", value)} className="text-right" inputClassName="text-right"/></dd>
          <dt className="text-zinc-500">Projekt</dt><dd><DocumentField editing={editing} label="Projektbezeichnung im Beleg" value={field("projectTitle")} onChange={value => onFieldChange("projectTitle", value)} className="text-right" inputClassName="text-right"/></dd>
          <dt className="text-zinc-500">Projektnr.</dt><dd><DocumentField editing={editing} label="Projektnummer im Beleg" value={field("projectNumber")} onChange={value => onFieldChange("projectNumber", value)} className="text-right" inputClassName="text-right"/></dd>
        </dl>
      </div>

      <div className="mt-10 border-b border-zinc-300 pb-5">
        <DocumentField editing={editing} label="Belegtitel" value={document.title || ""} onChange={value => onFieldChange("title", value)} placeholder={`${typeLabel} – Betreff`} className="text-xl font-bold sm:text-2xl" inputClassName="font-bold"/>
        <div className="mt-4"><DocumentField editing={editing} label="Einleitung" value={document.introText || ""} onChange={value => onFieldChange("introText", value)} multiline rows={4} placeholder="Anrede und einleitender Text" className="leading-7"/></div>
      </div>

      <div className="mt-6">
        <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_5rem_6.5rem_7rem] gap-3 border-b-2 border-emerald-800 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid"><span>Pos.</span><span>Beschreibung</span><span className="text-right">Menge</span><span className="text-right">Preis</span><span className="text-right">Summe</span></div>
        {editing && <InsertPositionButton index={0} onInsert={onInsertItem}/>}
        {(document.items || []).map((item, index) => <div key={item.id || index}><PositionEditor item={item} index={index} editing={editing} onChange={onItemChange} onRemove={onRemoveItem}/>{editing && <InsertPositionButton index={index + 1} onInsert={onInsertItem}/>}</div>)}
        {(document.items || []).length === 0 && !editing && <div className="border-b border-zinc-200 py-8 text-center text-sm text-zinc-400">Keine Positionen</div>}
      </div>

      <div className="mt-6 ml-auto w-full max-w-sm text-sm">
        <div className="flex justify-between gap-4 border-b border-zinc-200 py-2"><span className="text-zinc-500">Nettosumme</span><span className="tabular-nums">{money.format(totals.net)}</span></div>
        <div className="flex justify-between gap-4 border-b border-zinc-200 py-2"><span className="text-zinc-500">MwSt. {Number(vatPercent) || 0} %</span><span className="tabular-nums">{money.format(totals.vat)}</span></div>
        <div className="flex justify-between gap-4 border-b-2 border-emerald-800 py-3 text-lg font-bold"><span>Gesamtsumme</span><span className="tabular-nums">{money.format(totals.gross)}</span></div>
      </div>

      <div className="mt-10 grid gap-6 border-t border-zinc-200 pt-6 sm:grid-cols-2">
        <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Bedingungen & Hinweise</div><DocumentField editing={editing} label="Bedingungen und Hinweise" value={document.notes || ""} onChange={value => onFieldChange("notes", value)} multiline rows={5} placeholder="Zahlungsziel, Lieferbedingungen, Gültigkeit …" className="text-sm leading-6"/></div>
        <div><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Abschluss</div><DocumentField editing={editing} label="Abschlusstext" value={field("closingText")} onChange={value => onFieldChange("closingText", value)} multiline rows={5} placeholder="Abschlusstext und Grußformel" className="text-sm leading-6"/></div>
      </div>
    </div>

    <footer className="border-t border-zinc-200 bg-zinc-50 px-5 py-5 sm:px-10 lg:px-14"><DocumentField editing={editing} label="Belegfußzeile" value={field("footerText")} onChange={value => onFieldChange("footerText", value)} multiline rows={4} placeholder="Bankverbindung, USt-ID, Gerichtsstand und weitere Pflichtangaben" className="text-xs leading-5 text-zinc-600"/></footer>
  </section>;
}

const templateFieldValue = (document, key, totals) => ({
  issuerName: documentFieldValue(document, "issuerName"),
  issuerAddress: documentFieldValue(document, "issuerAddress"),
  issuerContact: documentFieldValue(document, "issuerContact"),
  senderLine: documentFieldValue(document, "senderLine"),
  documentType: commercialDocumentLabel(document.documentType),
  customerName: documentFieldValue(document, "customerName"),
  customerAddress: documentFieldValue(document, "customerAddress"),
  documentNumber: document.documentNumber || "",
  issuedAt: dateValue(document.issuedAt),
  dueAt: dateValue(document.dueAt),
  customerNumber: documentFieldValue(document, "customerNumber"),
  projectTitle: documentFieldValue(document, "projectTitle"),
  projectNumber: documentFieldValue(document, "projectNumber"),
  commissionTitle: documentFieldValue(document, "commissionTitle"),
  title: document.title || "",
  introText: document.introText || "",
  net: money.format(totals.net),
  vat: money.format(totals.vat),
  gross: money.format(totals.gross),
  notes: document.notes || "",
  closingText: documentFieldValue(document, "closingText"),
  footerText: documentFieldValue(document, "footerText")
}[key] ?? "");

const layoutTextStyle = item => ({
  color: item.color,
  background: item.background,
  borderColor: item.borderColor,
  borderWidth: `${item.borderWidth || 0}px`,
  borderStyle: item.borderStyle || "solid",
  borderRadius: `${item.borderRadius || 0}px`,
  padding: `${item.padding || 0}px`,
  textAlign: item.align,
  fontFamily: fontFamilyValue(item.fontFamily),
  fontSize: `${(item.fontSize || 9) * 0.168}cqw`,
  fontWeight: item.fontWeight,
  lineHeight: item.lineHeight,
  flexDirection: "column",
  justifyContent: item.verticalAlign === "center" ? "center" : item.verticalAlign === "bottom" ? "flex-end" : "flex-start"
});

function TemplateStaticObject({ item, logoDataUrl }) {
  if (item.type === "rect") return <div className="absolute" style={{ ...layoutObjectPosition(item), background: item.fill, border: `${item.strokeWidth || 0}px solid ${item.stroke}` }}/>;
  if (item.type === "line") return <div className="absolute" style={{ ...layoutObjectPosition(item), height: "2px", borderTop: `${Math.max(1, item.strokeWidth || 0.5)}px solid ${item.stroke}` }}/>;
  if (item.type === "logo") return <div className="absolute overflow-hidden" style={layoutObjectPosition(item)}>{logoDataUrl && <img src={logoDataUrl} alt="Unternehmenslogo" className="h-full w-full" style={{ objectFit: item.fit }}/>}</div>;
  if (item.type === "text") return <div className="absolute flex whitespace-pre-wrap overflow-hidden" style={{ ...layoutObjectPosition(item), ...layoutTextStyle(item) }}>{item.text}</div>;
  return null;
}

function TemplatePositions({ document, editing, onItemChange, onInsertItem, onRemoveItem }) {
  return <div className="h-full rounded-lg bg-transparent p-0">
    <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_5rem_6.5rem_7rem] gap-3 border-b-2 border-emerald-800 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid"><span>Pos.</span><span>Beschreibung</span><span className="text-right">Menge</span><span className="text-right">Preis</span><span className="text-right">Summe</span></div>
    {editing && <InsertPositionButton index={0} onInsert={onInsertItem}/>}
    {(document.items || []).map((item, index) => <div key={item.id || index}><PositionEditor item={item} index={index} editing={editing} onChange={onItemChange} onRemove={onRemoveItem}/>{editing && <InsertPositionButton index={index + 1} onInsert={onInsertItem}/>}</div>)}
    {(document.items || []).length === 0 && !editing && <div className="py-6 text-center text-sm text-zinc-400">Keine Positionen</div>}
  </div>;
}

function TemplateDynamicField({ item, document, editing, totals, onFieldChange, onItemChange, onInsertItem, onRemoveItem }) {
  const geometry = layoutObjectPosition(item);
  if (item.key === "positions") return <div className="absolute overflow-visible" style={{ ...geometry, ...layoutTextStyle(item), ...(editing ? { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "10px", padding: "8px" } : {}) }}><TemplatePositions document={document} editing={editing} onItemChange={onItemChange} onInsertItem={onInsertItem} onRemoveItem={onRemoveItem}/></div>;
  const value = templateFieldValue(document, item.key, totals);
  const computed = ["net", "vat", "gross", "documentType"].includes(item.key);
  const isDate = ["issuedAt", "dueAt"].includes(item.key);
  const multiline = ["issuerAddress", "issuerContact", "customerAddress", "introText", "notes", "closingText", "footerText"].includes(item.key);
  const displayValue = isDate ? dateLabel(document[item.key]) : value;
  const wrapperStyle = { ...geometry, ...layoutTextStyle(item) };
  if (!editing || computed) return <div className="absolute flex whitespace-pre-wrap overflow-hidden" style={wrapperStyle}>{String(displayValue || "").trim() || <span className="text-zinc-400">—</span>}</div>;
  const common = { "aria-label": documentFieldLabel(item.key), value: isDate ? dateValue(document[item.key]) : value, onChange: event => onFieldChange(item.key, event.target.value), placeholder: documentFieldLabel(item.key), className: "h-full w-full resize-none border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-zinc-400", style: { font: "inherit", lineHeight: "inherit", textAlign: "inherit" } };
  return <div className="absolute flex overflow-hidden" style={{ ...wrapperStyle, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "8px" }}>{multiline ? <textarea {...common}/> : <input {...common} type={isDate ? "date" : "text"}/>}</div>;
}

function TemplateDocumentPaper({ document, editing, totals, logoDataUrl, onFieldChange, onItemChange, onInsertItem, onRemoveItem }) {
  const layout = normalizeDocumentLayout(document.template?.analysis?.layout);
  return <section aria-label="Beleginhalt" className="relative mx-auto w-full max-w-[960px] overflow-visible text-zinc-900 shadow-2xl" style={{ aspectRatio: `${layout.page.width}/${layout.page.height}`, background: layout.page.background, containerType: "inline-size" }}>
    {layout.objects.filter(item => item.visible !== false).map(item => item.type === "field"
      ? <TemplateDynamicField key={item.id} item={item} document={document} editing={editing} totals={totals} onFieldChange={onFieldChange} onItemChange={onItemChange} onInsertItem={onInsertItem} onRemoveItem={onRemoveItem}/>
      : <TemplateStaticObject key={item.id} item={item} logoDataUrl={logoDataUrl}/>)}
  </section>;
}

export default function CommercialDocumentEditorPage() {
  const { user } = useAuth();
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const creating = useRef(false);
  const [document, setDocument] = useState(null);
  const [vatPercent, setVatPercent] = useState(19);
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const canAssign = ["admin", "manager"].includes(user?.role);

  useEffect(() => {
    let active = true;
    loadCompanySettings().then(settings => { if (active) setLogoDataUrl(settings.branding?.logoDataUrl || ""); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (documentId) {
          const existing = await loadCommercialDocument(documentId);
          if (!active) return;
          setDocument(existing);
          setVatPercent(existing.totals?.vatPercent ?? 19);
          setEditing(existing.fieldValues?.editorLocked !== true);
          return;
        }
        if (creating.current) return;
        creating.current = true;
        const requestedType = searchParams.get("type");
        const type = COMMERCIAL_DOCUMENT_TYPES.some(entry => entry.value === requestedType) ? requestedType : "quote";
        const created = await createCommercialDocument({
          customerId: searchParams.get("customerId"),
          projectId: searchParams.get("projectId") || null,
          commissionId: searchParams.get("commissionId") || null,
          documentType: type,
          title: commercialDocumentLabel(type),
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
  const positionTemplate = document?.template?.analysis?.version === 4 && Array.isArray(document.template.analysis.layout?.objects) && document.template.analysis.layout.objects.length ? document.template : null;
  const update = (key, value) => setDocument(current => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => setDocument(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const updateField = (key, value) => {
    if (["title", "introText", "notes"].includes(key)) return update(key, value);
    setDocument(current => ({ ...current, fieldValues: { ...(current.fieldValues || {}), [key]: value } }));
  };
  const updateTemplateField = (key, value) => ["documentNumber", "issuedAt", "dueAt", "title", "introText", "notes"].includes(key) ? update(key, value) : updateField(key, value);
  const changeDocumentType = type => setDocument(current => ({ ...current, documentType: type, title: COMMERCIAL_DOCUMENT_TYPES.some(entry => entry.label === current.title) ? commercialDocumentLabel(type) : current.title }));
  const insertItem = index => setDocument(current => ({ ...current, items: [...current.items.slice(0, index), emptyItem(), ...current.items.slice(index)] }));
  const removeItem = index => setDocument(current => ({ ...current, items: current.items.filter((_item, itemIndex) => itemIndex !== index) }));

  const save = async ({ lockDocument = !editing } = {}) => {
    if (!document) return false;
    setSaving(true);
    setMessage("");
    setError("");
    const fieldValues = { ...(document.fieldValues || {}) };
    if (lockDocument) MATERIALIZED_FIELDS.forEach(key => { fieldValues[key] = documentFieldValue(document, key); });
    fieldValues.editorLocked = lockDocument;
    try {
      const saved = await saveCommercialDocument(document.id, {
        documentType: document.documentType,
        documentNumber: document.documentNumber,
        status: document.status,
        title: document.title,
        issuedAt: document.issuedAt,
        dueAt: document.dueAt,
        introText: document.introText,
        notes: document.notes,
        items: document.items,
        vatPercent,
        fieldValues
      });
      setDocument(saved);
      setVatPercent(saved.totals?.vatPercent ?? vatPercent);
      setEditing(!lockDocument);
      setMessage(lockDocument ? "Die Eingaben wurden festgesetzt. Der Beleg wird jetzt als Text angezeigt." : "Entwurf gespeichert.");
      return true;
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Beleg konnte nicht gespeichert werden.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-dvh bg-gray-900 p-10 text-slate-400">Belegeditor wird geladen …</div>;

  return <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
    <SideBar selected={5}/>
    <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to={user?.role === "user" ? "/" : document?.customerId ? `/Kontakte/${document.customerId}` : "/Kontakte"} className="text-sm text-sky-400 hover:text-sky-300">{user?.role === "user" ? "Zur Startseite" : "Zur Kundenübersicht"}</Link><div className="mt-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">Belegeditor · {editing ? "Bearbeitung" : "festgesetzt"}</div><h1 className="mt-1 text-2xl font-bold">{commercialDocumentLabel(document?.documentType)} {document?.documentNumber}</h1><p className="mt-1 text-sm text-slate-400">{document?.project?.title || document?.commission?.title || customerName(document?.customer)}</p></div>
        {document && <div className="flex flex-wrap gap-2">{editing ? <><button type="button" onClick={() => save({ lockDocument: false })} disabled={saving} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{saving ? "Speichert …" : "Entwurf speichern"}</button><button type="button" onClick={() => save({ lockDocument: true })} disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Eingaben festsetzen</button></> : <><button type="button" onClick={() => save({ lockDocument: true })} disabled={saving} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{saving ? "Speichert …" : "Status speichern"}</button><button type="button" onClick={() => { setEditing(true); setMessage(""); }} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500">Beleg bearbeiten</button>{canAssign && <button type="button" onClick={() => setAssigning(true)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">Bearbeitung zuweisen</button>}</>}</div>}
      </header>

      {message && <div role="status" className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</div>}
      {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}

      {document && <>
        {assigning && <DocumentAssigneeDialog
          document={document}
          onClose={() => setAssigning(false)}
          onAssigned={assignedDocument => {
            setDocument(assignedDocument);
            setMessage(assignedDocument.assignedToId ? "Die Belegbearbeitung wurde zugewiesen." : "Die Belegzuweisung wurde entfernt.");
          }}
        />}
        <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Status & allgemeine Daten</h2><p className="mt-1 text-sm text-slate-400">Diese Werte steuern den Beleg. Der Inhalt wird direkt auf der Belegseite darunter bearbeitet.</p>{positionTemplate && <p className="mt-1 text-xs text-emerald-300">Standardvorlage: {positionTemplate.name}</p>}</div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${editing ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}>{editing ? "Bearbeitungsmodus" : "Textansicht"}</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Control label="Belegart"><select value={document.documentType} onChange={event => changeDocumentType(event.target.value)} className={controlClass}>{COMMERCIAL_DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Control>
            <Control label="Status"><select value={document.status} onChange={event => update("status", event.target.value)} className={controlClass}><option value="draft">Entwurf</option><option value="sent">Versendet</option><option value="accepted">Angenommen</option><option value="paid">Bezahlt</option><option value="cancelled">Storniert</option></select></Control>
            <Control label="Belegnummer"><input value={document.documentNumber || ""} onChange={event => update("documentNumber", event.target.value)} className={controlClass}/></Control>
            <Control label="Ausstellungsdatum"><input type="date" value={dateValue(document.issuedAt)} onChange={event => update("issuedAt", event.target.value)} className={controlClass}/></Control>
            <Control label="Fällig am"><input type="date" value={dateValue(document.dueAt)} onChange={event => update("dueAt", event.target.value)} className={controlClass}/></Control>
            <Control label="MwSt. %"><input type="number" min="0" step="0.01" value={vatPercent} onChange={event => setVatPercent(event.target.value)} className={`${controlClass} text-right`}/></Control>
            <Control label="Betreff / Titel" className="sm:col-span-2 xl:col-span-4"><input value={document.title || ""} onChange={event => update("title", event.target.value)} className={controlClass}/></Control>
            <div className="grid grid-cols-3 gap-3 sm:col-span-2 xl:col-span-2"><div className="rounded-lg bg-slate-950 p-3 text-sm"><span className="block text-xs text-slate-500">Netto</span>{money.format(totals.net)}</div><div className="rounded-lg bg-slate-950 p-3 text-sm"><span className="block text-xs text-slate-500">MwSt.</span>{money.format(totals.vat)}</div><div className="rounded-lg bg-emerald-950/50 p-3 text-sm font-bold text-emerald-200"><span className="block text-xs font-normal text-emerald-500">Gesamt</span>{money.format(totals.gross)}</div></div>
          </div>
        </section>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-2 sm:p-5 lg:p-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-slate-400"><span>{editing ? "Felder direkt in der gespeicherten Vorlagenstruktur ausfüllen" : "Festgesetzter Beleg · reine Textansicht"}</span><span>{positionTemplate ? "Gestaltete Standardvorlage" : "Freier Belegeditor"}</span></div>{positionTemplate ? <TemplateDocumentPaper document={{ ...document, template: positionTemplate }} editing={editing} totals={totals} logoDataUrl={logoDataUrl} onFieldChange={updateTemplateField} onItemChange={updateItem} onInsertItem={insertItem} onRemoveItem={removeItem}/> : <DocumentPaper document={document} editing={editing} totals={totals} vatPercent={vatPercent} onFieldChange={updateField} onItemChange={updateItem} onInsertItem={insertItem} onRemoveItem={removeItem}/>}</div>
      </>}
    </div></main>
  </div>;
}
