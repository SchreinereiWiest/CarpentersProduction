import {
    deleteTenantSecret,
    getTenantSecretStatus,
    setTenantSecret
} from "../secrets/tenant-secrets.service.js";

export const AI_INTEGRATION_API_KEY_SECRET = "ai-integration.api-key";

const auditContext = req => ({
    actorUserId: req.user.id,
    ipAddress: req.ip || null,
    userAgent: req.get("user-agent") || null
});

export async function getAiCredentialStatus(_req, res) {
    return res.json(await getTenantSecretStatus(AI_INTEGRATION_API_KEY_SECRET));
}

export async function setAiCredential(req, res) {
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (apiKey.length < 8 || apiKey.length > 4_096) {
        return res.status(400).json({ message: "Der AI-API-Key ist ungültig." });
    }
    return res.json(await setTenantSecret(AI_INTEGRATION_API_KEY_SECRET, apiKey, auditContext(req)));
}

export async function deleteAiCredential(req, res) {
    return res.json(await deleteTenantSecret(AI_INTEGRATION_API_KEY_SECRET, auditContext(req)));
}
