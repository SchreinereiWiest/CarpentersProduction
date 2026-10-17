import axios from "axios";
import { downloadFile, uploadJSONFile } from "../../../services/apiTemplates.js";
import { getProjectFile, uploadProjectFile } from "../../../services/projectMemoryCache.js";
import {
  buildGeneratedProcurementItems,
  mergeGeneratedItems,
  normalizeCatalog,
  normalizeProcurementDocument
} from "../../purchasing/procurementUtils.js";
import {
  loadProcurementCatalog,
  loadShopSettings
} from "../../purchasing/procurementApi.js";

export const loadOptionalCalculationFile = async (projectId, name) => {
  try {
    return await getProjectFile({
      projectId,
      file: `${name}.json`,
      loadFromServer: {
        download: downloadFile,
        path: `/api/projects/generated/${projectId}/${name}`
      }
    });
  } catch (error) {
    if (error?.response?.status !== 404) {
      console.warn(`${name}.json konnte fuer die Kalkulation nicht geladen werden`, error);
    }
    return null;
  }
};

export async function loadCalculationWorkspace(projectId) {
  const [
    projectResponse,
    cabinets,
    nesting,
    partList,
    savedProcurement,
    calculation,
    contextResponse,
    materialResponse,
    shopSettings,
    catalog
  ] = await Promise.all([
    axios.get(`/api/projects/get/${projectId}`),
    loadOptionalCalculationFile(projectId, "cabinet"),
    loadOptionalCalculationFile(projectId, "nesting"),
    loadOptionalCalculationFile(projectId, "list"),
    loadOptionalCalculationFile(projectId, "procurement"),
    loadOptionalCalculationFile(projectId, "calculation"),
    axios.get(`/api/projects/calculation-context/${projectId}`).catch(error => {
      console.warn("Kalkulationskontext konnte nicht geladen werden", error);
      return { data: null };
    }),
    axios.get("/api/materials/get").catch(error => {
      console.warn("Materialpreise konnten fuer die Kalkulation nicht aktualisiert werden", error);
      return { data: { materials: [] } };
    }),
    loadShopSettings(),
    loadProcurementCatalog()
  ]);
  const saved = normalizeProcurementDocument(savedProcurement);
  const liveSourcesAvailable = Array.isArray(nesting) || Array.isArray(partList);
  const generatedItems = buildGeneratedProcurementItems({
    nesting,
    partList,
    cabinetData: cabinets,
    storageMaterials: materialResponse.data?.materials || [],
    shopSettings,
    catalogArticles: normalizeCatalog(catalog).articles
  });
  const procurement = {
    ...saved,
    items: liveSourcesAvailable
      ? mergeGeneratedItems(generatedItems, saved.items)
      : saved.items
  };

  return {
    project: projectResponse.data.project,
    cabinets: Array.isArray(cabinets) ? cabinets : [],
    procurement,
    calculation,
    context: contextResponse.data
  };
}

export const saveCalculation = (projectId, payload) => uploadProjectFile({
  projectId,
  file: "calculation.json",
  data: payload,
  uploadFunction: {
    upload: uploadJSONFile,
    path: `/api/projects/generated/${projectId}/calculation`
  }
});
