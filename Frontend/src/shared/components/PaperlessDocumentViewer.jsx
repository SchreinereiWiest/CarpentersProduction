import { useCallback, useEffect, useId, useRef, useState } from "react";
import axios from "axios";
import { useApp } from "../../app/providers/AppContext.js";
import { invalidateS3FileCache } from "../cache/project-asset-cache.js";
import { loadPdfJs } from "../pdf/loadPdfJs.js";
import { applyPdfInk } from "../pdf/pdfInk.js";
import { pdfSourceUsesCredentials } from "../pdf/pdfSource.js";

const Icon = ({ children, className = "size-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

const paperlessDocumentContentUrl = (document, library = false) => library
  ? `/api/paperless/library/${encodeURIComponent(document.remoteDocumentId)}/content`
  : `/api/paperless/documents/${encodeURIComponent(document.id)}/content`;

const readableProgress = bytes => {
  if (!bytes) return "Dokument wird geladen …";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB geladen …`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB geladen …`;
};

const pointSegmentDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const position = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + position * dx), point.y - (start.y + position * dy));
};

export default function PaperlessDocumentViewer({ document, library = false, contentUrl = "", sourceLabel = "direkt aus Paperless", onClose, onSaved }) {
  const { SideBarCollapsed = true } = useApp() || {};
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const canvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const viewerRef = useRef(null);
  const drawingRef = useRef(false);
  const strokeCounterRef = useRef(0);
  const overrideUrlRef = useRef("");
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(0);
  const [error, setError] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [penWidth, setPenWidth] = useState(3);
  const [annotations, setAnnotations] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [currentVersion, setCurrentVersion] = useState(document?.serverVersion || null);
  const [overrideUrl, setOverrideUrl] = useState("");

  const baseUrl = document ? contentUrl || paperlessDocumentContentUrl(document, library) : "";
  const url = overrideUrl || baseUrl;
  const isImage = Boolean(contentUrl && document?.mimeType?.startsWith("image/"));
  const sourceUsesCredentials = pdfSourceUsesCredentials(url);
  const canEdit = Boolean(!library
    && document?.source === "carpenters"
    && document?.mimeType === "application/pdf"
    && document?.id);
  const hasAnnotations = Object.values(annotations).some(strokes => strokes.length > 0);

  const replaceOverrideUrl = useCallback(nextUrl => {
    if (overrideUrlRef.current) URL.revokeObjectURL(overrideUrlRef.current);
    overrideUrlRef.current = nextUrl;
    setOverrideUrl(nextUrl);
  }, []);

  const requestClose = useCallback(() => {
    if (editing && hasAnnotations && !window.confirm("Ungespeicherte handschriftliche Änderungen verwerfen?")) return;
    onClose();
  }, [editing, hasAnnotations, onClose]);

  useEffect(() => {
    if (!document) return undefined;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = event => {
      if (event.key === "Escape") requestClose();
      if (event.key === "ArrowLeft") setPageNumber(current => Math.max(1, current - 1));
      if (event.key === "ArrowRight") setPageNumber(current => Math.min(pdf?.numPages || current, current + 1));
    };
    const handleSidebarNavigation = event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (target?.closest(".app-sidebar a[href]")) requestClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.document.addEventListener("click", handleSidebarNavigation);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.document.removeEventListener("click", handleSidebarNavigation);
    };
  }, [document, pdf?.numPages, requestClose]);

  useEffect(() => () => {
    if (overrideUrlRef.current) URL.revokeObjectURL(overrideUrlRef.current);
  }, []);

  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return undefined;
    const measure = () => setViewerWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    if (!url || isImage) return undefined;
    let active = true;
    let loadingTask;
    loadPdfJs()
      .then(pdfjs => {
        if (!active) return null;
        loadingTask = pdfjs.getDocument({ url, withCredentials: sourceUsesCredentials });
        loadingTask.onProgress = progress => {
          if (active) setLoadedBytes(progress.loaded || 0);
        };
        return loadingTask.promise;
      })
      .then(loadedPdf => {
        if (!loadedPdf || !active) return;
        setPdf(loadedPdf);
        setLoading(false);
      })
      .catch(loadError => {
        if (!active || loadError?.name === "AbortException") return;
        console.error("Dokument-PDF konnte nicht geladen werden:", loadError);
        setError("Das Dokument konnte nicht geladen werden.");
        setLoading(false);
      });

    return () => {
      active = false;
      loadingTask?.destroy?.();
    };
  }, [isImage, sourceUsesCredentials, url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !viewerWidth) return undefined;
    let active = true;
    let renderTask;
    setRendering(true);

    pdf.getPage(pageNumber)
      .then(page => {
        if (!active) return null;
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, viewerWidth - 48);
        const fitScale = Math.min(1.5, availableWidth / baseViewport.width);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale * zoom * pixelRatio });
        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const cssWidth = Math.floor(viewport.width / pixelRatio);
        const cssHeight = Math.floor(viewport.height / pixelRatio);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        setCanvasSize({ width: cssWidth, height: cssHeight });
        renderTask = page.render({ canvas, viewport });
        return renderTask.promise;
      })
      .then(() => {
        if (active) setRendering(false);
      })
      .catch(renderError => {
        if (!active || renderError?.name === "RenderingCancelledException") return;
        console.error("Paperless-Seite konnte nicht gerendert werden:", renderError);
        setError("Die PDF-Seite konnte nicht dargestellt werden.");
        setRendering(false);
      });

    return () => {
      active = false;
      renderTask?.cancel?.();
    };
  }, [pageNumber, pdf, viewerWidth, zoom]);

  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!editing || !canvas || !canvasSize.width || !canvasSize.height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvasSize.width * pixelRatio);
    canvas.height = Math.floor(canvasSize.height * pixelRatio);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of annotations[pageNumber] || []) {
      if (!stroke.points.length) continue;
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.fillStyle = stroke.color;
      context.lineWidth = Math.max(1, stroke.widthNorm * canvasSize.width);
      const first = stroke.points[0];
      context.moveTo(first.x * canvasSize.width, first.y * canvasSize.height);
      for (const point of stroke.points.slice(1)) {
        context.lineTo(point.x * canvasSize.width, point.y * canvasSize.height);
      }
      if (stroke.points.length === 1) {
        context.arc(first.x * canvasSize.width, first.y * canvasSize.height, context.lineWidth / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.stroke();
      }
    }
  }, [annotations, canvasSize, editing, pageNumber]);

  const pointerPoint = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
    };
  };

  const eraseAt = point => {
    setAnnotations(current => {
      const strokes = current[pageNumber] || [];
      const threshold = 12 / Math.max(1, canvasSize.width);
      const remaining = strokes.filter(stroke => {
        if (stroke.points.length === 1) return pointSegmentDistance(point, stroke.points[0], stroke.points[0]) > threshold;
        return !stroke.points.slice(1).some((end, index) => pointSegmentDistance(point, stroke.points[index], end) <= threshold + stroke.widthNorm / 2);
      });
      return remaining.length === strokes.length ? current : { ...current, [pageNumber]: remaining };
    });
  };

  const startDrawing = event => {
    if (!editing || saving || !canvasSize.width) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = pointerPoint(event);
    if (tool === "eraser") {
      drawingRef.current = "eraser";
      eraseAt(point);
      return;
    }
    const strokeId = `${Date.now()}-${strokeCounterRef.current += 1}`;
    drawingRef.current = strokeId;
    const stroke = {
      id: strokeId,
      color: "#111827",
      widthNorm: penWidth / canvasSize.width,
      points: [point]
    };
    setAnnotations(current => ({ ...current, [pageNumber]: [...(current[pageNumber] || []), stroke] }));
  };

  const continueDrawing = event => {
    if (!drawingRef.current || !editing || saving) return;
    event.preventDefault();
    const point = pointerPoint(event);
    if (drawingRef.current === "eraser") {
      eraseAt(point);
      return;
    }
    const strokeId = drawingRef.current;
    setAnnotations(current => ({
      ...current,
      [pageNumber]: (current[pageNumber] || []).map(stroke => {
        if (stroke.id !== strokeId) return stroke;
        const previous = stroke.points.at(-1);
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.0015) return stroke;
        return { ...stroke, points: [...stroke.points, point] };
      })
    }));
  };

  const stopDrawing = event => {
    if (!drawingRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    drawingRef.current = false;
  };

  const undoCurrentPage = () => {
    setAnnotations(current => ({ ...current, [pageNumber]: (current[pageNumber] || []).slice(0, -1) }));
  };

  const cancelEditing = () => {
    if (hasAnnotations && !window.confirm("Ungespeicherte handschriftliche Änderungen verwerfen?")) return;
    setAnnotations({});
    setEditError("");
    setEditing(false);
  };

  const saveAnnotations = async () => {
    if (!hasAnnotations) {
      setEditing(false);
      return;
    }
    if (!Number.isSafeInteger(currentVersion)) {
      setEditError("Die aktuelle Dateiversion konnte nicht bestimmt werden. Bitte die PDF neu öffnen.");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const sourceBytes = pdf?.getData
        ? await pdf.getData()
        : new Uint8Array(await (await fetch(url, { credentials: sourceUsesCredentials ? "include" : "omit" })).arrayBuffer());
      const editedBytes = await applyPdfInk(sourceBytes, annotations);
      const editedBlob = new Blob([editedBytes], { type: "application/pdf" });
      const body = new FormData();
      body.append("pdf", editedBlob, fileName);
      body.append("expectedVersion", String(currentVersion));
      const { data } = await axios.put(`/api/paperless/garage-library/${document.id}/content`, body);
      await invalidateS3FileCache(document.id);
      setCurrentVersion(data.serverVersion);
      setAnnotations({});
      setEditing(false);
      setPdf(null);
      setLoading(true);
      setLoadedBytes(0);
      setError("");
      replaceOverrideUrl(URL.createObjectURL(editedBlob));
      await onSaved?.(data);
    } catch (saveError) {
      setEditError(saveError.response?.data?.message || "Die bearbeitete PDF konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  const fileName = document.fileName || document.originalFileName || `${document.title || "Paperless-Dokument"}.pdf`;
  const pageCount = pdf?.numPages || 0;

  return (
    <div className={`fixed inset-x-0 top-0 bottom-[var(--mobile-navigation-height,4rem)] z-50 flex flex-col border-slate-700 bg-slate-950/95 text-white backdrop-blur-sm sm:bottom-0 sm:right-0 sm:border-l ${SideBarCollapsed ? "sm:left-16 xl:left-20" : "sm:left-60"}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3 py-3 shadow-xl sm:px-5">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate font-semibold text-slate-100">{document.title || "Paperless-Dokument"}</h2>
          <p className="truncate text-xs text-slate-500">{fileName} · {sourceLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && <button type="button" disabled={saving || loading} onClick={editing ? saveAnnotations : () => { setEditError(""); setEditing(true); }} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 sm:text-sm ${editing ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-blue-700 bg-blue-950/40 text-blue-200 hover:bg-blue-900/50"}`}>
            <Icon className="size-4">{editing ? <><path d="M5 12.5 9.5 17 19 7.5"/></> : <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.5 7.5 3 3"/></>}</Icon>
            {saving ? "Speichert …" : editing ? "Speichern" : "Bearbeiten"}
          </button>}
          <a href={url} download={fileName} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 sm:text-sm">
            <Icon className="size-4"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></Icon>
            <span className="hidden sm:inline">Herunterladen</span>
          </a>
          <button ref={closeButtonRef} type="button" onClick={requestClose} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 sm:text-sm">
            <Icon className="size-4"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></Icon>
            Schließen
          </button>
        </div>
      </header>

      {editing && <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
        <button type="button" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${tool === "pen" ? "border-blue-500 bg-blue-950 text-blue-200" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}><Icon className="size-4"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/></Icon>Stift</button>
        <button type="button" aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")} className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${tool === "eraser" ? "border-blue-500 bg-blue-950 text-blue-200" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}><Icon className="size-4"><path d="m7 21-4-4 10-10 4 4L7 21Z"/><path d="m10 10 4 4"/><path d="M7 21h13"/></Icon>Radierer</button>
        <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300"><span>Stärke</span><input type="range" min="2" max="8" step="1" value={penWidth} onChange={event => setPenWidth(Number(event.target.value))} className="w-20 accent-blue-500"/><span className="w-4 text-right">{penWidth}</span></label>
        <button type="button" disabled={!(annotations[pageNumber] || []).length} onClick={undoCurrentPage} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30">Rückgängig</button>
        <button type="button" disabled={!(annotations[pageNumber] || []).length} onClick={() => setAnnotations(current => ({ ...current, [pageNumber]: [] }))} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30">Seite leeren</button>
        <button type="button" onClick={cancelEditing} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800">Abbrechen</button>
        <span className="basis-full text-center text-[11px] text-slate-500">Mit Stift oder Maus unterschreiben. Der Radierer entfernt berührte Linien vollständig.</span>
        {editError && <span role="alert" className="basis-full text-center text-xs text-red-300">{editError}</span>}
      </div>}

      {!isImage && <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <button type="button" disabled={!pdf || pageNumber <= 1} onClick={() => setPageNumber(current => Math.max(1, current - 1))} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30" aria-label="Vorherige Seite">
          <Icon className="size-4"><path d="m15 18-6-6 6-6"/></Icon>
        </button>
        <span className="min-w-24 text-center text-xs text-slate-300">{pageCount ? `Seite ${pageNumber} / ${pageCount}` : "PDF wird geladen"}</span>
        <button type="button" disabled={!pdf || pageNumber >= pageCount} onClick={() => setPageNumber(current => Math.min(pageCount, current + 1))} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30" aria-label="Nächste Seite">
          <Icon className="size-4"><path d="m9 18 6-6-6-6"/></Icon>
        </button>
        <span className="mx-1 h-6 w-px bg-slate-700" aria-hidden="true" />
        <button type="button" disabled={!pdf || zoom <= 0.5} onClick={() => setZoom(current => Math.max(0.5, current - 0.25))} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30" aria-label="Verkleinern">
          <Icon className="size-4"><path d="M5 12h14"/></Icon>
        </button>
        <span className="w-12 text-center text-xs text-slate-300">{Math.round(zoom * 100)} %</span>
        <button type="button" disabled={!pdf || zoom >= 2.25} onClick={() => setZoom(current => Math.min(2.25, current + 0.25))} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-30" aria-label="Vergrößern">
          <Icon className="size-4"><path d="M5 12h14"/><path d="M12 5v14"/></Icon>
        </button>
      </div>}

      <main ref={viewerRef} className="relative min-h-0 flex-1 overflow-auto bg-slate-950 p-4 sm:p-6" aria-busy={loading || rendering}>
        {loading && <div className="absolute inset-0 z-10 grid place-items-center"><div className="rounded-xl border border-slate-700 bg-slate-900/95 px-6 py-5 text-center shadow-2xl"><span className="mx-auto block size-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400"/><p className="mt-3 text-sm text-slate-300">{readableProgress(loadedBytes)}</p></div></div>}
        {error && <div className="mx-auto mt-8 max-w-lg rounded-xl border border-red-900 bg-red-950/40 p-5 text-center"><p role="alert" className="text-sm text-red-300">{error}</p><a href={url} download={fileName} className="mt-4 inline-flex rounded-lg border border-red-800 px-4 py-2 text-sm text-red-200 hover:bg-red-950">Datei stattdessen herunterladen</a></div>}
        {!error && isImage && <img src={url} alt={document.title || fileName} onLoad={() => setLoading(false)} onError={() => { setError("Das Bild konnte nicht geladen werden."); setLoading(false); }} className={`mx-auto max-h-full max-w-full rounded-sm bg-white object-contain shadow-2xl transition-opacity ${loading ? "opacity-60" : "opacity-100"}`} />}
        {!error && !isImage && <div className="relative mx-auto" style={{ width: canvasSize.width || undefined, height: canvasSize.height || undefined }}><canvas ref={canvasRef} className={`rounded-sm bg-white shadow-2xl transition-opacity ${loading || rendering ? "opacity-60" : "opacity-100"}`} aria-label={`Seite ${pageNumber} von ${pageCount || "unbekannt"}`} />{editing && canvasSize.width > 0 && <canvas ref={annotationCanvasRef} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={event => event.buttons === 0 && stopDrawing(event)} className={`absolute inset-0 rounded-sm ${tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}`} style={{ touchAction: "none" }} aria-label={`Unterschrift auf Seite ${pageNumber} zeichnen`} />}</div>}
      </main>
    </div>
  );
}
