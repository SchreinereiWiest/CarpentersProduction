import axios from "axios";

const FILE_METADATA = Symbol("fileMetadata");

export const getDownloadDescriptor = async (path, options = {}) => {
    const response = await axios.get(path, { withCredentials: true, ...options });
    return response.data;
};

export const downloadFileFromDescriptor = async descriptor => {
    if (!descriptor.exists) return null;

    const fileResponse = await fetch(descriptor.downloadUrl);
    if (fileResponse.ok === false) {
        throw new Error(`Datei konnte nicht geladen werden (${fileResponse.status})`);
    }

    const data = await fileResponse.json();
    if (data && (typeof data === "object" || typeof data === "function")) {
        Object.defineProperty(data, FILE_METADATA, {
            configurable: true,
            enumerable: false,
            value: {
                fileId: descriptor.fileId ?? null,
                serverVersion: descriptor.serverVersion ?? null,
                updatedAt: descriptor.updatedAt ?? null
            }
        });
    }
    return data;
};

export const downloadFile = async path => {
    const descriptor = await getDownloadDescriptor(path);
    return downloadFileFromDescriptor(descriptor);
};

downloadFile.getDescriptor = getDownloadDescriptor;
downloadFile.fromDescriptor = downloadFileFromDescriptor;

export const readDownloadMetadata = data => data?.[FILE_METADATA] ?? {};

export const uploadJSONFile = async (path, data, options = {}) => {
    const response = await axios.post(path, data, {
        withCredentials: true,
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {})
        }
    });
    return response.data;
};
