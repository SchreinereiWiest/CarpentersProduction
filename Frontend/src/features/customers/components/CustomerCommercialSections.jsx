import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { createCommission } from "../../commercial/commercialApi.js";
import { formatGermanDate } from "../../../shared/utils/date.js";

const documentLabel = type => type === "invoice" ? "Rechnung" : "Angebot";

export function CustomerProjectsList({ projects, commissions, selectionMode, selectedProjectIds, onToggleProject, onOpenDocument, onRemoveCommission }) {
  const navigate = useNavigate();
  const grouped = useMemo(() => {
    const byCommission = new Map(commissions.map(commission => [commission.id, { ...commission, projects: [] }]));
    const standalone = [];
    for (const project of projects) {
      if (project.commission?.id && byCommission.has(project.commission.id)) byCommission.get(project.commission.id).projects.push(project);
      else standalone.push(project);
    }
    return { commissions: [...byCommission.values()].filter(commission => commission.projects.length > 0), standalone };
  }, [commissions, projects]);

  const visibleProjects = selectionMode ? grouped.standalone : projects;
  const projectRow = (project, nested = false) => {
    const selected = selectedProjectIds.includes(project.id);
    return (
      <tr key={project.id} onClick={() => selectionMode ? onToggleProject(project.id) : navigate(`/Projects/${project.id}`)} className={`cursor-pointer border-t border-slate-700 transition ${selectionMode ? selected ? "bg-blue-950/70 ring-1 ring-inset ring-blue-500" : "bg-slate-700/45 text-slate-300 hover:bg-slate-700/70" : "bg-gray-800 hover:bg-slate-700"}`}>
        <td data-label="Projekt" className={`px-5 py-4 ${nested ? "sm:pl-10" : ""}`}><div className="flex items-center gap-3">{selectionMode && <input aria-label={`${project.title} auswählen`} type="checkbox" tabIndex="-1" checked={selected} readOnly className="h-4 w-4 shrink-0" />}<div className="min-w-0"><p className="truncate font-medium">{project.title}</p><p className="mt-1 truncate text-xs text-slate-500">{project.description || project.projectNumber || "Keine Beschreibung"}</p></div></div></td>
        <td data-label="Start" className="px-5 py-4 text-sm text-slate-300">{formatGermanDate(project.startDate)}</td>
        <td data-label="Status" className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${project.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{project.status}</span></td>
        <td data-label="Aktionen" className="px-5 py-4 text-right">{!selectionMode && <button type="button" onClick={event => { event.stopPropagation(); onOpenDocument({ type: "project", id: project.id, label: project.title }); }} className="rounded-lg border border-emerald-800 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950">Beleg</button>}</td>
      </tr>
    );
  };

  return (
    <section data-tour="contact-detail-projects" className="min-w-0 w-full flex-1 overflow-hidden rounded-xl border border-slate-800 bg-gray-800">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-5"><div><h2 className="font-semibold">Projekte</h2><p className="text-xs text-slate-500">{selectionMode ? `${visibleProjects.length} nicht kommissionierte Projekte auswählen` : `${projects.length} dem Kunden zugeordnet`}</p></div>{selectionMode && <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">{selectedProjectIds.length} ausgewählt</span>}</div>
      {visibleProjects.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">{selectionMode ? "Keine nicht kommissionierten Projekte verfügbar." : "Noch keine Projekte vorhanden."}</div> : <div className="max-h-[36rem] overflow-auto"><table className="responsive-card-table w-full table-fixed"><thead><tr className="bg-gray-800"><th className="w-5/12 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Projekt</th><th className="w-2/12 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Start</th><th className="w-2/12 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Status</th><th className="w-3/12 px-5 py-3 text-right text-xs font-semibold uppercase text-slate-400">Aktionen</th></tr></thead><tbody>
        {!selectionMode && grouped.commissions.map(commission => <Fragment key={commission.id}><tr className="border-y border-blue-800/70 bg-blue-950/55"><td colSpan={4} className="px-5 py-3"><div className="flex flex-wrap items-center justify-between gap-3"><Link to={`/Kommissionen/${commission.id}`} className="min-w-0 hover:text-blue-200"><span className="font-semibold text-blue-100">Kommission · {commission.title}</span><span className="ml-2 text-xs text-blue-300/70">{commission.commissionNumber || `${commission.projects.length} Projekte`}</span></Link><div className="flex items-center gap-2"><Link to={`/Kommissionen/${commission.id}`} className="rounded-lg border border-blue-800 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-950">Großkalkulation</Link><button type="button" onClick={() => onOpenDocument({ type: "commission", id: commission.id, label: commission.title })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500">Beleg</button><button type="button" onClick={() => onRemoveCommission(commission)} className="rounded-lg px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-950/60">Auflösen</button></div></div></td></tr>{commission.projects.map(project => projectRow(project, true))}</Fragment>)}
        {!selectionMode && grouped.commissions.length > 0 && grouped.standalone.length > 0 && <tr className="border-y border-slate-700 bg-slate-900/70"><td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Einzelprojekte</td></tr>}
        {grouped.standalone.map(project => projectRow(project))}
      </tbody></table></div>}
    </section>
  );
}

export function CommissionSection({ customerId, projects, commissions, selectionMode, selectedProjectIds, onStart, onCancel, onFinished }) {
  const [title, setTitle] = useState("");
  const [commissionNumber, setCommissionNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const availableCount = projects.filter(project => !project.commission).length;

  const cancel = () => { setTitle(""); setCommissionNumber(""); setMessage(null); onCancel(); };
  const create = async event => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await createCommission(customerId, { title, commissionNumber, projectIds: selectedProjectIds });
      setTitle("");
      setCommissionNumber("");
      setMessage({ type: "success", text: "Kommission wurde angelegt." });
      await onFinished();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Kommission konnte nicht angelegt werden." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-blue-900/60 bg-gray-800 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-blue-100">Kommissionen</h2><p className="mt-1 text-sm text-slate-400">Mehrere Einzelprojekte in der Projektliste auswählen und zu einem Großauftrag bündeln.</p></div><span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">{commissions.length} Kommissionen</span></div>
      {!selectionMode ? <div className="mt-5 rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-sm font-semibold">Neue Kommission</h3><p className="mt-1 text-xs text-slate-500">{availableCount} nicht kommissionierte Projekte verfügbar. Nach dem Start erfolgt die Auswahl direkt in der Projektliste.</p></div><button type="button" disabled={availableCount < 2} onClick={() => { setMessage(null); onStart(); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Kommission erstellen</button></div>{message && <p role="status" className={`mt-3 text-sm ${message.type === "error" ? "text-rose-300" : "text-emerald-300"}`}>{message.text}</p>}</div> : <form onSubmit={create} className="mt-5 rounded-xl border border-blue-800 bg-blue-950/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-blue-100">Projekte oben auswählen</h3><p className="mt-1 text-xs text-blue-300/70">Kommissionierte Projekte sind ausgeblendet. Ausgewählt: {selectedProjectIds.length} von {availableCount}.</p></div><button type="button" onClick={cancel} className="text-xs text-slate-400 hover:text-white">Auswahl abbrechen</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-xs text-slate-400">Bezeichnung</span><input required value={title} onChange={event => setTitle(event.target.value)} placeholder="z. B. Innenausbau Villa Müller" className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label><label><span className="mb-1 block text-xs text-slate-400">Kommissionsnummer</span><input value={commissionNumber} onChange={event => setCommissionNumber(event.target.value)} placeholder="optional" className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label></div>{message && <p role="status" className={`mt-3 text-sm ${message.type === "error" ? "text-rose-300" : "text-emerald-300"}`}>{message.text}</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={cancel} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700">Abbrechen</button><button disabled={busy || selectedProjectIds.length < 2} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Wird angelegt …" : "Auswahl bestätigen"}</button></div></form>}
    </section>
  );
}

export function CommercialDocumentsSection({ documents, onAddDocument }) {
  return (
    <section className="rounded-xl border border-emerald-900/60 bg-gray-800 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-emerald-100">Angebote & Rechnungen</h2><p className="mt-1 text-sm text-slate-400">Belege laufen unabhängig von der Kommissionierung und können frei oder mit Projektbezug angelegt werden.</p></div><button type="button" onClick={onAddDocument} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">+ Beleg hinzufügen</button></div>
      {documents.length > 0 ? <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-700">{documents.map(document => <Link key={document.id} to={`/Belege/${document.id}`} className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-900/60 px-4 py-3 last:border-b-0 hover:bg-slate-700"><span className="min-w-0"><span className="block truncate text-sm font-medium text-sky-300">{document.documentNumber} · {document.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{documentLabel(document.documentType)} · {document.project?.title || document.commission?.title || "Kundenbeleg"}</span></span><span className="shrink-0 text-sm font-semibold tabular-nums">{new Intl.NumberFormat("de-DE", { style: "currency", currency: document.currency || "EUR" }).format(document.totals?.gross || 0)}</span></Link>)}</div> : <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">Noch keine Angebote oder Rechnungen angelegt.</p>}
    </section>
  );
}
