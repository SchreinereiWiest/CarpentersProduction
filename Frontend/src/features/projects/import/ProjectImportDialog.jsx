import { useEffect, useRef, useState } from "react";
import axios from "axios";
import CustomerSearch from "../legacy-editor/customerSearch.jsx";
import { downloadFile, uploadJSONFile } from "../../../shared/api/file-api.js";
import { getGlobalFile } from "../../../shared/cache/global-cache.js";
import { uploadProjectFile } from "../../../shared/cache/project-cache.js";
import { DEFAULT_TODOS } from "../measurement/config/defaults.js";
import { renderPdfPages } from "../measurement/import/pdf.js";
import {
  applyMaterialMappings,
  createCabinetsFromPartList,
  readCpImport
} from "./cpImport.js";

const IMPORT_ASSET_ENDPOINT = "/api/files/project-import-asset";

const extensionOf = (file) =>
  file?.name?.split(".").pop()?.toLowerCase() || "";

const importTitle = (file) =>
  file?.name?.replace(/\.(cpimport|cproject)$/i, "") || "Palette-CAD-Import";

function bytesToFile(bytes, name, type) {
  return new File([bytes], name, { type });
}

async function dataUrlToFile(dataUrl, name) {
  const blob = await fetch(dataUrl).then((response) => response.blob());
  return new File([blob], name, { type: "image/png" });
}

async function uploadImportAsset(projectId, file, target) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityId", projectId);
  formData.append("fileName", file.name);
  formData.append("mimeType", file.type);
  formData.append("target", target);
  const { data } = await axios.post(IMPORT_ASSET_ENDPOINT, formData);
  return data.fileEntry;
}

function targetLabel(target) {
  if (target === "home") return "Projekt-Startseite";
  if (target === "front") return "Aufmaß-Frontansicht";
  return "Nicht importieren";
}

const normalizeMaterialReference = (value) =>
  String(value ?? "").trim().toLocaleLowerCase("de");

function createInitialMaterialMappings(references, materials) {
  return references.map((reference) => {
    const source = normalizeMaterialReference(reference.source);
    const usesMainMaterial = reference.fields.includes("MID");
    const material = materials.find((candidate) => {
      const materialNumber = normalizeMaterialReference(candidate.materialNumber);
      const edgeArticleNumber = normalizeMaterialReference(
        candidate.edgeArticleNumber
      );
      return usesMainMaterial
        ? materialNumber === source
        : edgeArticleNumber === source || materialNumber === source;
    });
    return { source: reference.source, materialId: material?.id || "" };
  });
}

function materialOptionLabel(material) {
  const references = [
    material.materialNumber,
    material.edgeArticleNumber
      ? `Kante ${material.edgeArticleNumber}`
      : null,
    material.thickness != null ? `${material.thickness} mm` : null
  ].filter(Boolean);
  return `${material.name}${references.length ? ` · ${references.join(" · ")}` : ""}`;
}

