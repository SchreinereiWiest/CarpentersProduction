import { useState } from 'react'
import SideBar from '../../shared/components/sideBar.jsx'
import axios from 'axios';
import { useParams } from 'react-router';
import { useEffect } from "react";
import ProjectBar from '../../shared/components/projectBar.jsx';
import ImageGallery from '../../shared/components/images/imageGalery.jsx';
import { jsPDF } from "jspdf";
import { createProjectPDF } from "@EngineBrowser/project-pdf/createProjectPDF.js";
import { measurementViewSvgDataUrl } from "@EngineBrowser/project-pdf/measurementViewSvgRenderer.js";
import { appendPartsListPDF } from "./part-list/createPDF.js";
import { downloadFile } from "../../shared/api/file-api.js";
import { getProjectFile } from "../../shared/cache/project-cache.js";
import { getGlobalFile } from "../../shared/cache/global-cache.js";
import { getS3FileBlob } from "../../shared/cache/project-asset-cache.js";
import { getProjectRecord } from "../../shared/projects/project-records.js";
import { renderPdfPages } from "./measurement/import/pdf.js";
import { parseDxf } from "./measurement/import/dxf.js";
import {
  DEFAULT_COMPANY_SETTINGS,
  loadCompanySettings
} from "../../shared/settings/company-settings.js";

//Untermenü in Kontakte, um ein neues Projekt für den Kunden zu erstellen.

const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Projektansicht konnte nicht gelesen werden."));
  reader.readAsDataURL(blob);
});

