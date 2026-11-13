import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantSecret } from "../attachment-search/tenant-secrets.service.js";
import {
  CONTACT_HISTORY_IMAP_PASSWORD_SECRET,
  ContactHistoryError,
  getContactHistoryConfiguration,
  normalizeEmailAddress,
  safeImapError
} from "./contact-history.service.js";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_CONTENT_CHARACTERS = 50_000;
const MAX_MESSAGES_PER_RUN = 100;

const addressesFrom = value => (Array.isArray(value) ? value : value?.value || [])
  .map(item => normalizeEmailAddress(item?.address))
  .filter(Boolean);

const envelopeAddresses = value => (Array.isArray(value) ? value : [])
  .map(item => normalizeEmailAddress(item?.address))
  .filter(Boolean);

const unique = values => [...new Set(values.filter(Boolean))];

function attachmentMetadataFromStructure(node, result = []) {
  if (!node) return result;
  const name = node.dispositionParameters?.filename || node.parameters?.name || null;
  if (name || String(node.disposition || "").toLocaleLowerCase("en-US") === "attachment") {
    result.push({
      name: String(name || "Anhang").slice(0, 500),
      contentType: String(node.type || "application/octet-stream").slice(0, 200),
      size: Number.isSafeInteger(node.size) ? node.size : null,
      contentId: node.id ? String(node.id).slice(0, 500) : null
    });
  }
  for (const child of node.childNodes || []) attachmentMetadataFromStructure(child, result);
  return result;
}

function createClient(configuration, password, { verifyOnly = false } = {}) {
  return new ImapFlow({
    host: configuration.host,
    port: configuration.port,
    secure: true,
    auth: { user: configuration.username, pass: password },
    verifyOnly,
    logger: false,
    logRaw: false,
    emitLogs: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    maxLineLength: 2 * 1024 * 1024,
    maxLiteralSize: 12 * 1024 * 1024,
    maxResponseSize: 14 * 1024 * 1024,
    maxResponseTokens: 250_000,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      servername: configuration.host
    },
    clientInfo: { name: "Carpenters Production CRM", version: "1" }
  });
}

async function passwordForConfiguration() {
  const password = await getTenantSecret(CONTACT_HISTORY_IMAP_PASSWORD_SECRET);
  if (!password) {
    throw new ContactHistoryError("Es ist kein IMAP-App-Passwort hinterlegt.", 409, "IMAP_PASSWORD_MISSING");
  }
  return password;
}

const normalizedMailboxName = value => String(value || "")
  .normalize("NFKC")
  .trim()
  .toLocaleLowerCase("de-DE");

export function findSentMailbox(mailboxes, configuredPath = null) {
  if (!Array.isArray(mailboxes)) return null;
  if (configuredPath) {
    const configured = mailboxes.find(mailbox => mailbox.path === configuredPath);
    if (configured) return configured.path;
  }
  const specialUse = mailboxes.find(mailbox => normalizedMailboxName(mailbox.specialUse) === "\\sent");
  if (specialUse) return specialUse.path;
  const sentNames = new Set([
    "sent",
    "sent items",
    "sent mail",
    "gesendet",
    "gesendete elemente",
    "gesendete objekte"
  ]);
  return mailboxes.find(mailbox => sentNames.has(normalizedMailboxName(mailbox.name)))?.path || null;
}

async function listMailboxes(client, configuredSentMailbox = null) {
  return client.list(configuredSentMailbox
    ? { specialUseHints: { sent: configuredSentMailbox } }
    : undefined);
}

export async function testContactHistoryConnection() {
  const configuration = await getContactHistoryConfiguration();
  const password = await passwordForConfiguration();
  const client = createClient(configuration, password);
  try {
    await client.connect();
    const mailboxes = await listMailboxes(client, configuration.sentMailbox);
    const sentMailbox = findSentMailbox(mailboxes, configuration.sentMailbox);
    const mailbox = await client.mailboxOpen(configuration.mailbox, { readOnly: true });
    const mailboxPath = mailbox.path;
    const messages = mailbox.exists;
    const sentMessages = sentMailbox
      ? (await client.mailboxOpen(sentMailbox, { readOnly: true })).exists
      : null;
    const now = new Date();
    await prisma.contactHistoryConfiguration.update({
      where: { id: configuration.id },
      data: { sentMailbox, lastConnectedAt: now, lastSyncError: null, consecutiveFailures: 0 }
    });
    return { connectedAt: now, mailbox: mailboxPath, messages, sentMailbox, sentMessages };
  } catch (error) {
    const safeMessage = safeImapError(error);
    await prisma.contactHistoryConfiguration.update({
      where: { id: configuration.id },
      data: { lastSyncError: safeMessage, consecutiveFailures: { increment: 1 } }
    }).catch(() => {});
    throw new ContactHistoryError(safeMessage, 424, "IMAP_CONNECTION_FAILED");
  } finally {
    if (!client.isClosed) await client.logout().catch(() => client.close());
  }
}

