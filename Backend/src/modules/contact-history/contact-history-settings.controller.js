import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import {
  deleteTenantSecret,
  getTenantSecretStatus,
  setTenantSecret
} from "../attachment-search/tenant-secrets.service.js";
import { testContactHistoryConnection } from "./contact-history-imap.service.js";
import { enqueueContactHistorySync } from "./contact-history-queue.service.js";
import {
  CONTACT_HISTORY_IMAP_PASSWORD_SECRET,
  ContactHistoryError,
  contactHistoryConfigurationData,
  getContactHistoryConfiguration
} from "./contact-history.service.js";

const auditContext = req => ({
  actorUserId: req.user.id,
  ipAddress: req.ip || null,
  userAgent: req.get("user-agent") || null
});

async function presentSettings() {
  const [configuration, passwordStatus] = await Promise.all([
    getContactHistoryConfiguration({ required: false }),
    getTenantSecretStatus(CONTACT_HISTORY_IMAP_PASSWORD_SECRET)
  ]);
  return {
    configured: Boolean(configuration),
    connected: Boolean(configuration?.enabled && passwordStatus.configured && configuration.lastConnectedAt && !configuration.lastSyncError),
    enabled: configuration?.enabled ?? false,
    host: configuration?.host ?? "",
    port: configuration?.port ?? 993,
    username: configuration?.username ?? "",
    accountEmail: configuration?.accountEmail ?? "",
    mailbox: "INBOX",
    sentMailbox: configuration?.sentMailbox ?? null,
    initialSyncDays: configuration?.initialSyncDays ?? 90,
    syncIntervalMinutes: configuration?.syncIntervalMinutes ?? 5,
    passwordConfigured: passwordStatus.configured,
    passwordUpdatedAt: passwordStatus.updatedAt,
    lastConnectedAt: configuration?.lastConnectedAt ?? null,
    lastSyncAt: configuration?.lastSyncAt ?? null,
    lastSyncError: configuration?.lastSyncError ?? null,
    consecutiveFailures: configuration?.consecutiveFailures ?? 0
  };
}

export async function getContactHistorySettings(_req, res) {
  res.set("Cache-Control", "no-store");
  return res.json(await presentSettings());
}

export async function saveContactHistorySettings(req, res) {
  const data = contactHistoryConfigurationData(req.body);
  const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";
  if (password && (password.length < 8 || password.length > 4096 || /[\r\n\0]/.test(password))) {
    throw new ContactHistoryError("Das IMAP-App-Passwort ist ungültig.", 400, "IMAP_PASSWORD_INVALID");
  }
  if (password) await setTenantSecret(CONTACT_HISTORY_IMAP_PASSWORD_SECRET, password, auditContext(req));
  const passwordStatus = await getTenantSecretStatus(CONTACT_HISTORY_IMAP_PASSWORD_SECRET);
  if (data.enabled && !passwordStatus.configured) {
    throw new ContactHistoryError("Zum Aktivieren muss ein IMAP-App-Passwort hinterlegt werden.", 400, "IMAP_PASSWORD_MISSING");
  }

  await prisma.$transaction(async transaction => {
    const existing = await transaction.contactHistoryConfiguration.findFirst();
    const identityChanged = existing && (
      existing.host !== data.host
      || existing.port !== data.port
      || existing.username !== data.username
      || existing.accountEmail !== data.accountEmail
      || existing.mailbox !== data.mailbox
    );
    const configuration = existing
      ? await transaction.contactHistoryConfiguration.update({
          where: { id: existing.id },
          data: {
            ...data,
            ...(identityChanged ? {
              uidValidity: null,
              lastUid: 0,
              sentMailbox: null,
              sentUidValidity: null,
              lastSentUid: 0,
              lastSyncError: null,
              consecutiveFailures: 0
            } : {})
          }
        })
      : await transaction.contactHistoryConfiguration.create({ data });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "contact-history.configuration.update",
        entityType: "ContactHistoryConfiguration",
        entityId: configuration.id,
        metadata: {
          enabled: data.enabled,
          host: data.host,
          port: data.port,
          accountEmail: data.accountEmail,
          mailbox: data.mailbox,
          initialSyncDays: data.initialSyncDays,
          syncIntervalMinutes: data.syncIntervalMinutes,
          passwordReplaced: Boolean(password)
        },
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null
      }
    });
  });
  return res.json(await presentSettings());
}

export async function testContactHistorySettings(_req, res) {
  const result = await testContactHistoryConnection();
  return res.json({ success: true, ...result });
}

export async function queueContactHistorySync(_req, res) {
  const configuration = await getContactHistoryConfiguration();
  if (!configuration.enabled) {
    throw new ContactHistoryError("Der automatische Kontaktverlauf ist deaktiviert.", 409, "CONTACT_HISTORY_DISABLED");
  }
  const queued = await enqueueContactHistorySync(getTenantId());
  return res.status(202).json({ queued, message: queued ? "Abruf wurde eingeplant." : "Ein Abruf läuft bereits oder ist schon eingeplant." });
}

export async function deleteContactHistoryPassword(req, res) {
  await deleteTenantSecret(CONTACT_HISTORY_IMAP_PASSWORD_SECRET, auditContext(req));
  const configuration = await getContactHistoryConfiguration({ required: false });
  if (configuration) {
    await prisma.contactHistoryConfiguration.update({
      where: { id: configuration.id },
      data: { enabled: false, lastSyncError: "IMAP-App-Passwort entfernt", consecutiveFailures: 0 }
    });
  }
  return res.json(await presentSettings());
}
