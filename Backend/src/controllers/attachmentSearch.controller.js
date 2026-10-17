import { downloadSearchResult, searchAttachments } from "../services/attachmentSearch.service.js";
import { createUpload } from "../middleware/upload.middleware.js";

const activeSearches = new Set();

export async function attachmentSearch(req, res) {
    const searchKey = `${req.tenant.id}:${req.user.id}`;
    if (activeSearches.has(searchKey)) {
        return res.status(429).json({ message: "Für diesen Benutzer läuft bereits eine Artikelsuche." });
    }
    activeSearches.add(searchKey);
    try {
        const result = await searchAttachments({
            articleNumber: req.body.articleNumber,
            projectId: req.body.projectId,
            userId: req.user.id,
            tenantId: req.tenant.id
        });
        return res.json(result);
    } finally {
        activeSearches.delete(searchKey);
    }
}

export async function importAttachmentSearchResult(req, res) {
    const remoteFile = await downloadSearchResult({
        resultId: req.body.resultId,
        projectId: req.body.projectId,
        userId: req.user.id,
        tenantId: req.tenant.id
    });
    req.file = {
        buffer: remoteFile.buffer,
        size: remoteFile.buffer.length,
        mimetype: remoteFile.mimeType,
        originalname: remoteFile.fileName
    };
    req.body.entity = "project";
    req.body.entityId = req.body.projectId;
    req.body.fileName = remoteFile.fileName;
    req.body.mimeType = remoteFile.mimeType;
    req.uploadCategory = "production-attachment";
    req.uploadAuditMetadata = remoteFile.provenance;
    return createUpload(req, res);
}
