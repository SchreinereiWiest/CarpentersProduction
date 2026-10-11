import { downloadFile, uploadJSONFile } from "../../services/apiTemplates.js";
import axios from "axios";

export const loadProjectProcurement = async projectId => {
    try {
        const data = await downloadFile(`/api/projects/generated/${projectId}/procurement`);
        return data ?? { version: 1, items: [] };
    } catch (error) {
        console.error("Projekt-Einkaufswagen konnte nicht geladen werden", error);
        return { version: 1, items: [] };
    }
};

export const saveProjectProcurement = (projectId, payload) => (
    uploadJSONFile(`/api/projects/generated/${projectId}/procurement`, payload)
);

export const loadProcurementCatalog = async () => {
    try {
        const data = await downloadFile("/api/settings/procurement");
        return data ?? { version: 1, articles: [] };
    } catch (error) {
        console.error("Einkaufskatalog konnte nicht geladen werden", error);
        return { version: 1, articles: [] };
    }
};

export const saveProcurementCatalog = payload => (
    uploadJSONFile("/api/settings/procurement", payload)
);

export const loadShopSettings = async () => {
    try {
        const data = await downloadFile("/api/settings/shop");
        return data ?? null;
    } catch (error) {
        console.error("Shop-Einstellungen konnten nicht geladen werden", error);
        return null;
    }
};

export const saveShopSettings = payload => (
    uploadJSONFile("/api/settings/shop", payload)
);

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
    const response = await axios.get(`/api/files/download/${fileId}`);
    return response.data.url;
};
/*  */