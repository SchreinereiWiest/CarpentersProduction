import net from "node:net";

import prisma from "../../infrastructure/database/prisma.js";

export const CONTACT_HISTORY_IMAP_PASSWORD_SECRET = "contact-history.imap-password";
export const CONTACT_HISTORY_QUEUE = "contact-history:imap:jobs";
export const CONTACT_HISTORY_PROCESSING_QUEUE = "contact-history:imap:processing";

export class ContactHistoryError extends Error {
  constructor(message, statusCode = 400, code = "CONTACT_HISTORY_INVALID") {
    super(message);
    this.name = "ContactHistoryError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function normalizeEmailAddress(value) {
  const email = String(value || "").trim().toLocaleLowerCase("en-US");
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeImapHost(value) {
  const host = String(value || "").trim().toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (
    !host
    || host.length > 253
    || net.isIP(host)
    || host === "localhost"
    || host.includes("/")
    || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host)
  ) {
    throw new ContactHistoryError("Bitte einen gültigen IMAP-Hostnamen eingeben. IP-Adressen und lokale Ziele sind nicht zulässig.", 400, "IMAP_HOST_INVALID");
  }
  return host;
}

const integerInRange = (value, fallback, minimum, maximum, message) => {
  const number = value == null ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new ContactHistoryError(message);
  }
  return number;
};

export function contactHistoryConfigurationData(body = {}) {
  const host = normalizeImapHost(body.host);
  const port = integerInRange(body.port, 993, 993, 993, "Aus Sicherheitsgründen wird ausschließlich IMAPS über Port 993 unterstützt.");
  const username = String(body.username || "").trim();
  if (!username || username.length > 320 || /[\r\n\0]/.test(username)) {
    throw new ContactHistoryError("Der IMAP-Benutzername ist ungültig.", 400, "IMAP_USERNAME_INVALID");
  }
  const accountEmail = normalizeEmailAddress(body.accountEmail);
  if (!accountEmail) {
    throw new ContactHistoryError("Bitte eine gültige E-Mail-Adresse des verbundenen Kontos eingeben.", 400, "IMAP_ACCOUNT_EMAIL_INVALID");
  }
  return {
    enabled: Boolean(body.enabled),
    host,
    port,
    username,
    accountEmail,
    mailbox: "INBOX",
    initialSyncDays: integerInRange(body.initialSyncDays, 90, 7, 365, "Der Erstabruf muss zwischen 7 und 365 Tagen liegen."),
    syncIntervalMinutes: integerInRange(body.syncIntervalMinutes, 5, 5, 60, "Das Abrufintervall muss zwischen 5 und 60 Minuten liegen.")
  };
}

export async function getContactHistoryConfiguration({ required = true } = {}) {
  const configuration = await prisma.contactHistoryConfiguration.findFirst();
  if (!configuration && required) {
    throw new ContactHistoryError("Der automatische Kontaktverlauf ist noch nicht eingerichtet.", 409, "CONTACT_HISTORY_NOT_CONFIGURED");
  }
  return configuration;
}

export function contactHistoryDedupeKey(tenantId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(tenantId))) {
    throw new ContactHistoryError("Ungültiger Mandant im Kontaktverlauf-Job.", 400, "CONTACT_HISTORY_JOB_INVALID");
  }
  return `contact-history:imap:lock:${tenantId}`;
}

export function safeImapError(error) {
  const code = String(error?.code || "").toLocaleUpperCase("en-US");
  const message = String(error?.message || "").toLocaleLowerCase("en-US");
  if (code.includes("AUTH") || message.includes("auth") || message.includes("login")) {
    return "Die IMAP-Anmeldung wurde abgelehnt. Bitte App-Passwort und Benutzernamen prüfen.";
  }
  if (code.includes("CERT") || code.includes("TLS") || message.includes("certificate") || message.includes("tls")) {
    return "Die TLS-Verbindung zum IMAP-Server konnte nicht sicher aufgebaut werden.";
  }
  if (code.includes("TIMEOUT") || message.includes("timed out") || message.includes("timeout")) {
    return "Der IMAP-Server hat nicht rechtzeitig geantwortet.";
  }
  if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ECONNRESET") {
    return "Der IMAP-Server ist nicht erreichbar.";
  }
  return "Der sichere IMAP-Abruf ist fehlgeschlagen.";
}
