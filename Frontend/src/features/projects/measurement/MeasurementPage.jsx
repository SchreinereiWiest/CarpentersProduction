import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { createProjectPDF } from "@EngineBrowser/project-pdf/createProjectPDF.js";
import { measurementViewSvgDataUrl } from "@EngineBrowser/project-pdf/measurementViewSvgRenderer.js";
import { useNavigate, useParams } from "react-router";
import { createMeasurementPrintDocuments } from "@EngineBrowser/measurement-pdf/createMeasurementPDF.js";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import MobileWorkspaceGuard from "../../../shared/components/MobileWorkspaceGuard.jsx";
import useCompanySettings from "../../../shared/hooks/useCompanySettings.js";
import {
  getProjectAssetBlob,
  getProjectAssetUrl,
  storeLocalProjectAsset
} from "../../../shared/cache/project-asset-cache.js";
import {
  getProjectFile,
  invalidateProjectFileCache,
  uploadProjectFile
} from "../../../shared/cache/project-cache.js";
import { getGlobalFile } from "../../../shared/cache/global-cache.js";
import {
  downloadFile,
  uploadJSONFile
} from "../../../shared/api/file-api.js";
import AufmasEditor from "./components/editor/AufmasEditor.jsx";
import AufmasIcon from "./components/common/AufmasIcon.jsx";
import {
  ObjectOverviewPanel,
  ProgressPanel,
  PropertiesPanel,
  ToolPanel,
  ViewStrip
} from "./components/panels/AufmasPanels.jsx";
import {
  DEFAULT_DISPLAY,
  DEFAULT_TODOS,
  DEFAULT_VIEWS,
  ensureWorkspaceViews
} from "./config/defaults.js";
import { parseDxf } from "./import/dxf.js";
import { renderPdfPages } from "./import/pdf.js";
import { isListedAufmasObject } from "./domain/objects.js";
import {
  getAufmasWorkspaceCache,
  setAufmasWorkspaceCache
} from "./state/workspaceCache.js";
import { mimeFromFile, viewNameForPage } from "./utils/fileMetadata.js";
import ImagesView from "./views/images/ImagesView.jsx";
import { isProjectImageFile } from "./views/images/projectImages.js";
import ExposeView from "./views/expose/ExposeView.jsx";
import AufmasThreeView from "./views/three/AufmasThreeView.jsx";
import MeasurementReviewDialog from "./components/review/MeasurementReviewDialog.jsx";
import { getProjectRecord } from "../../../shared/projects/project-records.js";
import {
  getLocalProject,
  saveLocalProject
} from "../../../shared/offline/local-projects.js";
import {
  DEFAULT_EXPOSE,
  normalizeExpose
} from "./expose/exposeDefaults.js";
import { appendPartsListPDF } from "../part-list/createPDF.js";

const imageDimensions = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    image.onerror = () => reject(new Error("Bildabmessungen konnten nicht gelesen werden."));
    image.src = source;
  });

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Bild konnte nicht für den PDF-Druck gelesen werden."));
    reader.readAsDataURL(blob);
  });

const safePdfName = (value) =>
  String(value || "projekt")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "projekt";

