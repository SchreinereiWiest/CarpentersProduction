import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getProjectAssetUrl } from "../../../services/projectAssetCache.js";
import { useParams } from "react-router";
import SideBar from "../../../components/sideBar.jsx";
import ProjectBar from "../../../components/projectBar.jsx";
import { useAuth } from "../../../routes/AuthContext.jsx";

const ATTACHMENT_CATEGORY = "production-attachment";
const ACCEPTED_TYPES = new Set(["image/jpeg", "application/pdf"]);

const Icon = ({ children, className = "size-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        {children}
    </svg>
);

function AttachmentPreview({ attachment, focused = false }) {
    if (attachment.mimeType === "application/pdf") {
        return (
            <iframe
                src={attachment.url}
                title={attachment.fileName}
                className="h-full min-h-[280px] w-full bg-white sm:min-h-[420px]"
            />
        );
    }

    return (
        <img
            src={attachment.url}
            alt={attachment.fileName}
            className={`h-full w-full object-contain ${focused ? "max-h-[calc(100dvh-8rem)]" : "min-h-64 max-h-[60vh]"}`}
        />
    );
}

function UploadModal({ existingFiles, onClose, onUploaded, onDeleted }) {
    const { projectId } = useParams();
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [articleNumber, setArticleNumber] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedResults, setSelectedResults] = useState(new Set());
    const [usedOpenWeb, setUsedOpenWeb] = useState(false);
    const [searched, setSearched] = useState(false);

    const selectFiles = event => {
        const selected = Array.from(event.target.files || []);
        const invalid = selected.find(file => !ACCEPTED_TYPES.has(file.type));
        setError(invalid ? `${invalid.name}: Nur JPG- und PDF-Dateien sind erlaubt.` : "");
        setFiles(invalid ? [] : selected);
    };

    const upload = async event => {
        event.preventDefault();
        if (!files.length || busy) return;
        setBusy(true);
        setError("");

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("entityId", projectId);
                formData.append("fileName", file.name);
                formData.append("mimeType", file.type);
                await axios.post("/api/files/project-attachment", formData);
            }
            await onUploaded();
            onClose();
        } catch (uploadError) {
            setError(uploadError.response?.data?.message || uploadError.response?.data?.error || "Upload fehlgeschlagen.");
        } finally {
            setBusy(false);
        }
    };

    const remove = async file => {
        if (!window.confirm(`„${file.fileName}“ wirklich löschen?`)) return;
        setBusy(true);
        setError("");
        try {
            await axios.delete(`/api/files/delete/${file.id}`);
            await onDeleted();
        } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Datei konnte nicht gelöscht werden.");
        } finally {
            setBusy(false);
        }
    };

    const search = async () => {
        const query = articleNumber.trim();
        if (!query || searching || busy) return;
        setSearching(true);
        setError("");
        setSearchResults([]);
        setSelectedResults(new Set());
        setSearched(false);
        try {
            const { data } = await axios.post("/api/files/attachment-search", { projectId, articleNumber: query });
            setSearchResults(data.results || []);
            setUsedOpenWeb(Boolean(data.usedOpenWeb));
            setSearched(true);
        } catch (searchError) {
            setError(searchError.response?.data?.message || "Die Artikelsuche ist fehlgeschlagen.");
        } finally {
            setSearching(false);
        }
    };

    const toggleResult = resultId => {
        setSelectedResults(previous => {
            const next = new Set(previous);
            if (next.has(resultId)) next.delete(resultId);
            else next.add(resultId);
            return next;
        });
    };

    const importSelected = async () => {
        if (!selectedResults.size || busy) return;
        setBusy(true);
        setError("");
        const imported = [];
        try {
            for (const resultId of selectedResults) {
                await axios.post("/api/files/attachment-search/import", { projectId, resultId });
                imported.push(resultId);
            }
            setSearchResults(previous => previous.filter(result => !imported.includes(result.id)));
            setSelectedResults(new Set());
            await onUploaded();
        } catch (importError) {
            if (imported.length) {
                setSearchResults(previous => previous.filter(result => !imported.includes(result.id)));
                setSelectedResults(previous => new Set([...previous].filter(id => !imported.includes(id))));
                await onUploaded();
            }
            setError(importError.response?.data?.message || "Eine ausgewählte Datei konnte nicht hinzugefügt werden.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section role="dialog" aria-modal="true" aria-labelledby="attachment-modal-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
                    <div>
                        <h2 id="attachment-modal-title" className="text-xl font-semibold">Anlagen bearbeiten</h2>
                        <p className="mt-1 text-sm text-gray-400">JPG oder PDF, maximal 50 MB pro Datei</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Dialog schließen">✕</button>
                </div>
                {error && <p className="mx-6 mt-5 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300" role="alert">{error}</p>}

                <form onSubmit={upload} className="space-y-4 p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Manueller Dateiupload</h3>
                    <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/50 px-6 py-8 text-center hover:border-blue-500">
                        <span className="font-medium">Dateien auswählen</span>
                        <span className="mt-1 text-sm text-gray-400">Mehrere Pläne können gemeinsam hochgeladen werden.</span>
                        <input type="file" accept="image/jpeg,application/pdf" multiple onChange={selectFiles} className="sr-only" />
                    </label>
                    {files.length > 0 && <p className="text-sm text-gray-300">{files.length} Datei{files.length === 1 ? "" : "en"} ausgewählt</p>}
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50">Abbrechen</button>
                        <button type="submit" disabled={!files.length || busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Wird hochgeladen …" : "Hochladen"}</button>
                    </div>
                </form>

                <div className="border-t border-gray-700 px-6 py-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">AttachementSearch</h3>
                    <p className="mt-1 text-sm text-gray-500">Artikelnummer auf freigegebenen Herstellerseiten und bei Bedarf im Open Web suchen.</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <label className="min-w-0 flex-1">
                            <span className="sr-only">Artikelnummer</span>
                            <input
                                type="text"
                                value={articleNumber}
                                maxLength={120}
                                placeholder="Artikelnummer eingeben"
                                onChange={event => setArticleNumber(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        search();
                                    }
                                }}
                                className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                            />
                        </label>
                        <button type="button" disabled={!articleNumber.trim() || searching || busy} onClick={search} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                            {searching ? "Sucht und prüft …" : "Suchen"}
                        </button>
                    </div>

                    {searching && <p className="mt-4 rounded-lg bg-gray-800 p-3 text-sm text-gray-300">Herstellerquellen werden geprüft und die Treffer über Open WebUI ausgewertet. Das kann einen Moment dauern.</p>}
                    {!searching && searched && searchResults.length === 0 && <p className="mt-4 text-sm text-gray-500">{usedOpenWeb ? "Auch im Open Web wurden keine fertigungsrelevanten Dateien gefunden." : "Auf den Herstellerseiten wurden keine fertigungsrelevanten Dateien gefunden."}</p>}
                    {searchResults.length > 0 && (
                        <div className="mt-4 space-y-3">
                            {usedOpenWeb && <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-200">Keine Herstellerdatei gefunden – diese Ergebnisse stammen aus dem Open Web. Ohne eindeutige Lizenzfreigabe können sie nicht ausgewählt werden.</p>}
                            {searchResults.map(result => (
                                <article key={result.id} className={`rounded-xl border p-4 ${result.downloadAllowed ? "border-gray-700 bg-gray-800" : "border-gray-800 bg-gray-900/60"}`}>
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" aria-label={`${result.fileName} auswählen`} checked={selectedResults.has(result.id)} disabled={!result.downloadAllowed || busy} onChange={() => toggleResult(result.id)} className="mt-1 h-4 w-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div><h4 className="font-medium text-gray-100">{result.title}</h4><p className="mt-0.5 break-all text-xs text-gray-500">{result.fileName}</p></div>
                                                <span className="rounded-full bg-blue-950 px-2.5 py-1 text-xs text-blue-200">{result.relevance}% relevant</span>
                                            </div>
                                            {result.summary && <p className="mt-3 text-sm text-gray-300">{result.summary}</p>}
                                            {result.productionData?.length > 0 && <div className="mt-3"><p className="text-xs font-medium text-gray-300">AI-Auswertung – Angaben vor Fertigung prüfen</p><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-400">{result.productionData.map((entry, index) => <li key={`${result.id}-${index}`}>{entry}</li>)}</ul></div>}
                                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">Quelle: {result.sourceName}</a>
                                                <span className={result.securityStatus === "passed" ? "text-green-400" : "text-red-400"}>Sicherheit: {result.securityStatus === "passed" ? "Vorprüfung bestanden" : "gesperrt"}</span>
                                                <span className={result.license.status === "approved" ? "text-green-400" : "text-amber-400"}>Lizenz: {result.license.status === "approved" ? "freigegeben" : "unklar"}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">{result.license.evidence}</p>
                                            {!result.downloadAllowed && <p className="mt-2 text-xs font-medium text-amber-300">Nicht auswählbar: Herkunft, Dateisicherheit oder Downloadrecht ist nicht ausreichend bestätigt.</p>}
                                        </div>
                                    </div>
                                </article>
                            ))}
                            <div className="flex justify-end"><button type="button" disabled={!selectedResults.size || busy} onClick={importSelected} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Wird geprüft und hinzugefügt …" : `${selectedResults.size} Datei${selectedResults.size === 1 ? "" : "en"} hinzufügen`}</button></div>
                        </div>
                    )}
                </div>

                {existingFiles.length > 0 && (
                    <div className="border-t border-gray-700 px-6 py-5">
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Vorhandene Anlagen</h3>
                        <div className="space-y-2">
                            {existingFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between gap-4 rounded-lg bg-gray-800 px-4 py-3">
                                    <span className="min-w-0 truncate text-sm">{file.fileName}</span>
                                    <button type="button" disabled={busy} onClick={() => remove(file)} className="shrink-0 rounded-md px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-50">Löschen</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function ProjectAttachments() {
    const { projectId } = useParams();
    const { user } = useAuth();
    const canEdit = ["admin", "manager"].includes(user?.role);
    const [project, setProject] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [columns, setColumns] = useState(2);
    const [focusedId, setFocusedId] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAttachments = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await axios.get(`/api/projects/get/${projectId}`);
            const nextProject = data.project;
            const files = (nextProject?.files || []).filter(file => file.category === ATTACHMENT_CATEGORY);
            const loaded = await Promise.all(files.map(async file => {
                return { ...file, url: await getProjectAssetUrl(file) };
            }));
            setProject(nextProject);
            setAttachments(loaded);
        } catch (loadError) {
            setError(loadError.response?.data?.message || "Anlagen konnten nicht geladen werden.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        const timeoutId = window.setTimeout(loadAttachments, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadAttachments]);

    useEffect(() => {
        const closeOnEscape = event => event.key === "Escape" && setFocusedId(null);
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, []);

    const focused = useMemo(() => attachments.find(item => item.id === focusedId), [attachments, focusedId]);
    const gridClass = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1 xl:grid-cols-2";

    const move = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= attachments.length) return;
        setAttachments(current => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
            <SideBar selected={2} />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="z-20 shrink-0 border-b border-gray-700 bg-gray-900"><ProjectBar selected={10} /></div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Anlagen</h1>
                            <p className="mt-1 text-sm text-gray-400">{project?.title ? `${project.title} · ` : ""}Pläne und Referenzen für die Fertigung</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex rounded-lg border border-gray-700 bg-gray-800 p-1" aria-label="Rasterspalten">
                                {[1, 2, 3].map(count => (
                                    <button key={count} type="button" onClick={() => setColumns(count)} aria-label={`${count} Spalten`} aria-pressed={columns === count} className={`h-9 w-9 rounded-md text-sm ${columns === count ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>{count}</button>
                                ))}
                            </div>
                            {canEdit && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"><Icon><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></Icon>Bearbeiten</button>}
                        </div>
                    </header>

                    {error && <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300" role="alert">{error}</p>}
                    {loading ? <div className="py-16 text-center text-gray-400">Anlagen werden geladen …</div> : attachments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/30 px-6 py-20 text-center">
                            <p className="text-lg font-medium text-gray-300">Noch keine Anlagen vorhanden</p>
                            <p className="mt-2 text-sm text-gray-500">CAD-Pläne und Detailbilder erscheinen hier.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-4 ${gridClass}`}>
                            {attachments.map((attachment, index) => (
                                <article
                                    key={attachment.id}
                                    className={`flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-lg ${
                                        columns === 1
                                            ? "min-h-[320px] sm:h-[calc(100dvh-13rem)] sm:min-h-[520px]"
                                            : "min-h-[320px] sm:min-h-[420px]"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3 border-b border-gray-700 px-4 py-3">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-sm font-medium" title={attachment.fileName}>{attachment.fileName}</h2>
                                            <p className="text-xs text-gray-500">{attachment.mimeType === "application/pdf" ? "PDF-Plan" : "Detailbild"}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-25" aria-label={`${attachment.fileName} nach vorne verschieben`}>←</button>
                                            <button type="button" onClick={() => move(index, 1)} disabled={index === attachments.length - 1} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-25" aria-label={`${attachment.fileName} nach hinten verschieben`}>→</button>
                                            <button type="button" onClick={() => setFocusedId(attachment.id)} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label={`${attachment.fileName} fokussieren`} title="In den Fokus setzen"><Icon><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></Icon></button>
                                        </div>
                                    </div>
                                    <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-950/60"><AttachmentPreview attachment={attachment} /></div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {editing && <UploadModal existingFiles={attachments} onClose={() => setEditing(false)} onUploaded={loadAttachments} onDeleted={loadAttachments} />}
            {focused && (
                <div className="fixed inset-0 z-50 flex flex-col bg-gray-950" role="dialog" aria-modal="true" aria-label={`${focused.fileName} in Fokusansicht`}>
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
                        <span className="truncate font-medium">{focused.fileName}</span>
                        <button type="button" onClick={() => setFocusedId(null)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700">Schließen</button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3"><AttachmentPreview attachment={focused} focused /></div>
                </div>
            )}
        </div>
    );
}
