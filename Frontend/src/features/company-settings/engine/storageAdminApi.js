import axios from "axios";

const request = config => axios({ withCredentials: true, ...config }).then(response => response.data);

export const loadStorageOverview = ({ page = 1, pageSize = 100, search = "", prefix = "" } = {}) => request({
    method: "get",
    url: "/api/storage-admin/overview",
    params: { page, pageSize, search: search || undefined, prefix: prefix || undefined },
    skipOfflineCache: true
});

export const getObjectDownload = id => request({
    method: "get",
    url: `/api/storage-admin/objects/${id}/download`,
    skipOfflineCache: true
});

export const deleteStorageObject = id => request({
    method: "delete",
    url: `/api/storage-admin/objects/${id}`
});

export const deleteStorageFolder = path => request({
    method: "delete",
    url: "/api/storage-admin/folders",
    data: { path, confirmation: "ORDNER LÖSCHEN" }
});

export const cleanupStorage = () => request({ method: "post", url: "/api/storage-admin/cleanup" });

export const loadBackups = () => request({
    method: "get",
    url: "/api/storage-admin/backups",
    skipOfflineCache: true
});

export const createStorageBackup = name => request({
    method: "post",
    url: "/api/storage-admin/backups",
    data: { name }
});

export const createDatabaseBackup = name => request({
    method: "post",
    url: "/api/storage-admin/database-backups",
    data: { name }
});

export const createShopDatabaseBackup = name => request({
    method: "post",
    url: "/api/storage-admin/shop-database-backups",
    data: { name }
});

export const getBackupDownload = id => request({
    method: "get",
    url: `/api/storage-admin/backups/${id}/download`,
    skipOfflineCache: true
});

export const restoreStorageBackup = id => request({
    method: "post",
    url: `/api/storage-admin/backups/${id}/restore`,
    data: { confirmation: "WIEDERHERSTELLEN" }
});

export const deleteStorageBackup = id => request({
    method: "delete",
    url: `/api/storage-admin/backups/${id}`
});

export const importStorageBackup = file => {
    const data = new FormData();
    data.append("backup", file);
    data.append("confirmation", "WIEDERHERSTELLEN");
    return request({
        method: "post",
        url: "/api/storage-admin/backups/import",
        data,
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const importDatabaseBackup = file => {
    const data = new FormData();
    data.append("backup", file);
    data.append("confirmation", "WIEDERHERSTELLEN");
    return request({
        method: "post",
        url: "/api/storage-admin/database-backups/import",
        data,
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const importShopDatabaseBackup = file => {
    const data = new FormData();
    data.append("backup", file);
    data.append("confirmation", "WIEDERHERSTELLEN");
    return request({
        method: "post",
        url: "/api/storage-admin/shop-database-backups/import",
        data,
        headers: { "Content-Type": "multipart/form-data" }
    });
};
