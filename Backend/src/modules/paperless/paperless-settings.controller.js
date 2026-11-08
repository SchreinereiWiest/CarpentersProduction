import crypto from "node:crypto";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import {
  deleteTenantSecret,
  getTenantSecretStatus,
  setTenantSecret
} from "../attachment-search/tenant-secrets.service.js";
import {
  PAPERLESS_API_TOKEN_SECRET,
  PAPERLESS_QR_SIGNING_SECRET,
  PAPERLESS_WEBHOOK_SECRET,
  getPaperlessConfiguration,
  normalizePaperlessBaseUrl,
  paperlessJson
} from "./paperless.service.js";

const auditContext = req => ({
  actorUserId: req.user.id,
  ipAddress: req.ip || null,
  userAgent: req.get("user-agent") || null
});

const publicBaseUrl = req => String(
  process.env.CARPENTERS_PUBLIC_URL || `${req.protocol}://${req.get("host")}`
).replace(/\/+$/, "");

const webhookDetails = req => ({
  url: `${publicBaseUrl(req)}/api/integrations/paperless/webhook/${getTenantId()}`,
  method: "POST",
  headerName: "X-Carpenters-Paperless-Secret",
  body: { document_id: "{{doc_id}}" },
  bodyParameter: { name: "document_id", value: "{{doc_id}}" }
});

const normalizeFolders = value => {
  if (!Array.isArray(value) || value.length > 100) {
    const error = new Error("Es sind maximal 100 manuelle Dokumentordner möglich.");
    error.statusCode = 400;
    throw error;
  }
  const folders = value.map((folder, index) => ({
    id: typeof folder?.id === "string" ? folder.id : null,
    name: String(folder?.name || "").trim().slice(0, 120),
    sortOrder: index
  }));
  if (folders.some(folder => !folder.name)) {
    const error = new Error("Jeder Dokumentordner benötigt einen Namen.");
    error.statusCode = 400;
    throw error;
  }
  if (new Set(folders.map(folder => folder.name.toLocaleLowerCase("de-DE"))).size !== folders.length) {
    const error = new Error("Ordnernamen dürfen nicht doppelt vorkommen.");
    error.statusCode = 400;
    throw error;
  }
  return folders;
};

async function presentSettings(req, oneTimeSecret = null) {
  const [configuration, tokenStatus, webhookStatus] = await Promise.all([
    getPaperlessConfiguration({ required: false }),
    getTenantSecretStatus(PAPERLESS_API_TOKEN_SECRET),
    getTenantSecretStatus(PAPERLESS_WEBHOOK_SECRET)
  ]);
  return {
    configured: Boolean(configuration),
    connected: Boolean(configuration?.enabled && tokenStatus.configured),
    enabled: configuration?.enabled ?? false,
    baseUrl: configuration?.baseUrl ?? "",
    autoAssignQr: configuration?.autoAssignQr ?? true,
    folders: configuration?.folders ?? [],
    tokenConfigured: tokenStatus.configured,
    tokenUpdatedAt: tokenStatus.updatedAt,
    webhookConfigured: webhookStatus.configured,
    webhook: webhookDetails(req),
    webhookSecret: oneTimeSecret,
    lastConnectedAt: configuration?.lastConnectedAt ?? null,
    lastConnectionError: configuration?.lastConnectionError ?? null,
    lastSyncAt: configuration?.lastSyncAt ?? null,
    lastSyncError: configuration?.lastSyncError ?? null
  };
}

export async function getPaperlessSettings(req, res) {
  res.set("Cache-Control", "no-store");
  return res.json(await presentSettings(req));
}

async function ensureGeneratedSecret(name, req) {
  const status = await getTenantSecretStatus(name);
  if (status.configured) return null;
  const value = crypto.randomBytes(32).toString("base64url");
  await setTenantSecret(name, value, auditContext(req));
  return value;
}