function ShowProject() {
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [creatingPDF, setCreatingPDF] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const { projectId } = useParams();

  useEffect(() => {
    const fetchProject = async () => {
    const loadedProject = await getProjectRecord(projectId);
    setProject(loadedProject);

    if (loadedProject.customer) {
      setCustomer(loadedProject.customer);
    } else if (loadedProject.customerId) {
      const customerdata = await axios.get(`/api/customers/get/${loadedProject.customerId}`);
      setCustomer(customerdata.data.customer);
    } else {
      setCustomer(null);
    }
    
};

fetchProject();
}, [projectId]);

  const loadOptionalProjectFile = async file => {
    try {
      return await getProjectFile({
        projectId,
        file: `${file}.json`,
        loadFromServer: {
          download: downloadFile,
          path: `/api/projects/generated/${projectId}/${file}`
        }
      });
    } catch (error) {
      console.warn(`${file}.json konnte fuer die Projekt-PDF nicht geladen werden`, error);
      return null;
    }
  };

  const createPDF = async () => {
    if (!project || creatingPDF) return;

    setCreatingPDF(true);
    setPdfError("");

    try {
      const [cabinets, partsList, nesting, aufmas, materialResponse, cncSettings, companySettings] = await Promise.all([
        loadOptionalProjectFile("cabinet"),
        loadOptionalProjectFile("list"),
        loadOptionalProjectFile("nesting"),
        loadOptionalProjectFile("aufmas"),
        axios.get("/api/materials/get").catch(() => ({ data: { materials: [] } })),
        getGlobalFile({
          file: "settings-cnc.json",
          loadFromServer: { download: downloadFile, path: "/api/settings/cnc" }
        }).catch(() => null),
        loadCompanySettings().catch(() => DEFAULT_COMPANY_SETTINGS)
      ]);

      const imageFiles = (project.files ?? []).filter(file => (
            file.category !== "production-attachment" &&
            file.category !== "measurement-image" &&
            file.mimeType?.startsWith("image/")
      ));
      const images = (await Promise.all(imageFiles.map(async (file, index) => {
        try {
          return {
            id: file.id,
            label: `Perspektive ${index + 1}`,
            name: file.fileName,
            blob: await getS3FileBlob({ ...file, projectId })
          };
        } catch (error) {
          console.warn(`${file.fileName} konnte fuer die Projekt-PDF nicht geladen werden`, error);
          return null;
        }
      }))).filter(Boolean);

      const pdfPageCache = new Map();
      const viewAssets = (await Promise.all((aufmas?.views ?? [])
        .filter(view => !["three", "images", "expose"].includes(view.type))
        .map(async (view, index) => {
          try {
            let planPage = null;
            const fileId = view.planFileId || view.imageFileId;
            const file = fileId
              ? (project.files ?? []).find(candidate => candidate.id === fileId)
              : null;
            if (file) {
              const blob = await getS3FileBlob({ ...file, projectId });
              if (file.mimeType?.startsWith("image/") || view.imageFileId) {
                planPage = { dataUrl: await blobToDataUrl(blob) };
              } else {
                if (!pdfPageCache.has(file.id)) {
                  pdfPageCache.set(file.id, await renderPdfPages(blob));
                }
                const pages = pdfPageCache.get(file.id);
                planPage = pages.find(item => item.pageNumber === (view.pageNumber || 1)) ?? null;
              }
            }
            let dxf = null;
            const dxfFile = view.dxfFileId
              ? (project.files ?? []).find(candidate => candidate.id === view.dxfFileId)
              : null;
            if (dxfFile) {
              dxf = parseDxf(await (await getS3FileBlob({ ...dxfFile, projectId })).text());
            }
            return {
              id: view.id,
              label: view.type === "floor" ? "Grundriss" : `Ansicht ${index + 1}`,
              name: view.label,
              dataUrl: measurementViewSvgDataUrl({
                view,
                objects: aufmas?.objects ?? [],
                planPage,
                dxf,
                measurementLabelOffsetY:
                  companySettings.userInterface?.measurementLabelOffsetY ?? -30
              }),
              width: 1000,
              height: 650,
              format: "SVG"
            };
          } catch (error) {
            console.warn(`${view.label || "Aufmaßansicht"} konnte fuer die Projekt-PDF nicht geladen werden`, error);
            return null;
          }
        }))).filter(Boolean);

      await createProjectPDF({
        createDocument: () => new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }),
        project,
        customer,
        images,
        customImageAssets: images,
        viewAssets,
        cabinets: Array.isArray(cabinets) ? cabinets : [],
        partsList: Array.isArray(partsList) ? partsList : [],
        nesting: Array.isArray(nesting) ? nesting : [],
        materials: materialResponse.data?.materials ?? [],
        cncConfig: cncSettings?.cncDefault ?? cncSettings ?? undefined,
        expose: aufmas?.expose,
        companySettings,
        appendPartsList: appendPartsListPDF
      });
    } catch (error) {
      console.error("Projekt-PDF konnte nicht erstellt werden", error);
      setPdfError("Die Projekt-PDF konnte nicht erstellt werden.");
    } finally {
      setCreatingPDF(false);
    }
  };


  return (
    <>
        <div className="bg-gray-900 text-white h-dvh w-full flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={0}/>
        </div>
                <div className="overflow-y-auto px-4 pt-4 sm:pl-8">

                    {/* Kunde + Bilder */}
                    <div data-tour="project-home-summary" className="flex flex-col gap-2 md:flex-row md:items-center">

                        <h2 className="mt-2 truncate text-xl font-bold sm:text-2xl md:w-1/5">
                            {customer?.lastName ?? (project?.localOnly ? "Lokales Projekt ohne Kunde" : "")}
                        </h2>

                        <h2 className="mt-2 text-xl font-bold sm:text-2xl md:ml-0">
                            Bilder:
                        </h2>

                        <button
                            data-tour="project-home-print"
                            type="button"
                            onClick={createPDF}
                            disabled={!project || creatingPDF}
                            className="mt-2 inline-flex items-center gap-2 self-start rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto md:self-auto"
                            aria-label="Projekt drucken"
                            title="Projekt als PDF erstellen"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.99c-.426.053-.851.11-1.274.174-1.454.218-2.476 1.483-2.476 2.917v6.294a3 3 0 0 0 3 3h.27l-.155 1.705A1.875 1.875 0 0 0 7.232 22.5h9.536a1.875 1.875 0 0 0 1.867-2.045l-.155-1.705h.27a3 3 0 0 0 3-3V9.456c0-1.434-1.022-2.7-2.476-2.917A48.716 48.716 0 0 0 18 6.366V3.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM16.5 6.205v-2.83A.375.375 0 0 0 16.125 3h-8.25a.375.375 0 0 0-.375.375v2.83a49.353 49.353 0 0 1 9 0Zm-.217 8.265c.178.018.317.16.333.337l.526 5.784a.375.375 0 0 1-.374.409H7.232a.375.375 0 0 1-.374-.409l.526-5.784a.373.373 0 0 1 .333-.337 41.741 41.741 0 0 1 8.566 0Zm.967-3.97a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5ZM15 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75H15Z" clipRule="evenodd" />
                            </svg>
                            {creatingPDF ? "PDF wird erstellt …" : "Projekt drucken"}
                        </button>

                    </div>

                    {pdfError && (
                        <p className="mt-2 text-right text-sm text-red-400" role="alert">
                            {pdfError}
                        </p>
                    )}

                    {/* Projektname */}
                    <h2 className="mt-2 truncate text-xl font-bold sm:text-2xl">
                        {project?.title}
                    </h2>

                    {/* Beschreibung + Bilder */}
                    <div data-tour="project-home-content" className="flex flex-col md:flex-row">

                        {/* Beschreibung */}
                        <div className="w-full md:w-1/5 pt-4 pr-4">
                            {project?.description}
                        </div>

                        {/* Bilder */}
                        <div className="rounded-lg mt-4 md:mt-4 md:flex-1 overflow-hidden">
                            <ImageGallery files={(project?.files ?? []).filter(file => (
                                file.category !== "production-attachment" &&
                                file.category !== "measurement-image"
                            ))} />
                        </div>

                    </div>

                </div>

            </main>
        </div>
    </>
);
}

export default ShowProject;
