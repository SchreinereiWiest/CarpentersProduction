import { downloadFile, uploadJSONFile } from "../../shared/api/file-api.js";
import { getProjectFile, uploadProjectFile } from "../../shared/cache/project-cache.js";
import axios from "axios";
import { getS3FileUrl } from "../../shared/cache/project-asset-cache.js";

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

export const loadPurchaseLists = async () => {
    const response = await axios.get("/api/shop/lists");
    return response.data?.lists ?? [];
};

export const createPurchaseList = async payload => {
    const response = await axios.post("/api/shop/lists", payload);
    return response.data?.lists ?? [];
};

export const updatePurchaseList = async (id, payload) => {
    const response = await axios.put(`/api/shop/lists/${id}`, payload);
    return response.data?.lists ?? [];
};

export const deletePurchaseList = id => axios.delete(`/api/shop/lists/${id}`);

export const releasePurchaseList = async id => {
    const response = await axios.post(`/api/shop/lists/${id}/release`);
    return response.data;
};

export const loadNonProjectPurchases = async status => {
    const response = await axios.get("/api/shop/non-project-purchases", { params: status ? { status } : {} });
    return response.data?.items ?? [];
};

export const processNonProjectPurchases = async (ids, action) => {
    const response = await axios.patch("/api/shop/non-project-purchases/process", { ids, action });
    return response.data;
};

export const loadArticleArchive = async () => {
    const response = await axios.get("/api/shop/archive");
    return response.data?.entries ?? [];
};

export const createArticleArchiveEntry = async payload => {
    const response = await axios.post("/api/shop/archive", payload);
    return response.data?.entries ?? [];
};

export const updateArticleArchiveEntry = async (id, payload) => {
    const response = await axios.put(`/api/shop/archive/${id}`, payload);
    return response.data?.entries ?? [];
};

export const deleteArticleArchiveEntry = id => axios.delete(`/api/shop/archive/${id}`);

export const activateArticleArchiveEntry = async id => {
    const response = await axios.post(`/api/shop/archive/${id}/activate`);
    return response.data;
};