export default function AufmasWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { settings: companySettings } = useCompanySettings();
  const cachedWorkspace = useMemo(
    () => getAufmasWorkspaceCache(projectId),
    [projectId]
  );
  const [project, setProject] = useState(
    () => cachedWorkspace?.project ?? null
  );
  const [views, setViews] = useState(
    () => ensureWorkspaceViews(cachedWorkspace?.views)
  );
  const [objects, setObjects] = useState(() => cachedWorkspace?.objects ?? []);
  const [variables, setVariables] = useState(
    () => cachedWorkspace?.variables ?? []
  );
  const [todos, setTodos] = useState(
    () => cachedWorkspace?.todos ?? DEFAULT_TODOS
  );
  const [expose, setExpose] = useState(
    () => normalizeExpose(cachedWorkspace?.expose ?? DEFAULT_EXPOSE)
  );
  const [activeViewId, setActiveViewId] = useState(
    () => cachedWorkspace?.activeViewId ?? DEFAULT_VIEWS[0].id
  );
  const [exposeImageTarget, setExposeImageTarget] = useState(null);
  const [exposeReturnFocus, setExposeReturnFocus] = useState(null);
  const [selectedId, setSelectedId] = useState(
    () => cachedWorkspace?.selectedId ?? null
  );
  const [activeTool, setActiveTool] = useState(
    () => cachedWorkspace?.activeTool ?? "measurement"
  );
  const [display, setDisplay] = useState(() => ({
    ...DEFAULT_DISPLAY,
    ...(cachedWorkspace?.display ?? {}),
    objectLabels:
      cachedWorkspace?.display?.objectLabels ??
      cachedWorkspace?.display?.pointLabels ??
      true
  }));
  const [pdfPages, setPdfPages] = useState(
    () => cachedWorkspace?.pdfPages ?? {}
  );
  const [dxfLayers, setDxfLayers] = useState(
    () => cachedWorkspace?.dxfLayers ?? {}
  );
  const [photos, setPhotos] = useState(() => cachedWorkspace?.photos ?? []);
  const [cabinets, setCabinets] = useState(
    () => cachedWorkspace?.cabinets ?? []
  );
  const [partsList, setPartsList] = useState(
    () => cachedWorkspace?.partsList ?? []
  );
  const [materials, setMaterials] = useState([]);
  const [partsListPdfPages, setPartsListPdfPages] = useState([]);
  const [nesting, setNesting] = useState(
    () => cachedWorkspace?.nesting ?? []
  );
  const [isCompleted, setIsCompleted] = useState(() =>
    Boolean(cachedWorkspace?.isCompleted)
  );
  const [hydrated, setHydrated] = useState(() => Boolean(cachedWorkspace));
  const [loading, setLoading] = useState(() => !cachedWorkspace);
  const [importing, setImporting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printingExpose, setPrintingExpose] = useState(false);
  const [viewsCollapsed, setViewsCollapsed] = useState(false);
  const [measurementScans, setMeasurementScans] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(
    () => cachedWorkspace?.saveStatus ?? (cachedWorkspace ? "saved" : "loading")
  );
  const [notice, setNotice] = useState(null);
  const lastSavedPayload = useRef(
    cachedWorkspace
      ? JSON.stringify({
          version: 1,
          views: cachedWorkspace.views ?? DEFAULT_VIEWS,
          objects: cachedWorkspace.objects ?? [],
          variables: cachedWorkspace.variables ?? [],
          todos: cachedWorkspace.todos ?? DEFAULT_TODOS,
          expose: normalizeExpose(cachedWorkspace.expose ?? DEFAULT_EXPOSE),
          completed: Boolean(cachedWorkspace.isCompleted)
        })
      : ""
  );

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0];
  const activeObjects = useMemo(
    () => objects.filter((object) => object.viewId === activeView?.id),
    [activeView?.id, objects]
  );
  const listedObjects = useMemo(
    () => objects.filter(isListedAufmasObject),
    [objects]
  );
  const activeListedObjects = useMemo(
    () => activeObjects.filter(isListedAufmasObject),
    [activeObjects]
  );
  const selected =
    activeObjects.find((object) => object.id === selectedId) ?? null;
  const activeImage = activeView?.imageFileId
    ? photos.find((photo) => photo.id === activeView.imageFileId)
    : null;
  const activePlanPage = useMemo(
    () =>
      activeView?.planFileId
        ? pdfPages[`${activeView.planFileId}:${activeView.pageNumber || 1}`]
        : activeImage
          ? { dataUrl: activeImage.url, imageFileId: activeImage.id }
          : null,
    [activeImage, activeView, pdfPages]
  );
  const activeDxf = dxfLayers[activeView?.id] ?? { shapes: [], snapPoints: [] };

  const showNotice = useCallback((message, type = "info") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadMeasurementScans = useCallback(async () => {
    try {
      if (await getLocalProject(projectId)) {
        setMeasurementScans([]);
        return;
      }

      const { data } = await axios.get(
        `/api/measurement-ocr/projects/${projectId}/scans`
      );
      setMeasurementScans(data.scans ?? []);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.warn("Aufmaß-Scans konnten nicht geladen werden", error);
      }
    }
  }, [projectId]);

  useEffect(() => {
    const initial = window.setTimeout(loadMeasurementScans, 0);
    const interval = window.setInterval(loadMeasurementScans, 12_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loadMeasurementScans]);

  useEffect(() => {
    if (cachedWorkspace) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [loadedProject, saved] = await Promise.all([
          getProjectRecord(projectId),
          getProjectFile({
            projectId,
            file: "aufmas.json",
            loadFromServer: {
              download: downloadFile,
              path: `/api/projects/generated/${projectId}/aufmas`
            }
          }).catch((error) => {
            if (
              error.response?.status !== 404 &&
              error.code !== "OFFLINE_RESOURCE_UNAVAILABLE"
            )
              console.warn("Aufmaßdaten konnten nicht geladen werden", error);
            return null;
          })
        ]);
        if (cancelled) return;
        setProject(loadedProject);
        if (saved) {
          const loadedViews = ensureWorkspaceViews(saved.views);
          setViews(loadedViews);
          setObjects(Array.isArray(saved.objects) ? saved.objects : []);
          setVariables(Array.isArray(saved.variables) ? saved.variables : []);
          setTodos(Array.isArray(saved.todos) ? saved.todos : DEFAULT_TODOS);
          setExpose(normalizeExpose(saved.expose));
          setIsCompleted(Boolean(saved.completed));
          setActiveViewId(loadedViews[0].id);
          lastSavedPayload.current = JSON.stringify({
            version: 1,
            views: loadedViews,
            objects: saved.objects ?? [],
            variables: saved.variables ?? [],
            todos: saved.todos ?? DEFAULT_TODOS,
            expose: normalizeExpose(saved.expose),
            completed: Boolean(saved.completed)
          });
        }
        setSaveStatus("saved");
      } catch (error) {
        console.error("Aufmaß konnte nicht initialisiert werden", error);
        showNotice(
          "Projekt und Aufmaßdaten konnten nicht geladen werden.",
          "error"
        );
        setSaveStatus("error");
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [cachedWorkspace, projectId, showNotice]);

  useEffect(() => {
    let cancelled = false;
    const refreshProject = async () => {
      try {
        const latestProject = await getProjectRecord(projectId);
        if (!cancelled && latestProject) setProject(latestProject);
      } catch (error) {
        console.warn("Projektbilder konnten nicht aktualisiert werden", error);
      }
    };

    // A cached workspace may still contain the project state from before an
    // upload in Project Settings. Refresh it immediately and whenever the app
    // regains focus so the image library follows the actual project files.
    if (cachedWorkspace) void refreshProject();
    window.addEventListener("focus", refreshProject);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshProject);
    };
  }, [cachedWorkspace, projectId]);

  useEffect(() => {
    let cancelled = false;
    const loadGenerated = async (file) => getProjectFile({
        projectId,
        file: `${file}.json`,
        loadFromServer: {
          download: downloadFile,
          path: `/api/projects/generated/${projectId}/${file}`
        }
      }).catch((error) => {
        if (
          error.response?.status !== 404 &&
          error.code !== "OFFLINE_RESOURCE_UNAVAILABLE"
        ) {
          console.warn(`${file}.json konnte nicht geladen werden`, error);
        }
        return null;
      });
    Promise.all([
      loadGenerated("cabinet"),
      loadGenerated("list"),
      loadGenerated("nesting")
    ]).then(([loadedCabinets, loadedPartsList, loadedNesting]) => {
      if (cancelled) return;
      if (Array.isArray(loadedCabinets)) setCabinets(loadedCabinets);
      if (Array.isArray(loadedPartsList)) setPartsList(loadedPartsList);
      if (Array.isArray(loadedNesting)) setNesting(loadedNesting);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    axios.get("/api/materials/get")
      .then((response) => {
        if (!cancelled) setMaterials(Array.isArray(response.data?.materials) ? response.data.materials : []);
      })
      .catch((error) => console.warn("Materialien für die Exposé-Vorschau konnten nicht geladen werden", error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const renderPartsList = async () => {
      if (!partsList.length) return [];
      const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      appendPartsListPDF(document, partsList);
      return renderPdfPages(document.output("blob"));
    };
    renderPartsList()
      .then((pages) => {
        if (!cancelled) setPartsListPdfPages(pages);
      })
      .catch((error) => {
        console.warn("Teilelisten-Vorschau konnte nicht erzeugt werden", error);
        if (!cancelled) setPartsListPdfPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [partsList]);

  useEffect(() => {
    if (!hydrated) return;
    setAufmasWorkspaceCache(projectId, {
      project,
      views,
      objects,
      variables,
      todos,
      expose,
      activeViewId,
      selectedId,
      activeTool,
      display,
      pdfPages,
      dxfLayers,
      photos,
      cabinets,
      partsList,
      nesting,
      isCompleted,
      saveStatus
    });
  }, [
    activeTool,
    activeViewId,
    cabinets,
    display,
    dxfLayers,
    expose,
    hydrated,
    isCompleted,
    nesting,
    objects,
    pdfPages,
    photos,
    partsList,
    project,
    projectId,
    saveStatus,
    selectedId,
    todos,
    variables,
    views
  ]);

  useEffect(() => {
    const updateSaveStatus = (event) => {
      if (event.detail?.projectId === projectId)
        setSaveStatus(event.detail.status);
    };
    window.addEventListener("aufmas-workspace-save-status", updateSaveStatus);
    return () =>
      window.removeEventListener(
        "aufmas-workspace-save-status",
        updateSaveStatus
      );
  }, [projectId]);

  useEffect(() => {
    if (!project?.files) return;
    let cancelled = false;
    const loadPhotos = async () => {
      const imageFiles = project.files.filter(isProjectImageFile);
      const loaded = await Promise.all(
        imageFiles.map(async (file) => {
          try {
            return { ...file, url: await getProjectAssetUrl(file) };
          } catch (error) {
            console.warn(`${file.fileName} konnte nicht geladen werden`, error);
            return null;
          }
        })
      );
      if (!cancelled) setPhotos(loaded.filter(Boolean));
    };
    loadPhotos().catch((error) =>
      console.warn("Projektbilder konnten nicht geladen werden", error)
    );
    return () => {
      cancelled = true;
    };
  }, [project?.files]);

  useEffect(() => {
    if (!activeView?.planFileId || activePlanPage || !project?.files) return;
    let cancelled = false;
    const loadPlan = async () => {
      const file = project.files.find(
        (item) => item.id === activeView.planFileId
      );
      if (!file) return;
      const blob = await getProjectAssetBlob(file);
      const pages = await renderPdfPages(blob);
      if (cancelled) return;
      setPdfPages((current) => {
        const next = { ...current };
        pages.forEach((page) => {
          next[`${file.id}:${page.pageNumber}`] = page;
        });
        return next;
      });
    };
    loadPlan().catch((error) => {
      console.error("PDF-Plan konnte nicht gerendert werden", error);
      showNotice("Der PDF-Plan konnte nicht dargestellt werden.", "error");
    });
    return () => {
      cancelled = true;
    };
  }, [activePlanPage, activeView?.planFileId, project?.files, showNotice]);

  useEffect(() => {
    if (activeView?.type !== "expose" || !project?.files) return;
    const missingFileIds = [...new Set(
      views
        .filter((view) =>
          view.planFileId &&
          !pdfPages[`${view.planFileId}:${view.pageNumber || 1}`]
        )
        .map((view) => view.planFileId)
    )];
    if (!missingFileIds.length) return;
    let cancelled = false;
    Promise.all(missingFileIds.map(async (fileId) => {
      const file = project.files.find((candidate) => candidate.id === fileId);
      if (!file) return [];
      return renderPdfPages(await getProjectAssetBlob(file));
    }))
      .then((pageGroups) => {
        if (cancelled) return;
        setPdfPages((current) => {
          const next = { ...current };
          pageGroups.forEach((pages, groupIndex) => {
            const fileId = missingFileIds[groupIndex];
            pages.forEach((page) => {
              next[`${fileId}:${page.pageNumber}`] = page;
            });
          });
          return next;
        });
      })
      .catch((error) => {
        console.warn("Exposé-Ansichten konnten nicht vollständig vorbereitet werden", error);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView?.type, pdfPages, project?.files, views]);

  useEffect(() => {
    if (!activeView?.dxfFileId || dxfLayers[activeView.id] || !project?.files)
      return;
    let cancelled = false;
    const loadDxf = async () => {
      const file = project.files.find(
        (item) => item.id === activeView.dxfFileId
      );
      if (!file) return;
      const blob = await getProjectAssetBlob(file);
      const parsed = parseDxf(await blob.text());
      if (!cancelled)
        setDxfLayers((current) => ({ ...current, [activeView.id]: parsed }));
    };
    loadDxf().catch((error) => {
      console.error("DXF konnte nicht gelesen werden", error);
      showNotice("Das DXF-Raster konnte nicht gelesen werden.", "error");
    });
    return () => {
      cancelled = true;
    };
  }, [
    activeView?.dxfFileId,
    activeView?.id,
    dxfLayers,
    project?.files,
    showNotice
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      version: 1,
      views,
      objects,
      variables,
      todos,
      expose,
      completed: isCompleted
    };
    const serialised = JSON.stringify(payload);
    if (serialised === lastSavedPayload.current) return;
    setSaveStatus("saving");
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await uploadProjectFile({
          projectId,
          file: "aufmas.json",
          data: payload,
          uploadFunction: {
            upload: uploadJSONFile,
            path: `/api/projects/generated/${projectId}/aufmas`
          }
        });
        lastSavedPayload.current = serialised;
        setSaveStatus(result?.status === "pending" ? "local" : "saved");
      } catch (error) {
        console.error("Aufmaßdaten konnten nicht gespeichert werden", error);
        setSaveStatus("error");
      }
    }, 750);
    return () => window.clearTimeout(timeoutId);
  }, [expose, hydrated, isCompleted, objects, projectId, todos, variables, views]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(
        event.target?.tagName
      );
      if (event.key === "Escape") {
        setActiveTool(null);
        return;
      }
      if (isCompleted) return;
      if (isTyping || ["three", "images", "expose"].includes(activeView?.type)) return;
      const tool = {
        m: "measurement",
        w: "angle",
        p: "point",
        k: "cabinet",
        h: "guide"
      }[event.key.toLowerCase()];
      if (tool) setActiveTool(tool);
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        setObjects((current) =>
          current.filter((object) => object.id !== selectedId)
        );
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView?.type, isCompleted, selectedId]);

  const uploadProjectAsset = async (file) => {
    const localProject = await getLocalProject(projectId);
    if (localProject) {
      const fileEntry = await storeLocalProjectAsset(projectId, file);
      const updatedProject = await saveLocalProject({
        ...localProject,
        files: [...(localProject.files ?? []), fileEntry]
      });
      setProject(updatedProject);
      return fileEntry;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityId", projectId);
    formData.append("entity", "project");
    formData.append("fileName", file.name);
    formData.append("mimeType", mimeFromFile(file));
    formData.append("fileSize", file.size);
    const { data } = await axios.post("/api/files/upload", formData);
    const fileEntry = data.fileEntry;
    setProject((current) =>
      current
        ? { ...current, files: [...(current.files ?? []), fileEntry] }
        : current
    );
    return fileEntry;
  };

  const importPdf = async (file) => {
    setImporting(true);
    try {
      const [pages, fileEntry] = await Promise.all([
        renderPdfPages(file),
        uploadProjectAsset(file)
      ]);
      setPdfPages((current) => {
        const next = { ...current };
        pages.forEach((page) => {
          next[`${fileEntry.id}:${page.pageNumber}`] = page;
        });
        return next;
      });
      setViews((current) => {
        const drawingViews = current.filter(
          (view) => !["three", "images", "expose"].includes(view.type)
        );
        const specialViews = current.filter((view) =>
          ["three", "images", "expose"].includes(view.type)
        );
        const nextDrawingViews = [...drawingViews];
        pages.forEach((page, index) => {
          if (nextDrawingViews[index]) {
            nextDrawingViews[index] = {
              ...nextDrawingViews[index],
              label: viewNameForPage(
                page.pageNumber,
                nextDrawingViews[index].label
              ),
              planFileId: fileEntry.id,
              imageFileId: null,
              pageNumber: page.pageNumber,
              pdfSnapPoints: [],
              pdfSnapStats: null,
              measurementScale: null
            };
          } else {
            nextDrawingViews.push({
              id: `pdf-${fileEntry.id}-${page.pageNumber}`,
              label: viewNameForPage(page.pageNumber),
              type: "elevation",
              planFileId: fileEntry.id,
              dxfFileId: null,
              pageNumber: page.pageNumber,
              pdfSnapPoints: [],
              pdfSnapStats: null,
              measurementScale: null
            });
          }
        });
        return [...nextDrawingViews, ...specialViews];
      });
      setActiveViewId((current) =>
        ["three", "images", "expose"].includes(current) ? DEFAULT_VIEWS[0].id : current
      );
      showNotice(
        `${pages.length} PDF-Seite${pages.length === 1 ? "" : "n"} als Ansichten importiert.`
      );
    } catch (error) {
      console.error("PDF-Import fehlgeschlagen", error);
      showNotice("PDF konnte nicht importiert werden.", "error");
    } finally {
      setImporting(false);
    }
  };

  const importDxf = async (file) => {
    if (!activeView || ["three", "images", "expose"].includes(activeView.type)) return;
    setImporting(true);
    try {
      const [parsed, fileEntry] = await Promise.all([
        file.text().then(parseDxf),
        uploadProjectAsset(file)
      ]);
      if (!parsed.shapes.length)
        throw new Error("Keine unterstützten DXF-Elemente gefunden");
      setDxfLayers((current) => ({ ...current, [activeView.id]: parsed }));
      setViews((current) =>
        current.map((view) =>
          view.id === activeView.id
            ? { ...view, dxfFileId: fileEntry.id }
            : view
        )
      );
      const filteredCopy = parsed.snapStats?.candidates
        ? ` (${parsed.snapStats.candidates} Linienknoten geprüft)`
        : "";
      showNotice(
        `${parsed.snapPoints.length} Fangpunkte aus DXF erkannt${filteredCopy}.`
      );
    } catch (error) {
      console.error("DXF-Import fehlgeschlagen", error);
      showNotice(
        error.message === "Keine unterstützten DXF-Elemente gefunden"
          ? error.message
          : "DXF konnte nicht importiert werden.",
        "error"
      );
    } finally {
      setImporting(false);
    }
  };

  const uploadPhoto = async (file) => {
    setUploadingPhoto(true);
    try {
      const fileEntry = await uploadProjectAsset(file);
      const url = await getProjectAssetUrl(fileEntry);
      setPhotos((current) => [...current, { ...fileEntry, url }]);
      showNotice("Baustellenfoto wurde dem Projekt hinzugefügt.");
    } catch (error) {
      console.error("Foto-Upload fehlgeschlagen", error);
      showNotice("Foto konnte nicht hochgeladen werden.", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const preparePrintAssets = async () => {
    const drawingViews = views.filter(
      (view) => !["three", "images", "expose"].includes(view.type)
    );
    const nextPdfPages = { ...pdfPages };
    const nextDxfLayers = { ...dxfLayers };
    const files = project?.files ?? [];

    const missingPdfIds = [
      ...new Set(
        drawingViews
          .filter(
            (view) =>
              view.planFileId &&
              !nextPdfPages[`${view.planFileId}:${view.pageNumber || 1}`]
          )
          .map((view) => view.planFileId)
      )
    ];
    await Promise.all(
      missingPdfIds.map(async (fileId) => {
        const file = files.find((candidate) => candidate.id === fileId);
        if (!file) throw new Error("Eine verknüpfte PDF-Datei fehlt im Projekt.");
        const pages = await renderPdfPages(await getProjectAssetBlob(file));
        pages.forEach((page) => {
          nextPdfPages[`${fileId}:${page.pageNumber}`] = page;
        });
      })
    );

    await Promise.all(
      drawingViews
        .filter((view) => view.dxfFileId && !nextDxfLayers[view.id])
        .map(async (view) => {
          const file = files.find((candidate) => candidate.id === view.dxfFileId);
          if (!file) throw new Error("Eine verknüpfte DXF-Datei fehlt im Projekt.");
          nextDxfLayers[view.id] = parseDxf(
            await (await getProjectAssetBlob(file)).text()
          );
        })
    );

    const planPages = {};
    await Promise.all(
      drawingViews.map(async (view) => {
        if (view.planFileId) {
          planPages[view.id] =
            nextPdfPages[`${view.planFileId}:${view.pageNumber || 1}`] ?? null;
          return;
        }
        if (view.imageFileId) {
          const photo = photos.find((candidate) => candidate.id === view.imageFileId);
          if (!photo) return;
          const dataUrl = await blobToDataUrl(await getProjectAssetBlob(photo));
          const dimensions = await imageDimensions(dataUrl);
          planPages[view.id] = { dataUrl, ...dimensions };
        }
      })
    );
    setPdfPages(nextPdfPages);
    setDxfLayers(nextDxfLayers);
    return { planPages, dxfLayers: nextDxfLayers };
  };

  const printMeasurement = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const assets = await preparePrintAssets();
      const result = await createMeasurementPrintDocuments({
        jsPDF,
        encodeQr: (value) =>
          QRCode.toDataURL(value, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 512,
            color: { dark: "#000000", light: "#ffffff" }
          }),
        projectId,
        projectName: project?.title || project?.name || "Projekt",
        views,
        objects,
        planPages: assets.planPages,
        dxfLayers: assets.dxfLayers,
        measurementLabelSizePercent:
          companySettings.userInterface?.measurementLabelSizePercent ?? 100,
        measurementLabelOffsetY:
          companySettings.userInterface?.measurementLabelOffsetY ?? -30,
        measurementFormFieldWidthMm:
          companySettings.userInterface?.measurementFormFieldWidthMm ?? 32,
        measurementFormFieldHeightMm:
          companySettings.userInterface?.measurementFormFieldHeightMm ?? 10
      });
      if (!project?.localOnly) {
        await axios.post("/api/measurement-ocr/print-runs", {
          projectId,
          layout: result.layout,
          generatedAt: new Date().toISOString()
        });
      }
      const baseName = safePdfName(project?.title || project?.name);
      result.documented.save(`${baseName}-aufmass-dokumentiert.pdf`);
      result.fieldSheet.save(`${baseName}-aufmass-formular.pdf`);
      showNotice(
        `Zwei Aufmaß-PDFs mit ${result.layout.pages.length} Seite${result.layout.pages.length === 1 ? "" : "n"} wurden erstellt.`
      );
    } catch (error) {
      console.error("Aufmaß-PDFs konnten nicht erstellt werden", error);
      showNotice(
        error.response?.data?.message ||
          error.message ||
          "Aufmaß-PDFs konnten nicht erstellt werden.",
        "error"
      );
    } finally {
      setPrinting(false);
    }
  };

  const printExpose = async () => {
    if (printingExpose) return;
    setPrintingExpose(true);
    try {
      const [assets, materialResponse, cncSettings] = await Promise.all([
        preparePrintAssets(),
        axios.get("/api/materials/get").catch(() => ({ data: { materials: [] } })),
        getGlobalFile({
          file: "settings-cnc.json",
          loadFromServer: { download: downloadFile, path: "/api/settings/cnc" }
        }).catch(() => null)
      ]);
      const printablePhotos = photos.filter((photo) =>
        photo.category !== "production-attachment" &&
        photo.category !== "measurement-image"
      );
      const printableIds = new Set(printablePhotos.map((photo) => String(photo.id)));
      const customImageAssets = (await Promise.all(photos.map(async (photo) => {
        try {
          return {
            id: photo.id,
            label: photo.fileName,
            name: photo.fileName,
            blob: await getProjectAssetBlob(photo)
          };
        } catch (error) {
          console.warn(`${photo.fileName || "Projektbild"} konnte nicht geladen werden`, error);
          return null;
        }
      }))).filter(Boolean);
      const images = customImageAssets
        .filter((asset) => printableIds.has(String(asset.id)))
        .map((asset, index) => ({ ...asset, label: `Perspektive ${index + 1}` }));
      const viewAssets = views
        .filter((view) => !["three", "images", "expose"].includes(view.type))
        .map((view, index) => {
          const page = assets.planPages[view.id];
          return {
            id: view.id,
            label: view.type === "floor" ? "Grundriss" : `Ansicht ${index + 1}`,
            name: view.label,
            dataUrl: measurementViewSvgDataUrl({
              view,
              objects,
              planPage: page,
              dxf: assets.dxfLayers[view.id],
              measurementLabelOffsetY:
                companySettings.userInterface?.measurementLabelOffsetY ?? -30
            }),
            width: 1000,
            height: 650,
            format: "SVG"
          };
        });
      const result = await createProjectPDF({
        createDocument: () => new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }),
        project,
        customer: project?.customer,
        images,
        customImageAssets,
        viewAssets,
        cabinets,
        partsList,
        nesting,
        materials: materialResponse.data?.materials ?? [],
        cncConfig: cncSettings?.cncDefault ?? cncSettings ?? undefined,
        expose,
        companySettings,
        appendPartsList: appendPartsListPDF
      });
      showNotice(result.warnings.length
        ? `Exposé erstellt. ${result.warnings.length} Inhalt${result.warnings.length === 1 ? "" : "e"} konnte${result.warnings.length === 1 ? "" : "n"} nicht eingebettet werden.`
        : "Das druckbare Exposé wurde erstellt.");
    } catch (error) {
      console.error("Exposé-PDF konnte nicht erstellt werden", error);
      showNotice(error.message || "Exposé-PDF konnte nicht erstellt werden.", "error");
    } finally {
      setPrintingExpose(false);
    }
  };

  const reloadAppliedMeasurements = async () => {
    await invalidateProjectFileCache({ projectId, file: "aufmas.json" });
    const saved = await getProjectFile({
      projectId,
      file: "aufmas.json",
      loadFromServer: {
        download: downloadFile,
        path: `/api/projects/generated/${projectId}/aufmas`
      }
    });
    if (!saved) return;
    const loadedViews = ensureWorkspaceViews(saved.views);
    const loadedObjects = Array.isArray(saved.objects) ? saved.objects : [];
    const loadedVariables = Array.isArray(saved.variables) ? saved.variables : [];
    const loadedTodos = Array.isArray(saved.todos) ? saved.todos : DEFAULT_TODOS;
    const loadedExpose = normalizeExpose(saved.expose);
    setViews(loadedViews);
    setObjects(loadedObjects);
    setVariables(loadedVariables);
    setTodos(loadedTodos);
    setExpose(loadedExpose);
    setIsCompleted(Boolean(saved.completed));
    lastSavedPayload.current = JSON.stringify({
      version: 1,
      views: loadedViews,
      objects: loadedObjects,
      variables: loadedVariables,
      todos: loadedTodos,
      expose: loadedExpose,
      completed: Boolean(saved.completed)
    });
    showNotice("Die bestätigten OCR-Maße wurden als gemessen übernommen.");
  };

  const createViewFromPhoto = (photo, name) => {
    if (isCompleted || !photo?.id) return;
    const label = String(name || "").trim();
    if (!label) return;
    const viewId = `image-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const imageView = {
      id: viewId,
      label,
      type: "elevation",
      imageFileId: photo.id,
      planFileId: null,
      dxfFileId: null,
      pageNumber: 1,
      pdfSnapPoints: [],
      pdfSnapStats: null,
      measurementScale: null
    };

    setViews((current) => {
      const firstSpecialView = current.findIndex((view) =>
        ["three", "images", "expose"].includes(view.type)
      );
      if (firstSpecialView < 0) return [...current, imageView];
      return [
        ...current.slice(0, firstSpecialView),
        imageView,
        ...current.slice(firstSpecialView)
      ];
    });
    setActiveViewId(viewId);
    setSelectedId(null);
    setActiveTool("measurement");
    showNotice(`„${label}“ wurde als neue Ansicht hinzugefügt.`);
  };

  const exposeViewId = () => views.find((view) => view.type === "expose")?.id ?? "expose";
  const imagesViewId = () => views.find((view) => view.type === "images")?.id ?? "images";

  const requestExposeImage = (target) => {
    if (isCompleted || !target?.pageId || !target?.blockId) return;
    setExposeImageTarget(target);
    setExposeReturnFocus({ pageId: target.pageId, blockId: target.blockId });
    setActiveViewId(imagesViewId());
    setActiveTool(null);
  };

  const cancelExposeImageSelection = () => {
    setExposeImageTarget(null);
    setActiveViewId(exposeViewId());
    setActiveTool(null);
  };

  const selectExposeImage = (photo) => {
    if (!exposeImageTarget || !photo?.id) return;
    const target = exposeImageTarget;
    setExpose((currentValue) => {
      const current = normalizeExpose(currentValue);
      if (target.kind === "custom") {
        const pageBlocks = Array.isArray(current.customBlocks[target.pageId])
          ? current.customBlocks[target.pageId]
          : [];
        return {
          ...current,
          customBlocks: {
            ...current.customBlocks,
            [target.pageId]: pageBlocks.map((block) => block.id === target.blockId
              ? { ...block, imageId: String(photo.id) }
              : block)
          }
        };
      }
      return {
        ...current,
        imageOverrides: {
          ...current.imageOverrides,
          [target.pageId]: String(photo.id)
        }
      };
    });
    setExposeReturnFocus({ pageId: target.pageId, blockId: target.blockId });
    setExposeImageTarget(null);
    setActiveViewId(exposeViewId());
    setActiveTool(null);
    showNotice("Das Projektbild wurde in das Exposé eingesetzt.");
  };

  const createObject = (object) => {
    if (isCompleted) return;
    setObjects((current) => [...current, object]);
    setSelectedId(object.id);
  };

  const openCabinetEditor = (cabinetId) => {
    const payload = {
      version: 1,
      views,
      objects,
      variables,
      todos,
      expose,
      completed: isCompleted
    };
    setAufmasWorkspaceCache(projectId, {
      project,
      views,
      objects,
      variables,
      todos,
      expose,
      activeViewId,
      selectedId,
      activeTool,
      display,
      pdfPages,
      dxfLayers,
      photos,
      cabinets,
      partsList,
      nesting,
      isCompleted,
      saveStatus: "local"
    });
    const saveRequest = uploadProjectFile({
      projectId,
      file: "aufmas.json",
      data: payload,
      uploadFunction: {
        upload: uploadJSONFile,
        path: `/api/projects/generated/${projectId}/aufmas`
      }
    });
    void saveRequest
      .then((result) => {
        const status = result?.status === "pending" ? "local" : "saved";
        const latest = getAufmasWorkspaceCache(projectId);
        if (latest)
          setAufmasWorkspaceCache(projectId, { ...latest, saveStatus: status });
        window.dispatchEvent(
          new CustomEvent("aufmas-workspace-save-status", {
            detail: { projectId, status }
          })
        );
      })
      .catch((error) => {
        console.error(
          "Aufmaßdaten konnten vor dem Editorwechsel nicht gespeichert werden",
          error
        );
        const latest = getAufmasWorkspaceCache(projectId);
        if (latest)
          setAufmasWorkspaceCache(projectId, {
            ...latest,
            saveStatus: "error"
          });
        window.dispatchEvent(
          new CustomEvent("aufmas-workspace-save-status", {
            detail: { projectId, status: "error" }
          })
        );
      });
    navigate(
      `/Projects/Cabinet/${projectId}?cabinet=${encodeURIComponent(cabinetId)}`,
      {
        state: { returnTo: `/Projects/Aufmas/${projectId}` }
      }
    );
  };

  const changeView = (viewId) => {
    setActiveViewId(viewId);
    setSelectedId(null);
    const view = views.find((item) => item.id === viewId);
    setActiveTool(
      isCompleted || ["three", "images", "expose"].includes(view?.type)
        ? null
        : "measurement"
    );
  };

  const toggleCompleted = () => {
    setIsCompleted((current) => {
      const next = !current;
      setActiveTool(
        next || ["three", "images", "expose"].includes(activeView?.type)
          ? null
          : "measurement"
      );
      showNotice(
        next
          ? "Aufmaß abgeschlossen. Die Daten sind jetzt schreibgeschützt."
          : "Bearbeitungsmodus aktiviert."
      );
      return next;
    });
  };

  if (loading) {
    return (
      <div className="measurement-page flex h-dvh bg-[#10171e] text-white">
        <SideBar selected={2} />
        <main className="flex min-w-0 flex-1 flex-col">
          <ProjectBar selected={1} />
          <div className="flex flex-1 items-center justify-center text-sm text-[#8193a0]">
            Aufmaß wird vorbereitet …
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="measurement-page flex h-dvh w-full overflow-hidden bg-[#10171e] text-white">
      <SideBar selected={2} />
      <MobileWorkspaceGuard title="Aufmaß" />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="z-20 shrink-0 border-b border-[#2a3741] bg-[#172029]">
          <ProjectBar selected={1} />
        </div>
        <header data-tour="project-measurement-status" className="flex h-11 shrink-0 items-center justify-between border-b border-[#2a3741] bg-[#121a21] px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#728492]">
              Aufmaß
            </span>
            <span className="h-4 w-px bg-[#33424c]" />
            <span className="truncate text-xs font-medium text-[#b7c4cd]">
              {project?.title || project?.name || "Projekt"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-[#405769] bg-[#1b2b36] px-3 py-1.5 text-[11px] font-semibold text-[#bcd8e9] hover:bg-[#253d4d]"
            >
              <AufmasIcon name="measure" className="size-3.5" /> OCR prüfen
              {measurementScans.filter((scan) => scan.status === "review").length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-[#b06f2d] text-[9px] text-white">
                  {measurementScans.filter((scan) => scan.status === "review").length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-[#778a98]">
              <span
                className={`size-1.5 rounded-full ${saveStatus === "error" ? "bg-[#dc6f67]" : saveStatus === "saving" ? "bg-[#dba45d]" : "bg-[#5eb08f]"}`}
              />
              {saveStatus === "saving"
                ? "Wird gespeichert …"
                : saveStatus === "local"
                  ? "Lokal gespeichert"
                  : saveStatus === "error"
                    ? "Speichern fehlgeschlagen"
                    : "Gespeichert"}
            </div>
            <button
              type="button"
              onClick={toggleCompleted}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition ${isCompleted ? "border-[#4d7188] bg-[#213746] text-[#cce5f4] hover:bg-[#29495d]" : "border-[#47745f] bg-[#20382e] text-[#bfe3d2] hover:bg-[#29493b]"}`}
            >
              <AufmasIcon
                name={isCompleted ? "edit" : "check"}
                className="size-3.5"
              />
              {isCompleted ? "Bearbeiten" : "Aufmaß abschließen"}
            </button>
          </div>
        </header>

        <div className={`aufmas-shell grid min-h-0 flex-1 ${activeView?.type === "expose" ? "aufmas-shell--wide" : ""} ${viewsCollapsed ? "aufmas-shell--views-collapsed" : ""}`}>
          {activeView?.type !== "expose" && (isCompleted ? (
            <ObjectOverviewPanel
              activeView={activeView}
              objects={activeListedObjects}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <ToolPanel
              activeTool={activeTool}
              onToolChange={setActiveTool}
              display={display}
              onDisplayChange={setDisplay}
              activeView={activeView}
              objectCount={activeListedObjects.length}
            />
          ))}
          <section data-tour="project-measurement-canvas" className="min-h-0 min-w-0">
            {activeView?.type === "three" ? (
              <AufmasThreeView files={project?.files ?? []} />
            ) : activeView?.type === "images" ? (
              <ImagesView
                photos={photos}
                onUpload={uploadPhoto}
                onCreateView={createViewFromPhoto}
                uploading={uploadingPhoto}
                readOnly={isCompleted}
                selectionMode={Boolean(exposeImageTarget)}
                onSelectPhoto={selectExposeImage}
                onCancelSelection={cancelExposeImageSelection}
              />
            ) : activeView?.type === "expose" ? (
              <ExposeView
                value={expose}
                onChange={setExpose}
                project={project}
                photos={photos}
                views={views}
                pdfPages={pdfPages}
                objects={objects}
                dxfLayers={dxfLayers}
                cabinets={cabinets}
                partsList={partsList}
                partsListPdfPages={partsListPdfPages}
                nesting={nesting}
                materials={materials}
                companySettings={companySettings}
                readOnly={isCompleted}
                saveStatus={saveStatus}
                onPrint={printExpose}
                printing={printingExpose}
                onRequestImage={requestExposeImage}
                focusPageId={exposeReturnFocus?.pageId ?? null}
                focusBlockId={exposeReturnFocus?.blockId ?? null}
                lineLockThresholdCm={
                  companySettings.userInterface?.lineLockThresholdCm ?? 5
                }
                measurementLabelOffsetY={
                  companySettings.userInterface?.measurementLabelOffsetY ?? -30
                }
              />
            ) : (
              <AufmasEditor
                view={activeView}
                objects={activeObjects}
                selectedId={selectedId}
                onSelect={setSelectedId}
                activeTool={isCompleted ? null : activeTool}
                onCreate={createObject}
                display={display}
                dxf={activeDxf}
                planPage={activePlanPage}
                onImportPdf={importPdf}
                onImportDxf={importDxf}
                onPrint={printMeasurement}
                onUpdateView={(patch) =>
                  setViews((current) =>
                    current.map((view) =>
                      view.id === activeView.id ? { ...view, ...patch } : view
                    )
                  )
                }
                importing={importing}
                printing={printing}
                readOnly={isCompleted}
                showTips={companySettings.userInterface?.showTips !== false}
                lineLockThresholdCm={
                  companySettings.userInterface?.lineLockThresholdCm ?? 5
                }
                measurementLabelSizePercent={
                  companySettings.userInterface?.measurementLabelSizePercent ??
                  100
                }
                measurementLabelOffsetY={
                  companySettings.userInterface?.measurementLabelOffsetY ?? -30
                }
              />
            )}
          </section>
          {activeView?.type !== "expose" && <div data-tour="project-measurement-properties" className="aufmas-right-sidebar grid min-h-0 border-l border-[#2a3741] bg-[#172029]">
            <PropertiesPanel
              selected={selected}
              objects={activeListedObjects}
              cabinets={cabinets}
              onSelect={setSelectedId}
              onUpdate={(id, patch) =>
                setObjects((current) =>
                  current.map((object) =>
                    object.id === id ? { ...object, ...patch } : object
                  )
                )
              }
              onDelete={(id) => {
                setObjects((current) =>
                  current.filter((object) => object.id !== id)
                );
                setSelectedId(null);
              }}
              onOpenCabinet={openCabinetEditor}
              onPhotoUpload={uploadPhoto}
              uploadingPhoto={uploadingPhoto}
              readOnly={isCompleted}
            />
            <div className="min-h-0 border-t border-[#2a3741]">
              <ProgressPanel
                objects={listedObjects}
                todos={todos}
                onTodosChange={setTodos}
                readOnly={isCompleted}
              />
            </div>
          </div>}
          <div data-tour="project-measurement-views" className="aufmas-views min-h-0 border-t border-[#2a3741]">
            <ViewStrip
              views={views}
              activeViewId={activeViewId}
              onViewChange={changeView}
              objects={listedObjects}
              photos={photos}
              collapsed={viewsCollapsed}
              onToggleCollapsed={() => setViewsCollapsed((current) => !current)}
            />
          </div>
        </div>
      </main>

      {notice && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-xs shadow-2xl ${notice.type === "error" ? "border-[#70413f] bg-[#2d1c1d] text-[#f0aaa6]" : "border-[#3c5d70] bg-[#172a35] text-[#c4dfef]"}`}
          role="status"
        >
          <AufmasIcon
            name={notice.type === "error" ? "warning" : "check"}
            className="size-4"
          />{" "}
          {notice.message}
        </div>
      )}
      {reviewOpen && (
        <MeasurementReviewDialog
          scans={measurementScans}
          onClose={() => setReviewOpen(false)}
          onRefresh={loadMeasurementScans}
          onApplied={reloadAppliedMeasurements}
          canApply={saveStatus === "saved"}
        />
      )}
    </div>
  );
}
