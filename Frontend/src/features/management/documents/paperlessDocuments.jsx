import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import QRCode from "qrcode";
import PaperlessDocumentViewer from "../../../shared/components/PaperlessDocumentViewer.jsx";
import { createPaperlessQrPdf, PAPERLESS_QR_PAPER_FORMATS } from "./paperlessQrPdf.js";

const formatDate = value => value ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kunde";
const targetLabel = document => document.status === "dismissed"
    ? "In Carpenters ausgeblendet"
    : document.project
    ? `Projekt ${document.project.projectNumber ? `${document.project.projectNumber} · ` : ""}${document.project.title}`
    : document.folder
        ? `Ordner ${document.folder.name}`
        : document.customer
            ? `Kunde ${customerName(document.customer)}`
            : "Nicht zugeordnet";

const Thumbnail = ({ document, library = false }) => {
    const [failed, setFailed] = useState(false);
    const src = library
        ? `/api/paperless/library/${document.remoteDocumentId}/thumbnail?v=2`
        : `/api/paperless/documents/${document.id}/thumbnail?v=2`;
    if (failed === src) return <div className="grid h-full place-items-center px-5 text-center"><div><span className="text-5xl text-slate-600">▤</span><p className="mt-2 line-clamp-2 text-xs text-slate-500">{document.fileName || document.title}</p></div></div>;
    return <img src={src} alt={`Vorschau von ${document.title}`} loading="lazy" onError={() => setFailed(src)} className="h-full w-full object-contain" />;
};

