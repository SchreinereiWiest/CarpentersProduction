import { downloadFile, uploadJSONFile } from "../../services/apiTemplates.js";
import { getProjectFile, uploadProjectFile } from "../../services/projectMemoryCache.js";
import axios from "axios";
import { getS3FileUrl } from "../../services/projectAssetCache.js";

export const loadProjectProcurement = async projectId => {
    try {
        const data = await getProjectFile({
            projectId,
            file: "procurement.json",
            loadFromServer: {
                download: downloadFile,
                path: `/api/projects/generated/${projectId}/procurement`
            }
        });
        return data ?? { version: 1, items: [] };
    } catch (error) {
        console.error("Projekt-Einkaufswagen konnte nicht geladen werden", error);
        return { version: 1, items: [] };
    }
};

export const saveProjectProcurement = (projectId, payload) => uploadProjectFile({
    projectId,
    file: "procurement.json",
    data: payload,
    uploadFunction: {
        upload: uploadJSONFile,
        path: `/api/projects/generated/${projectId}/procurement`
    }
});

export const loadProcurementCatalog = async () => {
    try {
        const response = await axios.get("/api/shop/catalog");
        return response.data ?? { version: 1, articles: [], groups: [] };
    } catch (error) {
        console.error("Einkaufskatalog konnte nicht geladen werden", error);
        return { version: 1, articles: [] };
    }
};

export const saveProcurementCatalog = async payload => {
    const response = await axios.put("/api/shop/catalog", payload);
    return response.data;
};

export const loadShopSettings = async () => {
    try {
        const response = await axios.get("/api/shop/settings");
        return response.data ?? null;
    } catch (error) {
        console.error("Shop-Einstellungen konnten nicht geladen werden", error);
        return null;
    }
};

export const saveShopSettings = async payload => {
    const response = await axios.put("/api/shop/settings", payload);
    return response.data;
};

export const uploadShopImage = async file => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("mimeType", file.type);

    const response = await axios.post("/api/files/shop-image", formData);
    return response.data.fileEntry;
};

export const loadShopImageUrl = async fileId => {
    if (!fileId) return null;
    return getS3FileUrl({ id: fileId });
};
