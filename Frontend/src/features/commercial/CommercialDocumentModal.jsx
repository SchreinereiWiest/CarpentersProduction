import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { createCommercialDocument, loadDocumentTemplates } from "./commercialApi.js";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const documentLabel = type => type === "invoice" ? "Rechnung" : "Angebot";

const targetValue = target => {
  if (target?.type === "project") return `project:${target.id}`;
  if (target?.type === "commission") return `commission:${target.id}`;
  return "free";
};

const documentBelongsToTarget = (document, target) => {
  if (target?.type === "project") return document.project?.id === target.id;
  if (target?.type === "commission") return document.commission?.id === target.id;
  return true;
};

export default function CommercialDocumentModal({ customerId, target, projects, commissions, documents, onClose }) {
  const navigate = useNavigate();
  const [source, setSource] = useState(() => targetValue(target));
  const [documentType, setDocumentType] = useState("quote");
  const [title, setTitle] = useState("Angebot");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lockedTarget = target?.type === "project" || target?.type === "commission";

  useEffect(() => {
    let active = true;
    loadDocumentTemplates().then(items => active && setTemplates(items)).catch(() => active && setTemplates([]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const relevantDocuments = useMemo(
    () => lockedTarget ? documents.filter(document => documentBelongsToTarget(document, target)) : documents,
    [documents, lockedTarget, target]
  );

  const selectedLabel = useMemo(() => {
    if (source.startsWith("project:")) return projects.find(project => `project:${project.id}` === source)?.title;
    if (source.startsWith("commission:")) return commissions.find(commission => `commission:${commission.id}` === source)?.title;
    return "Freier Kundenbeleg";
  }, [commissions, projects, source]);

  const changeType = value => {
    setDocumentType(value);
    setTitle(value === "invoice" ? "Rechnung" : "Angebot");
    const currentTemplate = templates.find(template => template.id === templateId);
    if (currentTemplate && !["universal", value].includes(currentTemplate.documentType)) setTemplateId("");
  };

  const create = async event => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const [sourceType, sourceId] = source.split(":");
      const document = await createCommercialDocument({
        customerId,
        documentType,
        title,
        templateId: templateId || null,
        projectId: sourceType === "project" ? sourceId : null,
        commissionId: sourceType === "commission" ? sourceId : null,
        issuedAt: new Date().toISOString()
      });
      onClose();
      navigate(`/Belege/${document.id}`);
    } catch (createError) {
      setError(createError.response?.data?.message || "Der Beleg konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="commercial-document-modal-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-4">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Angebote & Rechnungen</div><h2 id="commercial-document-modal-title" className="mt-1 text-xl font-semibold">Beleg erstellen</h2><p className="mt-1 text-sm text-slate-400">{lockedTarget ? `Bezug: ${target.label}` : "Freien Beleg oder einen Projektbezug auswählen."}</p></div>
          <button type="button" onClick={onClose} aria-label="Belegdialog schließen" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <form onSubmit={create} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Belegart</span><select value={documentType} onChange={event => changeType(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="quote">Angebot</option><option value="invoice">Rechnung</option></select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Bezug</span>{lockedTarget ? <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-300">{target.label}</div> : <select value={source} onChange={event => setSource(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="free">Freier Kundenbeleg</option><optgroup label="Projekte">{projects.map(project => <option key={project.id} value={`project:${project.id}`}>{project.title}</option>)}</optgroup>{commissions.length > 0 && <optgroup label="Kommissionen">{commissions.map(commission => <option key={commission.id} value={`commission:${commission.id}`}>{commission.title}</option>)}</optgroup>}</select>}</label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Titel</span><input required value={title} onChange={event => setTitle(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-emerald-500" /></label>
              <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">PDF-Vorlage</span><select value={templateId} onChange={event => setTemplateId(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="">Standardlayout</option>{templates.filter(template => ["universal", documentType].includes(template.documentType)).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
            </div>
            <div className="mt-3 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400">Neue Positionen werden aus {selectedLabel || "dem gewählten Bezug"} vorbelegt und können anschließend im Belegeditor geändert werden.</div>
            {error && <div role="alert" className="mt-3 rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{error}</div>}
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700">Abbrechen</button><button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">{busy ? "Wird angelegt …" : `${documentLabel(documentType)} anlegen`}</button></div>
          </form>

          <section className="mt-5">
            <div className="flex items-center justify-between"><div><h3 className="font-semibold">Vorhandene Belege</h3><p className="mt-0.5 text-xs text-slate-500">{lockedTarget ? `Für ${target.label}` : "Alle Belege dieses Kunden"}</p></div><span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">{relevantDocuments.length}</span></div>
            {relevantDocuments.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">Noch keine passenden Belege vorhanden.</p> : <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-slate-700">{relevantDocuments.map(document => <Link key={document.id} to={`/Belege/${document.id}`} onClick={onClose} className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950/40 px-4 py-3 last:border-0 hover:bg-slate-800"><span className="min-w-0"><span className="block truncate text-sm font-medium text-sky-300">{document.documentNumber} · {document.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{documentLabel(document.documentType)} · {document.project?.title || document.commission?.title || "Freier Kundenbeleg"}</span></span><span className="shrink-0 text-sm font-semibold tabular-nums">{money.format(document.totals?.gross || 0)}</span></Link>)}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
