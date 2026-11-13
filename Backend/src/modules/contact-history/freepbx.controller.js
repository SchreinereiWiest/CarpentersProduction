import crypto from "node:crypto";

import prisma from "../../infrastructure/database/prisma.js";
import {
  deleteTenantSecret,
  getTenantSecretStatus,
  setTenantSecret
} from "../attachment-search/tenant-secrets.service.js";
import { subscribeToPhoneCalls } from "./freepbx-call-events.service.js";
import {
  FREEPBX_WEBHOOK_SECRET,
  activePhoneCalls,
  normalizeCountryCode
} from "./freepbx.service.js";

const auditContext = req => ({
  actorUserId: req.user.id,
  ipAddress: req.ip || null,
  userAgent: req.get("user-agent") || null
});

async function presentSettings(req, oneTimeSecret = null) {
  const [configuration, secret] = await Promise.all([
    prisma.freePbxConfiguration.findFirst(),
    getTenantSecretStatus(FREEPBX_WEBHOOK_SECRET)
  ]);
  return {
    tenantId: req.tenant.id,
    configured: Boolean(configuration),
    enabled: configuration?.enabled ?? false,
    defaultCountryCode: configuration?.defaultCountryCode ?? "+49",
    secretConfigured: secret.configured,
    secretUpdatedAt: secret.updatedAt,
    lastWebhookAt: configuration?.lastWebhookAt ?? null,
    ...(oneTimeSecret ? { webhookSecret: oneTimeSecret } : {})
  };
}

export async function getFreePbxSettings(req, res) {
  res.set("Cache-Control", "no-store");
  return res.json(await presentSettings(req));
}

export async function saveFreePbxSettings(req, res) {
  const enabled = Boolean(req.body?.enabled);
  const defaultCountryCode = normalizeCountryCode(req.body?.defaultCountryCode);
  let oneTimeSecret = null;
  const secretStatus = await getTenantSecretStatus(FREEPBX_WEBHOOK_SECRET);
  if (!secretStatus.configured) {
    oneTimeSecret = crypto.randomBytes(32).toString("base64url");
    await setTenantSecret(FREEPBX_WEBHOOK_SECRET, oneTimeSecret, auditContext(req));
  }
  await prisma.$transaction(async transaction => {
    const existing = await transaction.freePbxConfiguration.findFirst({ select: { id: true } });
    const configuration = existing
      ? await transaction.freePbxConfiguration.update({ where: { id: existing.id }, data: { enabled, defaultCountryCode } })
      : await transaction.freePbxConfiguration.create({ data: { enabled, defaultCountryCode } });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "contact-history.freepbx.configuration.update",
        entityType: "FreePbxConfiguration",
        entityId: configuration.id,
        metadata: { enabled, defaultCountryCode, secretCreated: Boolean(oneTimeSecret) },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null
      }
    });
  });
  return res.json(await presentSettings(req, oneTimeSecret));
}

export async function rotateFreePbxSecret(req, res) {
  const configuration = await prisma.freePbxConfiguration.findFirst({ select: { id: true } });
  if (!configuration) {
    return res.status(409).json({ message: "Bitte die FreePBX-Konfiguration zuerst speichern." });
  }
  const oneTimeSecret = crypto.randomBytes(32).toString("base64url");
  await setTenantSecret(FREEPBX_WEBHOOK_SECRET, oneTimeSecret, auditContext(req));
  return res.json(await presentSettings(req, oneTimeSecret));
}

export async function disconnectFreePbx(req, res) {
  await deleteTenantSecret(FREEPBX_WEBHOOK_SECRET, auditContext(req));
  const configuration = await prisma.freePbxConfiguration.findFirst({ select: { id: true } });
  if (configuration) {
    await prisma.freePbxConfiguration.update({ where: { id: configuration.id }, data: { enabled: false } });
  }
  return res.json(await presentSettings(req));
}

export async function getActivePhoneCalls(_req, res) {
  res.set("Cache-Control", "no-store");
  return res.json({ calls: await activePhoneCalls() });
}

export function streamPhoneCalls(req, res) {
  return subscribeToPhoneCalls(req, res);
}

