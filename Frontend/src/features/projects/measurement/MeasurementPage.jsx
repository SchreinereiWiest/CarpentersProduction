import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import MobileWorkspaceGuard from "../../../shared/components/MobileWorkspaceGuard.jsx";
import {
  getProjectAssetBlob,
  getProjectAssetUrl
} from "../../../shared/cache/project-asset-cache.js";
import {
  getProjectFile,
  uploadProjectFile
} from "../../../shared/cache/project-cache.js";
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
  DEFAULT_VIEWS
} from "./config/defaults.js";
import { parseDxf } from "./import/dxf.js";
import { renderPdfPages } from "./import/pdf.js";
import {
  getAufmasWorkspaceCache,
  setAufmasWorkspaceCache
} from "./state/workspaceCache.js";
import { mimeFromFile, viewNameForPage } from "./utils/fileMetadata.js";
import ImagesView from "./views/images/ImagesView.jsx";
import AufmasThreeView from "./views/three/AufmasThreeView.jsx";

export default function AufmasWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const cachedWorkspace = useMemo(
    () => getAufmasWorkspaceCache(projectId),
    [projectId]
  );
  const [project, setProject] = useState(
    () => cachedWorkspace?.project ?? null
  );
  const [views, setViews] = useState(
    () => cachedWorkspace?.views ?? DEFAULT_VIEWS
  );
  const [objects, setObjects] = useState(() => cachedWorkspace?.objects ?? []);
  const [todos, setTodos] = useState(
    () => cachedWorkspace?.todos ?? DEFAULT_TODOS
  );
  const [activeViewId, setActiveViewId] = useState(
    () => cachedWorkspace?.activeViewId ?? DEFAULT_VIEWS[0].id
  );
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
  const [isCompleted, setIsCompleted] = useState(() =>
    Boolean(cachedWorkspace?.isCompleted)
  );
  const [hydrated, setHydrated] = useState(() => Boolean(cachedWorkspace));
  const [loading, setLoading] = useState(() => !cachedWorkspace);
  const [importing, setImporting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
          todos: cachedWorkspace.todos ?? DEFAULT_TODOS,
          completed: Boolean(cachedWorkspace.isCompleted)
        })
      : ""
  );

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0];
  const activeObjects = useMemo(
    () => objects.filter((object) => object.viewId === activeView?.id),
    [activeView?.id, objects]
  );
  const selected =
    activeObjects.find((object) => object.id === selectedId) ?? null;
  const activePlanPage = activeView?.planFileId
    ? pdfPages[`${activeView.planFileId}:${activeView.pageNumber || 1}`]
    : null;
  const activeDxf = dxfLayers[activeView?.id] ?? { shapes: [], snapPoints: [] };

  const showNotice = useCallback((message, type = "info") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  useEffect(() => {
    if (cachedWorkspace) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data }, saved] = await Promise.all([
          axios.get(`/api/projects/get/${projectId}`),
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
        setProject(data.project);
        if (saved) {
          const loadedViews =
            Array.isArray(saved.views) && saved.views.length
              ? saved.views
              : DEFAULT_VIEWS;
          setViews(loadedViews);
          setObjects(Array.isArray(saved.objects) ? saved.objects : []);
          setTodos(Array.isArray(saved.todos) ? saved.todos : DEFAULT_TODOS);
          setIsCompleted(Boolean(saved.completed));
          setActiveViewId(loadedViews[0].id);
          lastSavedPayload.current = JSON.stringify({
            version: 1,
            views: loadedViews,
            objects: saved.objects ?? [],
            todos: saved.todos ?? DEFAULT_TODOS,
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
    getProjectFile({
      projectId,
      file: "cabinet.json",
      loadFromServer: {
        download: downloadFile,
        path: `/api/projects/generated/${projectId}/cabinet`
      }
    })
      .then((data) => {
        if (!cancelled) setCabinets(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (
          error.response?.status !== 404 &&
          error.code !== "OFFLINE_RESOURCE_UNAVAILABLE"
        ) {
          console.warn("Korpusdaten konnten nicht geladen werden", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    setAufmasWorkspaceCache(projectId, {
      project,
      views,
      objects,
      todos,
      activeViewId,
      selectedId,
      activeTool,
      display,
      pdfPages,
      dxfLayers,
      photos,
      cabinets,
      isCompleted,
      saveStatus
    });
  }, [
    activeTool,
    activeViewId,
    cabinets,
    display,
    dxfLayers,
    hydrated,
    isCompleted,
    objects,
    pdfPages,
    photos,
    project,
    projectId,
    saveStatus,
    selectedId,
    todos,
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
      const imageFiles = project.files.filter(
        (file) =>
          file.category !== "project-home-image" &&
          file.mimeType?.startsWith("image/")
      );
      const loaded = await Promise.all(
        imageFiles.map(async (file) => ({
          ...file,
          url: await getProjectAssetUrl(file)
        }))
      );
      if (!cancelled) setPhotos(loaded);
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
      todos,
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
  }, [hydrated, isCompleted, objects, projectId, todos, views]);

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
      if (isTyping || ["three", "images"].includes(activeView?.type)) return;
      const tool = { m: "measurement", w: "angle", p: "point", k: "cabinet" }[
        event.key.toLowerCase()
      ];
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
          (view) => !["three", "images"].includes(view.type)
        );
        const specialViews = current.filter((view) =>
          ["three", "images"].includes(view.type)
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
              pageNumber: page.pageNumber,
              pdfSnapPoints: [],
              pdfSnapStats: null
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
              pdfSnapStats: null
            });
          }
        });
        return [...nextDrawingViews, ...specialViews];
      });
      setActiveViewId((current) =>
        ["three", "images"].includes(current) ? DEFAULT_VIEWS[0].id : current
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
    if (!activeView || ["three", "images"].includes(activeView.type)) return;
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
      todos,
      completed: isCompleted
    };
    setAufmasWorkspaceCache(projectId, {
      project,
      views,
      objects,
      todos,
      activeViewId,
      selectedId,
      activeTool,
      display,
      pdfPages,
      dxfLayers,
      photos,
      cabinets,
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
      isCompleted || ["three", "images"].includes(view?.type)
        ? null
        : "measurement"
    );
  };

  const toggleCompleted = () => {
    setIsCompleted((current) => {
      const next = !current;
      setActiveTool(
        next || ["three", "images"].includes(activeView?.type)
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
      <div className="flex h-dvh bg-[#10171e] text-white">
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
    <div className="flex h-dvh w-full overflow-hidden bg-[#10171e] text-white">
      <SideBar selected={2} />
      <MobileWorkspaceGuard title="Aufmaß" />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="z-20 shrink-0 border-b border-[#2a3741] bg-[#172029]">
          <ProjectBar selected={1} />
        </div>
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#2a3741] bg-[#121a21] px-4">
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

        <div className="aufmas-shell grid min-h-0 flex-1">
          {isCompleted ? (
            <ObjectOverviewPanel
              activeView={activeView}
              objects={activeObjects}
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
              objectCount={activeObjects.length}
              saveStatus={saveStatus}
            />
          )}
          <section className="min-h-0 min-w-0">
            {activeView?.type === "three" ? (
              <AufmasThreeView files={project?.files ?? []} />
            ) : activeView?.type === "images" ? (
              <ImagesView
                photos={photos}
                onUpload={uploadPhoto}
                uploading={uploadingPhoto}
                readOnly={isCompleted}
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
                onUpdateView={(patch) =>
                  setViews((current) =>
                    current.map((view) =>
                      view.id === activeView.id ? { ...view, ...patch } : view
                    )
                  )
                }
                importing={importing}
                readOnly={isCompleted}
              />
            )}
          </section>
          <div className="aufmas-right-sidebar grid min-h-0 border-l border-[#2a3741] bg-[#172029]">
            <PropertiesPanel
              selected={selected}
              objects={activeObjects}
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
                objects={objects}
                todos={todos}
                onTodosChange={setTodos}
                readOnly={isCompleted}
              />
            </div>
          </div>
          <div className="aufmas-views min-h-0 border-t border-[#2a3741]">
            <ViewStrip
              views={views}
              activeViewId={activeViewId}
              onViewChange={changeView}
              objects={objects}
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
    </div>
  );
}