function messageDate(parsed, message) {
  const candidate = parsed?.date || message.envelope?.date || message.internalDate || new Date();
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parsedAttachments(parsed, structure) {
  if (parsed?.attachments?.length) {
    return parsed.attachments.slice(0, 100).map(attachment => ({
      name: String(attachment.filename || "Anhang").slice(0, 500),
      contentType: String(attachment.contentType || "application/octet-stream").slice(0, 200),
      size: Number.isSafeInteger(attachment.size) ? attachment.size : null,
      contentId: attachment.contentId ? String(attachment.contentId).slice(0, 500) : null
    }));
  }
  return attachmentMetadataFromStructure(structure).slice(0, 100);
}

async function parseMessage(message) {
  if (!message.source || (message.size && message.size > MAX_SOURCE_BYTES)) return null;
  try {
    return await simpleParser(message.source, {
      skipImageLinks: true,
      skipTextLinks: true,
      keepCidLinks: true,
      checksumAlgo: false,
      maxHtmlLengthToParse: 1_000_000,
      maxHeadSize: 1_000_000,
      maxChildNodes: 500
    });
  } catch {
    return null;
  }
}

function messageAddresses(parsed, envelope) {
  return {
    from: unique(parsed ? addressesFrom(parsed.from) : envelopeAddresses(envelope?.from)),
    to: unique(parsed ? addressesFrom(parsed.to) : envelopeAddresses(envelope?.to)),
    cc: unique(parsed ? addressesFrom(parsed.cc) : envelopeAddresses(envelope?.cc))
  };
}

function contentForMessage(parsed, oversized) {
  const content = String(parsed?.text || "").replace(/\0/g, "").trim();
  if (content) return content.slice(0, MAX_CONTENT_CHARACTERS);
  if (oversized) return "Der Nachrichtentext wurde wegen der Nachrichtengröße nicht in das CRM übernommen. Die Originalnachricht bleibt im verbundenen E-Mail-Konto erhalten.";
  return "Diese E-Mail enthält keinen darstellbaren Textinhalt. Die Originalnachricht bleibt im verbundenen E-Mail-Konto erhalten.";
}

async function customerEmailIndex() {
  const customers = await prisma.customer.findMany({
    where: { email: { not: null }, deletedAt: null },
    select: { id: true, email: true }
  });
  const customersByEmail = new Map();
  for (const customer of customers) {
    const email = normalizeEmailAddress(customer.email);
    if (!email) continue;
    const matches = customersByEmail.get(email) || [];
    matches.push(customer);
    customersByEmail.set(email, matches);
  }
  return customersByEmail;
}

async function syncMailbox(client, configuration, customersByEmail, {
  path,
  role,
  storedUidValidity,
  storedLastUid
}) {
  const mailbox = await client.mailboxOpen(path, { readOnly: true });
  const uidValidity = String(mailbox.uidValidity);
  const cursor = storedUidValidity === uidValidity ? storedLastUid : 0;
  const since = new Date(Date.now() - configuration.initialSyncDays * 24 * 60 * 60 * 1_000);
  const found = await client.search({ since }, { uid: true });
  const uids = (Array.isArray(found) ? found : [])
    .filter(uid => Number.isSafeInteger(uid) && uid > cursor)
    .sort((left, right) => left - right)
    .slice(0, MAX_MESSAGES_PER_RUN);

  let imported = 0;
  let examined = 0;
  let newestUid = cursor;
  if (uids.length) {
    for await (const message of client.fetch(uids, {
      uid: true,
      envelope: true,
      internalDate: true,
      size: true,
      bodyStructure: true,
      source: { maxLength: MAX_SOURCE_BYTES }
    }, { uid: true })) {
      examined += 1;
      newestUid = Math.max(newestUid, message.uid);
      const parsed = await parseMessage(message);
      const addresses = messageAddresses(parsed, message.envelope);
      if (role === "sent" && !addresses.from.includes(configuration.accountEmail)) continue;
      const relatedAddresses = unique(role === "sent"
        ? [...addresses.to, ...addresses.cc]
        : [...addresses.from, ...addresses.to, ...addresses.cc])
        .filter(email => email !== configuration.accountEmail);
      const matchedCustomers = new Map();
      for (const email of relatedAddresses) {
        for (const customer of customersByEmail.get(email) || []) matchedCustomers.set(customer.id, customer);
      }
      if (!matchedCustomers.size) continue;

      const occurredAt = messageDate(parsed, message);
      const subject = String(parsed?.subject || message.envelope?.subject || "Ohne Betreff").slice(0, 500);
      const messageId = String(parsed?.messageId || message.envelope?.messageId || "").slice(0, 1000) || null;
      const fromAddress = addresses.from[0] || null;
      const direction = role === "sent" || addresses.from.includes(configuration.accountEmail) ? "outbound" : "inbound";
      const attachments = parsedAttachments(parsed, message.bodyStructure);
      const externalId = `${configuration.id}:${role}:${uidValidity}:${message.uid}`;
      const content = contentForMessage(parsed, Number(message.size) > MAX_SOURCE_BYTES);

      for (const customer of matchedCustomers.values()) {
        const exists = await prisma.communication.findFirst({
          where: {
            customerId: customer.id,
            source: "imap",
            OR: [
              { externalId },
              ...(messageId ? [{ messageId }] : [])
            ]
          },
          select: { id: true }
        });
        if (exists) continue;
        await prisma.communication.create({
          data: {
            customerId: customer.id,
            type: "email",
            subject,
            content,
            source: "imap",
            externalId,
            messageId,
            direction,
            fromAddress,
            toAddresses: addresses.to,
            ccAddresses: addresses.cc,
            occurredAt,
            attachments,
            createdAt: occurredAt
          }
        });
        imported += 1;
      }
    }
  }
  return {
    imported,
    examined,
    uidValidity,
    lastUid: newestUid,
    pending: uids.length === MAX_MESSAGES_PER_RUN
  };
}

export async function syncContactHistory() {
  const configuration = await getContactHistoryConfiguration({ required: false });
  if (!configuration?.enabled) return { imported: 0, examined: 0, skipped: true };
  const password = await passwordForConfiguration();
  const client = createClient(configuration, password);
  try {
    await client.connect();
    const [mailboxes, customersByEmail] = await Promise.all([
      listMailboxes(client, configuration.sentMailbox),
      customerEmailIndex()
    ]);
    const sentMailbox = findSentMailbox(mailboxes, configuration.sentMailbox);
    const inbox = await syncMailbox(client, configuration, customersByEmail, {
      path: configuration.mailbox,
      role: "inbox",
      storedUidValidity: configuration.uidValidity,
      storedLastUid: configuration.lastUid
    });
    const sent = sentMailbox
      ? await syncMailbox(client, configuration, customersByEmail, {
          path: sentMailbox,
          role: "sent",
          storedUidValidity: configuration.sentUidValidity,
          storedLastUid: configuration.lastSentUid
        })
      : { imported: 0, examined: 0, uidValidity: null, lastUid: 0, pending: false };

    const now = new Date();
    await prisma.contactHistoryConfiguration.update({
      where: { id: configuration.id },
      data: {
        uidValidity: inbox.uidValidity,
        lastUid: inbox.lastUid,
        sentMailbox,
        sentUidValidity: sent.uidValidity,
        lastSentUid: sent.lastUid,
        lastConnectedAt: now,
        lastSyncAt: now,
        lastSyncError: null,
        consecutiveFailures: 0
      }
    });
    return {
      imported: inbox.imported + sent.imported,
      examined: inbox.examined + sent.examined,
      sentMailbox,
      pending: inbox.pending || sent.pending
    };
  } catch (error) {
    const safeMessage = error instanceof ContactHistoryError ? error.message : safeImapError(error);
    await prisma.contactHistoryConfiguration.update({
      where: { id: configuration.id },
      data: { lastSyncAt: new Date(), lastSyncError: safeMessage, consecutiveFailures: { increment: 1 } }
    }).catch(() => {});
    if (error instanceof ContactHistoryError) throw error;
    throw new ContactHistoryError(safeMessage, 424, "IMAP_SYNC_FAILED");
  } finally {
    if (!client.isClosed) await client.logout().catch(() => client.close());
  }
}
