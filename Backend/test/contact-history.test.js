import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactHistoryError,
  contactHistoryConfigurationData,
  normalizeEmailAddress,
  normalizeImapHost,
  safeImapError
} from "../src/modules/contact-history/contact-history.service.js";
import { parseValkeyReply } from "../src/infrastructure/queue/valkey.js";
import { findSentMailbox } from "../src/modules/contact-history/contact-history-imap.service.js";
import {
  normalizeCountryCode,
  normalizePhoneNumber,
  parseFreePbxWebhook
} from "../src/modules/contact-history/freepbx.service.js";

test("contact history accepts a TLS-only IMAP configuration", () => {
  const configuration = contactHistoryConfigurationData({
    enabled: true,
    host: "IMAP.Example.DE.",
    port: 993,
    username: "crm@example.de",
    accountEmail: "CRM@Example.DE",
    initialSyncDays: 90,
    syncIntervalMinutes: 5
  });
  assert.equal(configuration.host, "imap.example.de");
  assert.equal(configuration.accountEmail, "crm@example.de");
  assert.equal(configuration.mailbox, "INBOX");
  assert.equal(configuration.port, 993);
});

test("contact history rejects cleartext, IP and local IMAP targets", () => {
  assert.throws(() => contactHistoryConfigurationData({
    host: "imap.example.de",
    port: 143,
    username: "crm",
    accountEmail: "crm@example.de"
  }), ContactHistoryError);
  assert.throws(() => normalizeImapHost("127.0.0.1"), /nicht zulässig/);
  assert.throws(() => normalizeImapHost("localhost"), /nicht zulässig/);
});

test("contact history normalizes customer addresses and redacts server errors", () => {
  assert.equal(normalizeEmailAddress(" Kunde@Example.DE "), "kunde@example.de");
  assert.equal(normalizeEmailAddress("not-an-email"), null);
  assert.equal(
    safeImapError(Object.assign(new Error("authentication failed for secret user"), { code: "AUTHENTICATIONFAILED" })),
    "Die IMAP-Anmeldung wurde abgelehnt. Bitte App-Passwort und Benutzernamen prüfen."
  );
  assert.equal(safeImapError(new Error("server leaked internal detail")), "Der sichere IMAP-Abruf ist fehlgeschlagen.");
});

test("contact history detects the sent mailbox by special-use flag and localized name", () => {
  assert.equal(findSentMailbox([
    { path: "INBOX", name: "INBOX" },
    { path: "Sent", name: "Sent", specialUse: "\\Sent" }
  ]), "Sent");
  assert.equal(findSentMailbox([
    { path: "INBOX/Gesendet", name: "Gesendet" }
  ]), "INBOX/Gesendet");
  assert.equal(findSentMailbox([
    { path: "Custom Sent", name: "Ablage" }
  ], "Custom Sent"), "Custom Sent");
  assert.equal(findSentMailbox([{ path: "INBOX", name: "INBOX" }]), null);
});

test("Valkey worker parser handles queue replies without exposing payloads", () => {
  assert.deepEqual(parseValkeyReply(Buffer.from(":1\r\n")), { value: 1, offset: 4 });
  assert.deepEqual(parseValkeyReply(Buffer.from("$3\r\njob\r\n")), { value: "job", offset: 9 });
  assert.deepEqual(parseValkeyReply(Buffer.from("*2\r\n$5\r\nqueue\r\n$3\r\njob\r\n")), {
    value: ["queue", "job"],
    offset: 24
  });
  assert.equal(parseValkeyReply(Buffer.from("$5\r\npar")), null);
});

test("FreePBX normalizes German local and international caller numbers", () => {
  assert.equal(normalizeCountryCode("0049"), "+49");
  assert.equal(normalizePhoneNumber("0711 / 123 45-0", "+49"), "+49711123450");
  assert.equal(normalizePhoneNumber("0049 711 123450", "+49"), "+49711123450");
  assert.equal(normalizePhoneNumber("+49 (711) 123450", "+49"), "+49711123450");
  assert.equal(normalizePhoneNumber("49711123450", "+49"), "+49711123450");
  assert.equal(normalizePhoneNumber("anonymous", "+49"), null);
});

test("FreePBX accepts Asterisk linkedid aliases and rejects incomplete hooks", () => {
  const event = parseFreePbxWebhook("ringing", {
    Linkedid: "asterisk-1794567890.42",
    CallerIDNum: "0711123450",
    Exten: "20",
    timestamp: "2026-11-13T10:00:00.000Z"
  }, "+49");
  assert.equal(event.externalId, "asterisk-1794567890.42");
  assert.equal(event.normalizedCallerNumber, "+49711123450");
  assert.equal(event.calledNumber, "20");
  assert.throws(() => parseFreePbxWebhook("ringing", { caller_number: "0711123450" }), /call_id/);
  assert.throws(() => parseFreePbxWebhook("unknown", {}), /Unbekanntes/);
});
