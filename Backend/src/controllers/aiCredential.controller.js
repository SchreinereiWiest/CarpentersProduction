import {
    ATTACHMENT_SEARCH_API_KEY_SECRET,
    deleteTenantSecret,
    getTenantSecretStatus,
    setTenantSecret
} from "../services/tenantSecrets.service.js";

const auditContext = req => ({
    actorUserId: req.user.id,
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null
});

export async function getAttachmentSearchCredentialStatus(_req, res) {
    return res.json(await getTenantSecretStatus(ATTACHMENT_SEARCH_API_KEY_SECRET));
}

export async function setAttachmentSearchCredential(req, res) {
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (apiKey.length < 16 || apiKey.length > 4_096) {
        return res.status(400).json({ message: "Der Open-WebUI-API-Key ist ungültig." });
    }
    return res.json(await setTenantSecret(ATTACHMENT_SEARCH_API_KEY_SECRET, apiKey, auditContext(req)));
}

export async function deleteAttachmentSearchCredential(req, res) {
    return res.json(await deleteTenantSecret(ATTACHMENT_SEARCH_API_KEY_SECRET, auditContext(req)));
}

