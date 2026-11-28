import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    getProjectAssetUrl,
    storeLocalProjectAsset
} from "../../../shared/cache/project-asset-cache.js";
import { invalidateProjectAsset } from "../../../shared/cache/project-indexed-db.js";
import { useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import PaperlessDocumentViewer from "../../../shared/components/PaperlessDocumentViewer.jsx";
import { useAuth } from "../../../app/providers/AuthContext.js";
import { getProjectRecord } from "../../../shared/projects/project-records.js";
import {
    getLocalProject,
    saveLocalProject
} from "../../../shared/offline/local-projects.js";
import { downloadFile } from "../../../shared/api/file-api.js";
import { getProjectFile } from "../../../shared/cache/project-cache.js";
import {
    cabinetIdsForAttachment,
    isProjectAttachmentFile,
    loadAttachmentLinks,
    saveAttachmentLinks
} from "./attachmentLinks.js";

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
            const localProject = await getLocalProject(projectId);
            if (localProject) {
                const descriptors = [];
                for (const file of files) {
                    descriptors.push(await storeLocalProjectAsset(
                        projectId,
                        file,
                        { category: ATTACHMENT_CATEGORY }
                    ));
                }
                await saveLocalProject({
                    ...localProject,
                    files: [...(localProject.files ?? []), ...descriptors]
                });
                await onUploaded();
                onClose();
                return;
            }

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
            const localProject = await getLocalProject(projectId);
            if (localProject) {
                await invalidateProjectAsset(file.id);
                await saveLocalProject({
                    ...localProject,
                    files: (localProject.files ?? []).filter(item => item.id !== file.id)
                });
                await onDeleted();
                return;
            }

            await axios.delete(`/api/files/delete/${file.id}`);
            await onDeleted();
        } catch (deleteError) {
            setError(deleteError.response?.data?.message || "Datei konnte nicht gelöscht werden.");
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
    const [cabinets, setCabinets] = useState([]);
    const [attachmentLinks, setAttachmentLinks] = useState({ version: 1, links: {} });
    const [savingLinkId, setSavingLinkId] = useState(null);
    const [columns, setColumns] = useState(2);
    const [focusedId, setFocusedId] = useState(null);
    const [viewingPaperless, setViewingPaperless] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAttachments = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [nextProject, loadedCabinets, loadedLinks] = await Promise.all([
                getProjectRecord(projectId),
                getProjectFile({
                    projectId,
                    file: "cabinet.json",
                    loadFromServer: { download: downloadFile, path: `/api/projects/generated/${projectId}/cabinet` }
                }).catch(() => []),
                loadAttachmentLinks(projectId)
            ]);
            const files = (nextProject?.files || []).filter(isProjectAttachmentFile);
            const loaded = await Promise.all(files.map(async file => {
                return { ...file, url: await getProjectAssetUrl(file) };
            }));
            setProject(nextProject);
            setAttachments(loaded);
            setCabinets(Array.isArray(loadedCabinets) ? loadedCabinets : []);
            setAttachmentLinks(loadedLinks);
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
    const manualAttachments = attachments.filter(item => item.category === ATTACHMENT_CATEGORY);
    const paperlessDocuments = project?.paperlessDocuments ?? [];
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

    const toggleCabinetLink = async (attachmentId, cabinetId, enabled) => {
        const previous = attachmentLinks;
        const currentIds = cabinetIdsForAttachment(previous, attachmentId);
        const nextIds = enabled
            ? [...new Set([...currentIds, String(cabinetId)])]
            : currentIds.filter(id => id !== String(cabinetId));
        const next = {
            ...previous,
            links: { ...previous.links, [String(attachmentId)]: nextIds }
        };
        if (!nextIds.length) delete next.links[String(attachmentId)];
        setAttachmentLinks(next);
        setSavingLinkId(String(attachmentId));
        setError("");
        try {
            setAttachmentLinks(await saveAttachmentLinks(projectId, next));
        } catch (linkError) {
            setAttachmentLinks(previous);
            setError(linkError.response?.data?.message || "Die Korpus-Verknüpfung konnte nicht gespeichert werden.");
        } finally {
            setSavingLinkId(null);
        }
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
                        <div data-tour="project-attachments-actions" className="flex items-center gap-3">
                            <div className="flex rounded-lg border border-gray-700 bg-gray-800 p-1" aria-label="Rasterspalten">
                                {[1, 2, 3].map(count => (
                                    <button key={count} type="button" onClick={() => setColumns(count)} aria-label={`${count} Spalten`} aria-pressed={columns === count} className={`h-9 w-9 rounded-md text-sm ${columns === count ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>{count}</button>
                                ))}
                            </div>
                            {canEdit && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500"><Icon><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></Icon>Bearbeiten</button>}
                        </div>
                    </header>

                    <div data-tour="project-attachments-library">
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
                                            <p className="text-xs text-gray-500">{attachment.mimeType === "application/pdf" ? "PDF-Plan" : "Projektbild"}{attachment.category === ATTACHMENT_CATEGORY ? " · manuell hochgeladen" : " · aus dem Projekt"}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-25" aria-label={`${attachment.fileName} nach vorne verschieben`}>←</button>
                                            <button type="button" onClick={() => move(index, 1)} disabled={index === attachments.length - 1} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-25" aria-label={`${attachment.fileName} nach hinten verschieben`}>→</button>
                                            <button type="button" onClick={() => setFocusedId(attachment.id)} className="rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label={`${attachment.fileName} fokussieren`} title="In den Fokus setzen"><Icon><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></Icon></button>
                                        </div>
                                    </div>
                                    <div className="border-b border-gray-700 bg-gray-900/50 px-4 py-2.5">
                                        <details>
                                            <summary className="cursor-pointer text-xs font-medium text-blue-300">
                                                Korpusse verknüpfen ({cabinetIdsForAttachment(attachmentLinks, attachment.id).length})
                                                {savingLinkId === String(attachment.id) && <span className="ml-2 text-gray-500">speichert …</span>}
                                            </summary>
                                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                {cabinets.length === 0 ? <p className="text-xs text-gray-500">Im Cabinet Editor sind noch keine Korpusse vorhanden.</p> : cabinets.map(cabinet => (
                                                    <label key={cabinet.id} className={`flex items-center gap-2 rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-xs ${canEdit ? "cursor-pointer" : "opacity-70"}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={cabinetIdsForAttachment(attachmentLinks, attachment.id).includes(String(cabinet.id))}
                                                            disabled={!canEdit || savingLinkId === String(attachment.id)}
                                                            onChange={event => toggleCabinetLink(attachment.id, cabinet.id, event.target.checked)}
                                                            className="size-4 accent-blue-500"
                                                        />
                                                        <span className="truncate">{cabinet.name || "Korpus"}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                    <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-950/60"><AttachmentPreview attachment={attachment} /></div>
                                </article>
                            ))}
                        </div>
                    )}
                    </div>

                    {paperlessDocuments.length > 0 && (
                        <section data-tour="project-attachments-paperless" className="mt-6 rounded-2xl border border-violet-900/70 bg-violet-950/10 p-4 sm:p-5">
                            <div className="mb-4">
                                <h2 className="font-semibold text-violet-200">Dokumente aus Paperless</h2>
                                <p className="mt-1 text-xs text-gray-500">Diese Dateien bleiben in Paperless und werden beim Öffnen von dort geladen.</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {paperlessDocuments.map(document => (
                                    <button
                                        key={document.id}
                                        type="button"
                                        onClick={() => setViewingPaperless(document)}
                                        className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 p-3 text-left hover:border-violet-700 hover:bg-gray-700"
                                    >
                                        <img src={`/api/paperless/documents/${document.id}/thumbnail?v=2`} alt="" className="h-16 w-12 shrink-0 rounded bg-gray-950 object-contain" />
                                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-blue-300">{document.title}</span><span className="mt-1 block truncate text-xs text-gray-500">{document.documentType || document.originalFileName || "Paperless-Dokument"}</span></span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            {editing && <UploadModal existingFiles={manualAttachments} onClose={() => setEditing(false)} onUploaded={loadAttachments} onDeleted={loadAttachments} />}
            {focused && (
                <div className="fixed inset-0 z-50 flex flex-col bg-gray-950" role="dialog" aria-modal="true" aria-label={`${focused.fileName} in Fokusansicht`}>
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 py-3">
                        <span className="truncate font-medium">{focused.fileName}</span>
                        <button type="button" onClick={() => setFocusedId(null)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700">Schließen</button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-3"><AttachmentPreview attachment={focused} focused /></div>
                </div>
            )}
            {viewingPaperless && <PaperlessDocumentViewer document={viewingPaperless} onClose={() => setViewingPaperless(null)} />}
        </div>
    );
}