function AssignmentDialog({ document, library = false, onClose, onAssigned }) {
    const [options, setOptions] = useState({ projects: [], customers: [], folders: [] });
    const [targetType, setTargetType] = useState("project");
    const [targetId, setTargetId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/paperless/assignment-options")
            .then(({ data }) => {
                setOptions(data);
                setTargetId(data.projects?.[0]?.id || data.customers?.[0]?.id || data.folders?.[0]?.id || "");
            })
            .catch(requestError => setError(requestError.response?.data?.message || "Zuordnungsziele konnten nicht geladen werden."));
    }, []);

    const list = targetType === "project" ? options.projects : targetType === "customer" ? options.customers : options.folders;
    const changeType = type => {
        setTargetType(type);
        const next = type === "project" ? options.projects : type === "customer" ? options.customers : options.folders;
        setTargetId(next?.[0]?.id || "");
    };

    const assign = async event => {
        event.preventDefault();
        if (!targetId) return;
        setBusy(true);
        setError("");
        try {
            const url = library
                ? `/api/paperless/library/${document.remoteDocumentId}/link`
                : `/api/paperless/documents/${document.id}/assignment`;
            if (library) await axios.post(url, { targetType, targetId });
            else await axios.put(url, { targetType, targetId });
            await onAssigned();
            onClose();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Das Dokument konnte nicht zugeordnet werden.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <form onSubmit={assign} role="dialog" aria-modal="true" aria-labelledby="paperless-assignment-title" className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4"><div><h2 id="paperless-assignment-title" className="text-xl font-semibold">Dokument zuordnen</h2><p className="mt-1 truncate text-sm text-slate-400">{document.title}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">✕</button></div>
                {error && <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
                <div className="mt-5 grid grid-cols-3 gap-2">
                    {[['project', 'Projekt'], ['customer', 'Kunde'], ['folder', 'Ordner']].map(([type, label]) => <button key={type} type="button" onClick={() => changeType(type)} className={`rounded-lg border px-3 py-2 text-sm ${targetType === type ? "border-blue-500 bg-blue-950/50 text-blue-200" : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}>{label}</button>)}
                </div>
                <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-slate-300">Ziel</span><select value={targetId} onChange={event => setTargetId(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-blue-500"><option value="">Bitte auswählen</option>{list.map(item => <option key={item.id} value={item.id}>{targetType === "project" ? `${item.projectNumber ? `${item.projectNumber} · ` : ""}${item.title} · ${customerName(item.customer)}` : targetType === "customer" ? `${item.customerNumber ? `${item.customerNumber} · ` : ""}${customerName(item)}` : item.name}</option>)}</select></label>
                <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">Abbrechen</button><button type="submit" disabled={busy || !targetId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{busy ? "Wird zugeordnet …" : "Verknüpfen"}</button></div>
            </form>
        </div>
    );
}

const DocumentCard = ({ document, library = false, onOpen, onAssign, onUnlink, onDismiss, onDeleteRemote }) => (
    <article className="group overflow-hidden rounded-xl border border-slate-700 bg-slate-800/70 transition hover:border-slate-600 hover:shadow-xl">
        <button type="button" onClick={() => onOpen(document)} aria-label={`${document.title} in Vorschau öffnen`} className="relative block h-52 w-full overflow-hidden bg-slate-950 text-left">
            <Thumbnail document={document} library={library} />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent px-3 pb-2 pt-8 text-[11px] text-slate-300"><span>Dokumentvorschau</span><span className="rounded-full bg-slate-800/90 px-2 py-1 transition group-hover:bg-blue-600">Anzeigen</span></span>
        </button>
        <div className="p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><button type="button" onClick={() => onOpen(document)} className="block max-w-full truncate text-left font-medium text-blue-300 hover:underline" title={document.title}>{document.title}</button><p className="mt-1 truncate text-xs text-slate-500">{document.fileName || document.documentType || "Paperless-Dokument"}</p></div>{document.documentType && <span className="shrink-0 rounded-full bg-violet-950 px-2 py-1 text-[11px] text-violet-300">{document.documentType}</span>}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-400"><p>{document.correspondent || "Ohne Korrespondent"}</p><p>{formatDate(document.addedAt || document.remoteAddedAt || document.receivedAt)}</p>{document.linked && <p className="text-emerald-300">{targetLabel(document.linked)}</p>}{!library && document.status === "linked" && <p className="text-emerald-300">{targetLabel(document)}</p>}</div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => onOpen(document)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-700">Vorschau</button>{onAssign && (!document.linked || document.linked.status === "dismissed") && <button type="button" onClick={() => onAssign(document)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-500">Zuordnen</button>}{onDismiss && <button type="button" onClick={() => onDismiss(document)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Ausblenden</button>}{onDeleteRemote && <button type="button" onClick={() => onDeleteRemote(document)} className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/50">In Paperless löschen</button>}{onUnlink && <button type="button" onClick={() => onUnlink(document)} className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/50">Verknüpfung lösen</button>}</div>
        </div>
    </article>
);

function QrGenerator() {
    const [options, setOptions] = useState({ projects: [], customers: [] });
    const [targetType, setTargetType] = useState("project");
    const [targetId, setTargetId] = useState("");
    const [documentType, setDocumentType] = useState("Rechnung");
    const [title, setTitle] = useState("");
    const [paperFormat, setPaperFormat] = useState("a4");
    const [orientation, setOrientation] = useState("portrait");
    const [qr, setQr] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/paperless/assignment-options").then(({ data }) => {
            setOptions(data);
            setTargetId(data.projects?.[0]?.id || data.customers?.[0]?.id || "");
        }).catch(() => setError("Ziele für den QR-Code konnten nicht geladen werden."));
    }, []);

    const setType = type => {
        setTargetType(type);
        setTargetId((type === "project" ? options.projects : options.customers)?.[0]?.id || "");
        setQr(null);
    };

    const generate = async event => {
        event.preventDefault();
        setError("");
        try {
            const { data } = await axios.post("/api/paperless/qr", { targetType, targetId, documentType, title });
            const dataUrl = await QRCode.toDataURL(data.value, { errorCorrectionLevel: "M", margin: 2, width: 720 });
            setQr({ ...data, dataUrl });
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Der QR-Code konnte nicht erzeugt werden.");
        }
    };

    const openPdf = () => {
        if (!qr) return;
        setError("");
        try {
            const blob = createPaperlessQrPdf({
                dataUrl: qr.dataUrl,
                paperFormat,
                orientation,
                documentType: qr.payload.documentType,
                title: qr.payload.title
            });
            const blobUrl = URL.createObjectURL(blob);
            const viewer = window.open(blobUrl, "_blank");
            if (!viewer) {
                URL.revokeObjectURL(blobUrl);
                setError("Der PDF-Viewer wurde vom Browser blockiert. Bitte Pop-ups für Carpenters erlauben.");
                return;
            }
            viewer.opener = null;
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
        } catch (pdfError) {
            console.error("QR-PDF konnte nicht erzeugt werden:", pdfError);
            setError("Die PDF-Druckvorlage konnte nicht erzeugt werden.");
        }
    };

    const list = targetType === "project" ? options.projects : options.customers;
    return (
        <details className="rounded-xl border border-slate-700 bg-slate-800/40">
            <summary className="cursor-pointer px-5 py-4 font-semibold">QR-Code für interne Dokumente erstellen</summary>
            <form onSubmit={generate} className="grid gap-4 border-t border-slate-700 p-5 md:grid-cols-2">
                {error && <p className="md:col-span-2 text-sm text-red-300">{error}</p>}
                <div className="flex rounded-lg border border-slate-700 p-1"><button type="button" onClick={() => setType("project")} className={`flex-1 rounded-md px-3 py-2 text-sm ${targetType === "project" ? "bg-blue-600" : "text-slate-400"}`}>Projekt</button><button type="button" onClick={() => setType("customer")} className={`flex-1 rounded-md px-3 py-2 text-sm ${targetType === "customer" ? "bg-blue-600" : "text-slate-400"}`}>Kunde</button></div>
                <select value={targetId} onChange={event => { setTargetId(event.target.value); setQr(null); }} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5"><option value="">Ziel auswählen</option>{list.map(item => <option key={item.id} value={item.id}>{targetType === "project" ? `${item.projectNumber ? `${item.projectNumber} · ` : ""}${item.title}` : customerName(item)}</option>)}</select>
                <select value={documentType} onChange={event => { setDocumentType(event.target.value); setQr(null); }} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5">{["Rechnung", "Lieferschein", "Angebot", "Auftragsbestätigung", "Aufmaß", "Internes Dokument"].map(type => <option key={type}>{type}</option>)}</select>
                <input value={title} onChange={event => { setTitle(event.target.value); setQr(null); }} placeholder="Dokumenttitel (optional)" className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5" />
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-400">Papierformat</span><select value={paperFormat} onChange={event => setPaperFormat(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5">{PAPERLESS_QR_PAPER_FORMATS.map(format => <option key={format.value} value={format.value}>{format.label}</option>)}</select></label>
                <fieldset><legend className="mb-1.5 text-xs font-medium text-slate-400">Ausrichtung</legend><div className="flex rounded-lg border border-slate-700 p-1"><button type="button" aria-pressed={orientation === "portrait"} onClick={() => setOrientation("portrait")} className={`flex-1 rounded-md px-3 py-2 text-sm ${orientation === "portrait" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>Hochformat</button><button type="button" aria-pressed={orientation === "landscape"} onClick={() => setOrientation("landscape")} className={`flex-1 rounded-md px-3 py-2 text-sm ${orientation === "landscape" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>Querformat</button></div></fieldset>
                <div className="md:col-span-2 flex justify-end"><button disabled={!targetId} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">QR-Code erzeugen</button></div>
                {qr && <div className="md:col-span-2 flex flex-col items-center rounded-xl bg-white p-5 text-slate-900"><img src={qr.dataUrl} alt="Carpenters-Dokument-QR-Code" className="w-full max-w-xs" /><p className="mt-3 text-center text-sm font-semibold">{qr.payload.documentType} · {qr.payload.projectId ? "Projektzuordnung" : "Kundenzuordnung"}</p><p className="mt-1 text-center text-xs text-slate-500">Leere {paperFormat.toUpperCase()}-Druckseite im {orientation === "portrait" ? "Hochformat" : "Querformat"}, QR-Code oben rechts.</p><button type="button" onClick={openPdf} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">PDF im Viewer öffnen</button></div>}
            </form>
        </details>
    );
}

export function PaperlessInbox({ folders = [] }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [assigning, setAssigning] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [syncing, setSyncing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/paperless/documents");
            setDocuments(data.documents || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Paperless-Dokumente konnten nicht geladen werden.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initial = window.setTimeout(load, 0);
        const interval = window.setInterval(load, 10_000);
        return () => { window.clearTimeout(initial); window.clearInterval(interval); };
    }, [load]);

    const unlink = async document => {
        if (!window.confirm(`Verknüpfung von „${document.title}“ lösen? Die Datei bleibt in Paperless erhalten.`)) return;
        try {
            await axios.delete(`/api/paperless/documents/${document.id}/assignment`);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Die Verknüpfung konnte nicht gelöst werden.");
        }
    };

    const dismiss = async document => {
        if (!window.confirm(`„${document.title}“ aus dem Carpenters-Eingang ausblenden? Die Datei bleibt in Paperless erhalten.`)) return;
        try {
            await axios.post(`/api/paperless/documents/${document.id}/dismiss`);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Das Dokument konnte nicht ausgeblendet werden.");
        }
    };

    const deleteRemote = async document => {
        if (!window.confirm(`„${document.title}“ wirklich in den Paperless-Papierkorb verschieben? Die Referenz wird auch aus Carpenters entfernt.`)) return;
        try {
            await axios.delete(`/api/paperless/documents/${document.id}`);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Das Dokument konnte nicht in Paperless gelöscht werden.");
        }
    };

    const syncNow = async () => {
        setSyncing(true);
        setError("");
        try {
            await axios.post("/api/paperless/sync");
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Der Paperless-Abgleich ist fehlgeschlagen.");
        } finally {
            setSyncing(false);
        }
    };

    const inbox = documents.filter(document => document.status !== "linked");
    const automatic = documents.filter(document => document.status === "linked" && document.assignmentSource === "qr").slice(0, 20);
    const recentManual = documents.filter(document => document.status === "linked" && document.assignmentSource !== "qr" && !document.folder).slice(0, 20);
    const byFolder = new Map(folders.map(folder => [folder.id, documents.filter(document => document.folder?.id === folder.id)]));

    return (
        <div className="space-y-5">
            {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
            {automatic.length > 0 && <section className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-5"><h2 className="font-semibold text-emerald-200">Automatisch zugeordnet</h2><div className="mt-3 space-y-2">{automatic.map(document => <button key={document.id} type="button" onClick={() => setViewing(document)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-4 py-3 text-left text-sm hover:bg-slate-800"><span><span className="font-medium text-slate-100">{document.title}</span><span className="ml-2 text-slate-400">wurde per QR-Code zugeordnet.</span></span><span className="text-emerald-300">{targetLabel(document)} →</span></button>)}</div></section>}
            <section className="rounded-xl border border-slate-700 bg-slate-800/30 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Dokumenteingang</h2><p className="mt-1 text-sm text-slate-500">Neue Paperless-Dokumente ohne eindeutigen QR-Treffer.</p></div><div className="flex items-center gap-2"><button type="button" disabled={syncing} onClick={syncNow} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-50">{syncing ? "Synchronisiert …" : "Jetzt synchronisieren"}</button><span className="rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-300">{inbox.length} offen</span></div></div>{loading ? <p className="py-10 text-center text-slate-500">Dokumente werden geladen …</p> : inbox.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Keine offenen Dokumente.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{inbox.map(document => <DocumentCard key={document.id} document={document} onOpen={setViewing} onAssign={setAssigning} onDismiss={dismiss} onDeleteRemote={deleteRemote} />)}</div>}</section>
            {recentManual.length > 0 && <section className="rounded-xl border border-slate-700 bg-slate-800/30 p-5"><h2 className="font-semibold">Zuletzt verknüpft</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recentManual.map(document => <DocumentCard key={document.id} document={document} onOpen={setViewing} onUnlink={unlink} />)}</div></section>}
            {folders.map(folder => <section key={folder.id} className="rounded-xl border border-slate-700 bg-slate-800/30 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{folder.name}</h2><span className="text-xs text-slate-500">{byFolder.get(folder.id)?.length || 0} Dokumente</span></div>{!byFolder.get(folder.id)?.length ? <p className="mt-4 text-sm text-slate-500">Noch keine Dokumente in diesem Ordner.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{byFolder.get(folder.id).map(document => <DocumentCard key={document.id} document={document} onOpen={setViewing} onUnlink={unlink} />)}</div>}</section>)}
            <QrGenerator />
            {assigning && <AssignmentDialog document={assigning} onClose={() => setAssigning(null)} onAssigned={load} />}
            {viewing && <PaperlessDocumentViewer document={viewing} onClose={() => setViewing(null)} />}
        </div>
    );
}

export function PaperlessLibrary() {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ results: [], count: 0, next: false, previous: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [assigning, setAssigning] = useState(null);
    const [viewing, setViewing] = useState(null);

    const search = useCallback(async (nextPage = page) => {
        setLoading(true);
        setError("");
        try {
            const { data } = await axios.get("/api/paperless/library", { params: { query: query.trim() || undefined, page: nextPage } });
            setResult(data);
            setPage(nextPage);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Die Paperless-Bibliothek konnte nicht durchsucht werden.");
        } finally {
            setLoading(false);
        }
    }, [page, query]);

    useEffect(() => { const timeout = window.setTimeout(() => search(1), 0); return () => window.clearTimeout(timeout); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const linkedCount = useMemo(() => result.results.filter(item => item.linked).length, [result.results]);

    return (
        <div className="space-y-5">
            <form onSubmit={event => { event.preventDefault(); search(1); }} className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-4 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">Paperless durchsuchen</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Titel, Inhalt, Korrespondent …" className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-2.5 outline-none focus:border-blue-500" /></label><button disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{loading ? "Sucht …" : "Suchen"}</button></form>
            {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span>{result.count} Treffer · {linkedCount} auf dieser Seite bereits verknüpft</span><div className="flex gap-2"><button type="button" disabled={!result.previous || loading} onClick={() => search(page - 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-30">← Zurück</button><span className="px-2 py-1.5">Seite {page}</span><button type="button" disabled={!result.next || loading} onClick={() => search(page + 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-30">Weiter →</button></div></div>
            {!loading && result.results.length === 0 ? <p className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">Keine Dokumente gefunden.</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{result.results.map(document => <DocumentCard key={document.remoteDocumentId} document={document} library onOpen={setViewing} onAssign={setAssigning} />)}</div>}
            {assigning && <AssignmentDialog document={assigning} library onClose={() => setAssigning(null)} onAssigned={() => search(page)} />}
            {viewing && <PaperlessDocumentViewer document={viewing} library onClose={() => setViewing(null)} />}
        </div>
    );
}
