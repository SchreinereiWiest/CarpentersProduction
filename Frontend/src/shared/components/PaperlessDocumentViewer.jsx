import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "../../app/providers/AppContext.js";

let pdfJsPromise;

const loadPdfJs = () => {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfJsPromise;
};

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

export default function PaperlessDocumentViewer({ document, library = false, contentUrl = "", sourceLabel = "direkt aus Paperless", onClose }) {
  const { SideBarCollapsed = true } = useApp() || {};
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(0);
  const [error, setError] = useState("");

  const url = document ? contentUrl || paperlessDocumentContentUrl(document, library) : "";
  const isImage = Boolean(contentUrl && document?.mimeType?.startsWith("image/"));

  useEffect(() => {
    if (!document) return undefined;
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setPageNumber(current => Math.max(1, current - 1));
      if (event.key === "ArrowRight") setPageNumber(current => Math.min(pdf?.numPages || current, current + 1));
    };
    const handleSidebarNavigation = event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (target?.closest(".app-sidebar a[href]")) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.document.addEventListener("click", handleSidebarNavigation);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.document.removeEventListener("click", handleSidebarNavigation);
    };
  }, [document, onClose, pdf?.numPages]);

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
        loadingTask = pdfjs.getDocument({ url, withCredentials: true });
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
      loadingTask?.destroy();
    };
  }, [isImage, url]);

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
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
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
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, viewerWidth, zoom]);

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
          <a href={url} download={fileName} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 sm:text-sm">
            <Icon className="size-4"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></Icon>
            <span className="hidden sm:inline">Herunterladen</span>
          </a>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 sm:text-sm">
            <Icon className="size-4"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></Icon>
            Schließen
          </button>
        </div>
      </header>

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
        {!error && !isImage && <canvas ref={canvasRef} className={`mx-auto rounded-sm bg-white shadow-2xl transition-opacity ${loading || rendering ? "opacity-60" : "opacity-100"}`} aria-label={`Seite ${pageNumber} von ${pageCount || "unbekannt"}`} />}
      </main>
    </div>
  );
}