export async function savePaperlessSettings(req, res) {
  const baseUrl = normalizePaperlessBaseUrl(req.body?.baseUrl);
  const enabled = Boolean(req.body?.enabled);
  const autoAssignQr = req.body?.autoAssignQr !== false;
  const folders = normalizeFolders(req.body?.folders || []);
  const apiToken = typeof req.body?.apiToken === "string" ? req.body.apiToken.trim() : "";
  if (apiToken && (apiToken.length < 16 || apiToken.length > 4096)) {
    return res.status(400).json({ message: "Der Paperless-API-Token ist ungültig." });
  }
  if (apiToken) await setTenantSecret(PAPERLESS_API_TOKEN_SECRET, apiToken, auditContext(req));
  const tokenStatus = await getTenantSecretStatus(PAPERLESS_API_TOKEN_SECRET);
  if (enabled && !tokenStatus.configured) {
    return res.status(400).json({ message: "Zum Aktivieren muss ein Paperless-API-Token hinterlegt werden." });
  }

  await prisma.$transaction(async transaction => {
    const existing = await transaction.paperlessConfiguration.findFirst({
      include: { folders: { select: { id: true } } }
    });
    const configuration = existing
      ? await transaction.paperlessConfiguration.update({
          where: { id: existing.id },
          data: { baseUrl, enabled, autoAssignQr }
        })
      : await transaction.paperlessConfiguration.create({
          data: { baseUrl, enabled, autoAssignQr }
        });

    // Vorhandene Namen werden innerhalb derselben Transaktion kurz freigegeben,
    // damit auch Namenswechsel und das Ersetzen eines Ordners kollisionsfrei sind.
    for (const folder of existing?.folders || []) {
      await transaction.paperlessFolder.update({
        where: { id: folder.id },
        data: { name: `__paperless_tmp_${folder.id}` }
      });
    }

    const retainedIds = [];
    for (const folder of folders) {
      if (folder.id && existing?.folders.some(item => item.id === folder.id)) {
        await transaction.paperlessFolder.update({
          where: { id: folder.id },
          data: { name: folder.name, sortOrder: folder.sortOrder }
        });
        retainedIds.push(folder.id);
      } else {
        const created = await transaction.paperlessFolder.create({
          data: { configurationId: configuration.id, name: folder.name, sortOrder: folder.sortOrder }
        });
        retainedIds.push(created.id);
      }
    }
    const removed = existing?.folders.map(folder => folder.id).filter(id => !retainedIds.includes(id)) || [];
    if (removed.length) {
      await transaction.paperlessDocument.updateMany({
        where: { folderId: { in: removed } },
        data: {
          folderId: null,
          status: "inbox",
          assignmentSource: null,
          linkedById: null,
          linkedAt: null
        }
      });
      await transaction.paperlessFolder.deleteMany({ where: { id: { in: removed } } });
    }
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "paperless.configuration.update",
        entityType: "PaperlessConfiguration",
        entityId: configuration.id,
        metadata: { enabled, baseUrl, autoAssignQr, folderCount: folders.length },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null
      }
    });
  });

  const webhookSecret = await ensureGeneratedSecret(PAPERLESS_WEBHOOK_SECRET, req);
  await ensureGeneratedSecret(PAPERLESS_QR_SIGNING_SECRET, req);
  return res.json(await presentSettings(req, webhookSecret));
}

export async function testPaperlessConnection(req, res) {
  const configuration = await getPaperlessConfiguration();
  try {
    const { data, response } = await paperlessJson("documents/?page_size=1&ordering=-id", { configuration, allowDisabled: true });
    const now = new Date();
    const latestRemoteDocumentId = Number(data.results?.[0]?.id) || null;
    await prisma.paperlessConfiguration.update({
      where: { id: configuration.id },
      data: {
        lastConnectedAt: now,
        lastConnectionError: null,
        ...(configuration.lastRemoteDocumentId == null && latestRemoteDocumentId
          ? { lastRemoteDocumentId: latestRemoteDocumentId, lastSyncAt: now }
          : {})
      }
    });
    return res.json({
      success: true,
      connectedAt: now,
      paperlessVersion: response.headers.get("x-version"),
      apiVersion: response.headers.get("x-api-version")
    });
  } catch (error) {
    await prisma.paperlessConfiguration.update({
      where: { id: configuration.id },
      data: { lastConnectionError: error.message.slice(0, 1000) }
    });
    throw error;
  }
}

export async function rotatePaperlessWebhookSecret(req, res) {
  await getPaperlessConfiguration();
  const value = crypto.randomBytes(32).toString("base64url");
  await setTenantSecret(PAPERLESS_WEBHOOK_SECRET, value, auditContext(req));
  return res.json({ ...(await presentSettings(req)), webhookSecret: value });
}

export async function deletePaperlessApiToken(req, res) {
  await deleteTenantSecret(PAPERLESS_API_TOKEN_SECRET, auditContext(req));
  const configuration = await getPaperlessConfiguration({ required: false });
  if (configuration) {
    await prisma.paperlessConfiguration.update({
      where: { id: configuration.id },
      data: { enabled: false, lastConnectionError: "API-Token entfernt" }
    });
  }
  return res.json(await presentSettings(req));
}
