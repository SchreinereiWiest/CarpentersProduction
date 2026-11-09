import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";

const { normalizePaperlessBaseUrl, paperlessApiUrl } = await import("../src/modules/paperless/paperless.service.js");
const { createPaperlessQrValue, verifyPaperlessQrValue } = await import("../src/modules/paperless/paperless-qr.service.js");
const { streamPaperlessResponse } = await import("../src/modules/paperless/paperless-stream.service.js");
const {
  isSupportedPaperlessUpload,
  paperlessTaskDocumentId,
  paperlessUploadTaskId
} = await import("../src/modules/paperless/paperless-upload.service.js");
const { presentLocalDocument } = await import("../src/modules/paperless/paperless.controller.js");

class ResponseSink extends Writable {
  constructor() {
    super();
    this.headers = new Map();
    this.chunks = [];
  }

  setHeader(name, value) {
    this.headers.set(String(name).toLowerCase(), value);
  }

  _write(chunk, _encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }
}

test("Paperless-Basis-URLs werden normalisiert und API-Pfade behalten Subpfade", () => {
  assert.equal(normalizePaperlessBaseUrl(" https://docs.example/paperless/ "), "https://docs.example/paperless");
  assert.equal(
    paperlessApiUrl("https://docs.example/paperless", "documents/42/").toString(),
    "https://docs.example/paperless/api/documents/42/"
  );
  assert.throws(() => normalizePaperlessBaseUrl("ftp://docs.example"), /HTTP oder HTTPS/);
  assert.throws(() => normalizePaperlessBaseUrl("https://user:secret@docs.example"), /ohne Zugangsdaten/);
});

test("CPD1-QR-Payloads sind signiert und mandantengebunden", () => {
  const tenantId = "00000000-0000-4000-8000-000000000001";
  const payload = {
    v: 1,
    tenantId,
    customerId: "00000000-0000-4000-8000-000000000002",
    projectId: "00000000-0000-4000-8000-000000000003",
    documentType: "Lieferschein"
  };
  const value = createPaperlessQrValue(payload, "test-secret-with-enough-entropy");
  assert.deepEqual(verifyPaperlessQrValue(value, "test-secret-with-enough-entropy", tenantId), payload);
  assert.equal(verifyPaperlessQrValue(`${value}x`, "test-secret-with-enough-entropy", tenantId), null);
  assert.equal(verifyPaperlessQrValue(value, "wrong-secret", tenantId), null);
  assert.equal(verifyPaperlessQrValue(value, "test-secret-with-enough-entropy", "00000000-0000-4000-8000-000000000004"), null);
});

test("Paperless-Streams werden vollständig übertragen und Streamabbrüche beendet", async () => {
  const complete = new ResponseSink();
  await streamPaperlessResponse({
    headers: new Headers({ "content-type": "application/pdf", "content-length": "9" }),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from("%PDF-test"));
        controller.close();
      }
    })
  }, complete, { inline: true });
  assert.equal(Buffer.concat(complete.chunks).toString(), "%PDF-test");
  assert.equal(complete.headers.get("content-type"), "application/pdf");
  assert.equal(complete.headers.has("content-length"), false);

  const interrupted = new ResponseSink();
  await assert.doesNotReject(() => streamPaperlessResponse({
    headers: new Headers({ "content-type": "application/pdf" }),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from("%PDF-"));
        controller.error(new DOMException("upstream timed out", "TimeoutError"));
      }
    })
  }, interrupted));
  assert.equal(interrupted.destroyed, true);
});

test("Paperless-Uploads validieren Dateien und normalisieren Task-Ergebnisse", () => {
  const taskId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(paperlessUploadTaskId(taskId), taskId);
  assert.equal(paperlessUploadTaskId({ task_id: taskId }), taskId);
  assert.equal(paperlessUploadTaskId("not-a-task"), null);
  assert.equal(paperlessTaskDocumentId({ related_document: 3967 }), 3967);
  assert.equal(paperlessTaskDocumentId({ result: '{"document_id":3968}' }), 3968);
  assert.equal(isSupportedPaperlessUpload({ mimetype: "application/pdf", buffer: Buffer.from("%PDF-test") }), true);
  assert.equal(isSupportedPaperlessUpload({ mimetype: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) }), true);
  assert.equal(isSupportedPaperlessUpload({ mimetype: "application/pdf", buffer: Buffer.from("not-pdf") }), false);
});

test("Lokale Carpenters-Belege werden für den gemeinsamen Eingang aufbereitet", () => {
  const receivedAt = new Date("2026-11-09T10:00:00.000Z");
  const linked = presentLocalDocument({
    id: "file-1",
    fileName: "beleg.pdf",
    mimeType: "application/pdf",
    status: "completed",
    projectId: "project-1",
    customerId: "customer-1",
    documentFolderId: null,
    project: { id: "project-1", title: "Küche" },
    customer: { id: "customer-1", companyName: "Muster GmbH" },
    documentFolder: null,
    uploadedAt: receivedAt,
    updatedAt: receivedAt
  });
  assert.equal(linked.source, "carpenters");
  assert.equal(linked.status, "linked");
  assert.equal(linked.project.title, "Küche");

  const automaticallyLinked = presentLocalDocument({
    id: "file-qr",
    fileName: "qr-beleg.pdf",
    mimeType: "application/pdf",
    status: "qr-linked",
    projectId: "project-1",
    customerId: "customer-1",
    documentFolderId: null,
    project: { id: "project-1", title: "Küche" },
    customer: { id: "customer-1", companyName: "Muster GmbH" },
    documentFolder: null,
    uploadedAt: receivedAt,
    updatedAt: receivedAt
  });
  assert.equal(automaticallyLinked.assignmentSource, "qr");
  assert.equal(automaticallyLinked.qrStatus, "matched");

  const inbox = presentLocalDocument({
    ...linked,
    id: "file-2",
    fileName: "offen.pdf",
    projectId: null,
    customerId: null,
    documentFolderId: null,
    project: null,
    customer: null,
    documentFolder: null,
    uploadedAt: receivedAt,
    updatedAt: receivedAt
  });
  assert.equal(inbox.status, "inbox");
});