export default function ProjectImportDialog({
  open,
  fixedCustomer = null,
  onClose,
  onImported
}) {
  const inputRef = useRef(null);
  const analysisRun = useRef(0);
  const previewUrls = useRef([]);
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [imagePreviews, setImagePreviews] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialMappings, setMaterialMappings] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialError, setMaterialError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [title, setTitle] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const clearPreviews = () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current = [];
    setImagePreviews([]);
  };

  const reset = () => {
    analysisRun.current += 1;
    clearPreviews();
    setFile(null);
    setInspection(null);
    setPdfPages([]);
    setAssignments({});
    setMaterials([]);
    setMaterialMappings([]);
    setMaterialsLoading(false);
    setMaterialError("");
    setSelectedCustomer(null);
    setTitle("");
    setAnalyzing(false);
    setBusy(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  if (!open) return null;

  const isCpImport = extensionOf(file) === "cpimport";

  const close = () => {
    if (!busy) {
      reset();
      onClose();
    }
  };

  const selectFile = async (nextFile) => {
    const run = analysisRun.current + 1;
    analysisRun.current = run;
    clearPreviews();
    setFile(nextFile || null);
    setInspection(null);
    setPdfPages([]);
    setAssignments({});
    setMaterials([]);
    setMaterialMappings([]);
    setMaterialsLoading(false);
    setMaterialError("");
    setError("");
    setTitle(importTitle(nextFile));

    if (!nextFile || extensionOf(nextFile) !== "cpimport") return;

    setAnalyzing(true);
    setMaterialsLoading(true);
    try {
      const parsed = await readCpImport(nextFile);
      const [pages, materialResult] = await Promise.all([
        renderPdfPages(
          new Blob([parsed.expose.bytes], { type: parsed.expose.mimeType }),
          { scale: 1.5 }
        ),
        axios
          .get("/api/materials/get")
          .then((response) => ({ materials: response.data?.materials ?? [] }))
          .catch((loadError) => ({ loadError }))
      ]);
      if (analysisRun.current !== run) return;

      const urls = parsed.images.map((image) =>
        URL.createObjectURL(new Blob([image.bytes], { type: image.mimeType }))
      );
      previewUrls.current = urls;
      setImagePreviews(
        parsed.images.map((image, index) => ({ ...image, url: urls[index] }))
      );
      setInspection(parsed);
      setPdfPages(pages);
      const loadedMaterials = materialResult.materials ?? [];
      setMaterials(loadedMaterials);
      setMaterialMappings(
        createInitialMaterialMappings(parsed.materialReferences, loadedMaterials)
      );
      setMaterialError(
        materialResult.loadError
          ? "Die interne Materialdatenbank konnte nicht geladen werden. Originalwerte bleiben erhalten."
          : ""
      );
      setAssignments(
        Object.fromEntries(
          pages.map((page, index) => [
            page.pageNumber,
            {
              target: "home",
              label: `Frontansicht ${index + 1}`
            }
          ])
        )
      );
    } catch (analysisError) {
      console.error("cpimport konnte nicht analysiert werden", analysisError);
      if (analysisRun.current === run) {
        setError(
          analysisError.message || "Die cpimport-Datei konnte nicht gelesen werden."
        );
      }
    } finally {
      if (analysisRun.current === run) {
        setAnalyzing(false);
        setMaterialsLoading(false);
      }
    }
  };

  const importProjectArchive = async () => {
    const formData = new FormData();
    formData.append("projectFile", file);
    if (fixedCustomer?.id) formData.append("customerId", fixedCustomer.id);
    const { data } = await axios.post("/api/projects/import", formData);
    return data.projectId;
  };

  const importCpProject = async () => {
    if (!inspection) throw new Error("Das cpimport-Paket wurde noch nicht analysiert.");
    const customer = fixedCustomer || selectedCustomer;
    if (!customer?.id) throw new Error("Bitte wähle einen Kunden aus.");
    if (!title.trim()) throw new Error("Bitte gib einen Projektnamen ein.");

    const cabinetDefaults = await getGlobalFile({
      file: "settings-cabinet.json",
      loadFromServer: {
        download: downloadFile,
        path: "/api/settings/cabinet"
      }
    });

    let projectId = null;
    try {
      const { data: project } = await axios.post("/api/projects/new", {
        customerId: customer.id,
        title: title.trim(),
        description: "Import aus Palette CAD"
      });
      projectId = project.id;

      const frontPages = pdfPages.filter(
        (page) => assignments[page.pageNumber]?.target === "front"
      );
      const homePages = pdfPages.filter(
        (page) => assignments[page.pageNumber]?.target === "home"
      );

      const planFile = frontPages.length
        ? await uploadImportAsset(
            projectId,
            bytesToFile(
              inspection.expose.bytes,
              "palette-cad-ansichten.pdf",
              inspection.expose.mimeType
            ),
            "measurement-plan"
          )
        : null;

      await Promise.all([
        ...inspection.images.map((image) =>
          uploadImportAsset(
            projectId,
            bytesToFile(
              image.bytes,
              `${image.view || "aufmass"}.png`,
              image.mimeType
            ),
            "measurement-image"
          )
        ),
        ...homePages.map(async (page) =>
          uploadImportAsset(
            projectId,
            await dataUrlToFile(
              page.dataUrl,
              `expose-seite-${page.pageNumber}.png`
            ),
            "home"
          )
        )
      ]);

      const drawingViews = frontPages.map((page, index) => ({
        id: `cpimport-front-${page.pageNumber}`,
        label:
          assignments[page.pageNumber]?.label?.trim() ||
          `Frontansicht ${index + 1}`,
        type: "elevation",
        planFileId: planFile.id,
        dxfFileId: null,
        pageNumber: page.pageNumber,
        pdfSnapPoints: [],
        pdfSnapStats: null
      }));
      if (!drawingViews.length) {
        drawingViews.push({
          id: "front",
          label: "Frontansicht",
          type: "elevation",
          planFileId: null,
          dxfFileId: null,
          pageNumber: 1
        });
      }
      const measurement = {
        version: 1,
        views: [
          ...drawingViews,
          { id: "three", label: "3D-Ansicht", type: "three" },
          { id: "images", label: "Bilder", type: "images" }
        ],
        objects: [],
        todos: DEFAULT_TODOS,
        completed: false
      };
      const translatedPartList = applyMaterialMappings(
        inspection.partList,
        materialMappings,
        materials
      );
      const translatedCabinets = createCabinetsFromPartList(
        inspection.partList,
        {
          mappings: materialMappings,
          materials,
          partListSettings: cabinetDefaults?.partListSettings
        }
      );

      await Promise.all([
        uploadProjectFile({
          projectId,
          file: "list.json",
          data: translatedPartList,
          uploadFunction: {
            upload: uploadJSONFile,
            path: `/api/projects/generated/${projectId}/list`
          }
        }),
        uploadProjectFile({
          projectId,
          file: "cabinet.json",
          data: translatedCabinets,
          uploadFunction: {
            upload: uploadJSONFile,
            path: `/api/projects/generated/${projectId}/cabinet`
          }
        }),
        uploadProjectFile({
          projectId,
          file: "aufmas.json",
          data: measurement,
          uploadFunction: {
            upload: uploadJSONFile,
            path: `/api/projects/generated/${projectId}/aufmas`
          }
        })
      ]);

      return projectId;
    } catch (importError) {
      if (projectId) {
        await axios.delete(`/api/projects/delete/${projectId}`).catch((rollbackError) => {
          console.error("Unvollständiger cpimport konnte nicht entfernt werden", rollbackError);
        });
      }
      throw importError;
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Bitte wähle eine Projektdatei aus.");
      return;
    }
    if (!["cpimport", "cproject"].includes(extensionOf(file))) {
      setError("Unterstützt werden .cproject und .cpimport.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const projectId = isCpImport
        ? await importCpProject()
        : await importProjectArchive();
      await onImported(projectId);
    } catch (importError) {
      console.error("Projekt konnte nicht importiert werden", importError);
      setError(
        importError.response?.data?.message ||
          importError.message ||
          "Die Projektdatei konnte nicht importiert werden."
      );
    } finally {
      setBusy(false);
    }
  };

  const updateAssignment = (pageNumber, changes) => {
    setAssignments((current) => ({
      ...current,
      [pageNumber]: { ...current[pageNumber], ...changes }
    }));
  };

  const updateMaterialMapping = (source, materialId) => {
    setMaterialMappings((current) =>
      current.map((mapping) =>
        mapping.source === source ? { ...mapping, materialId } : mapping
      )
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-700 p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">Projekt importieren</h2>
            <p className="mt-1 text-sm text-gray-400">
              CProduction-Projektarchiv oder Palette-CAD-Importpaket
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Import schließen"
            className="text-2xl leading-none text-gray-400 hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || analyzing}
            className="flex min-h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 px-4 text-center hover:border-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-3xl text-blue-500">↑</span>
            <span className="mt-2 text-gray-200">
              {file ? file.name : "Projektdatei auswählen"}
            </span>
            <span className="mt-1 text-xs text-gray-500">
              Dateiformat: .cproject oder .cpimport
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".cproject,.cpimport,application/gzip,application/zip"
            className="hidden"
            onChange={(event) => selectFile(event.target.files?.[0] || null)}
          />

          {analyzing && (
            <p className="mt-5 rounded-lg bg-gray-900 p-4 text-sm text-gray-300">
              Manifest, CAD-Daten und PDF-Seiten werden analysiert …
            </p>
          )}

          {isCpImport && inspection && (
            <div className="mt-6 space-y-7">
              <section className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-300">
                    Projektname
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </label>
                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-300">
                    Kunde
                  </span>
                  {fixedCustomer ? (
                    <div className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-3">
                      {fixedCustomer.companyName ||
                        `${fixedCustomer.firstName || ""} ${fixedCustomer.lastName || ""}`.trim()}
                    </div>
                  ) : (
                    <CustomerSearch
                      selectedCustomer={selectedCustomer}
                      setSelectedCustomer={setSelectedCustomer}
                    />
                  )}
                </div>
              </section>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-gray-700 px-3 py-1.5">
                  {inspection.cabinets.length} Cabinets
                </span>
                <span className="rounded-full bg-gray-700 px-3 py-1.5">
                  {inspection.partList.reduce(
                    (sum, group) => sum + (group.Children?.length || 0),
                    0
                  )}{" "}
                  Bauteile
                </span>
                <span className="rounded-full bg-gray-700 px-3 py-1.5">
                  {pdfPages.length} PDF-Seiten
                </span>
                <span className="rounded-full bg-gray-700 px-3 py-1.5">
                  {inspection.materialReferences.length} CAD-Materialien
                </span>
              </div>

              <section>
                <h3 className="font-semibold">Materialien übersetzen</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Weise jede in Palette CAD verwendete Material- oder Kanten-ID
                  einem Material aus der internen Datenbank zu. Exakte Material-
                  und Kantenartikelnummern werden automatisch vorausgewählt.
                </p>
                {materialError && (
                  <p className="mt-3 rounded-lg border border-amber-900/70 bg-amber-950/30 p-3 text-sm text-amber-200">
                    {materialError}
                  </p>
                )}
                {inspection.materialReferences.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Keine Materialreferenzen in den verarbeiteten Bauteilen gefunden.
                  </p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-lg border border-gray-700">
                    {inspection.materialReferences.map((reference) => {
                      const mapping = materialMappings.find(
                        (entry) => entry.source === reference.source
                      );
                      return (
                        <div
                          key={reference.source}
                          className="grid gap-3 border-b border-gray-700 bg-gray-900 p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium" title={reference.source}>
                              {reference.source}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
                              {reference.fields.map((field) => (
                                <span key={field} className="rounded bg-gray-800 px-1.5 py-0.5">
                                  {field}
                                </span>
                              ))}
                              <span>{reference.occurrences}× verwendet</span>
                            </div>
                          </div>
                          <select
                            value={mapping?.materialId || ""}
                            onChange={(event) =>
                              updateMaterialMapping(reference.source, event.target.value)
                            }
                            disabled={materialsLoading}
                            aria-label={`Materialzuordnung für ${reference.source}`}
                            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm disabled:opacity-50"
                          >
                            <option value="">Originalwert beibehalten</option>
                            {materials.map((material) => {
                              const usable = Boolean(material.materialNumber);
                              return (
                                <option key={material.id} value={material.id} disabled={!usable}>
                                  {materialOptionLabel(material)}
                                  {!usable ? " · keine verwendbare Nummer" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-semibold">Aufmaß-Bilder aus dem Manifest</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Diese Bilder werden automatisch unter Aufmaß → Bilder abgelegt.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {imagePreviews.map((image) => (
                    <figure
                      key={image.path}
                      className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
                    >
                      <img
                        src={image.url}
                        alt={image.view}
                        className="h-36 w-full object-contain"
                      />
                      <figcaption className="border-t border-gray-700 px-3 py-2 text-sm text-gray-300">
                        {image.view}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-semibold">PDF-Seiten zuordnen</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Lege für jede extrahierte Seite fest, ob sie auf der Startseite
                  oder als Frontansicht im Aufmaß erscheinen soll.
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pdfPages.map((page) => {
                    const assignment = assignments[page.pageNumber] || {};
                    return (
                      <article
                        key={page.pageNumber}
                        className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900"
                      >
                        <img
                          src={page.dataUrl}
                          alt={`PDF-Seite ${page.pageNumber}`}
                          className="h-64 w-full bg-white object-contain"
                        />
                        <div className="space-y-3 border-t border-gray-700 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">
                              Seite {page.pageNumber}
                            </span>
                            <span className="text-xs text-gray-500">
                              {targetLabel(assignment.target)}
                            </span>
                          </div>
                          <select
                            value={assignment.target || "home"}
                            onChange={(event) =>
                              updateAssignment(page.pageNumber, {
                                target: event.target.value
                              })
                            }
                            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm"
                          >
                            <option value="home">Projekt-Startseite</option>
                            <option value="front">Aufmaß-Frontansicht</option>
                            <option value="skip">Nicht importieren</option>
                          </select>
                          {assignment.target === "front" && (
                            <input
                              value={assignment.label || ""}
                              onChange={(event) =>
                                updateAssignment(page.pageNumber, {
                                  label: event.target.value
                                })
                              }
                              aria-label={`Name für PDF-Seite ${page.pageNumber}`}
                              placeholder="Name der Frontansicht"
                              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-700 p-4 sm:px-6">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={
              !file ||
              busy ||
              analyzing ||
              (isCpImport &&
                (!inspection ||
                  !(fixedCustomer?.id || selectedCustomer?.id) ||
                  !title.trim()))
            }
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Projekt wird importiert …" : "Projekt importieren"}
          </button>
        </div>
      </form>
    </div>
  );
}
