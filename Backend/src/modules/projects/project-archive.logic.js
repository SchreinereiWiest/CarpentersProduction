import crypto from "crypto";

const FILE_ARCHIVE_PATH = /^files\/([a-zA-Z0-9-]+)$/;

export function originalFileId(entry) {
    if (entry?.kind !== "file") return null;
    if (entry.originalId) return String(entry.originalId);
    return String(entry.archivePath || "").match(FILE_ARCHIVE_PATH)?.[1] || null;
}

export function createImportedFileIds(binaryEntries, createId = () => crypto.randomUUID()) {
    return new Map(
        (binaryEntries || [])
            .filter(entry => entry?.kind === "file")
            .map(entry => [originalFileId(entry), createId()])
            .filter(([sourceId]) => sourceId)
    );
}

function replaceFileIds(value, fileIds) {
    let result = value;
    for (const [sourceId, targetId] of fileIds) {
        // UUIDs can also be embedded in Exposé page ids such as
        // `image:<file-id>` and in object keys used for overrides.
        if (result.includes(sourceId)) result = result.split(sourceId).join(targetId);
    }
    return result;
}

export function remapProjectFileReferences(value, fileIds) {
    if (!fileIds?.size) return value;
    if (typeof value === "string") return replaceFileIds(value, fileIds);
    if (Array.isArray(value)) {
        return value.map(item => remapProjectFileReferences(item, fileIds));
    }
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            replaceFileIds(key, fileIds),
            remapProjectFileReferences(item, fileIds)
        ])
    );
}

export function remapProjectJsonBuffer(buffer, fileIds) {
    const data = JSON.parse(buffer.toString("utf8"));
    return Buffer.from(
        JSON.stringify(remapProjectFileReferences(data, fileIds)),
        "utf8"
    );
}
