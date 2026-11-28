import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";

const { normalizePaperlessBaseUrl, paperlessApiUrl } = await import("../src/modules/paperless/paperless.service.js");
const { buildPaperlessSplitPlan, createPaperlessQrValue, selectPaperlessQrAssignment, verifyPaperlessQrValue } = await import("../src/modules/paperless/paperless-qr.service.js");
const { streamPaperlessResponse } = await import("../src/modules/paperless/paperless-stream.service.js");
const {
  isSupportedPaperlessUpload,
  paperlessTaskDocumentId,
  paperlessUploadTaskId
} = await import("../src/modules/paperless/paperless-upload.service.js");
const { presentGarageFile, presentLocalDocument } = await import("../src/modules/paperless/paperless.controller.js");

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
    documentType: "Lieferschein",
    wholePdf: true
  };
  const value = createPaperlessQrValue(payload, "test-secret-with-enough-entropy");
  assert.deepEqual(verifyPaperlessQrValue(value, "test-secret-with-enough-entropy", tenantId), payload);
  assert.equal(verifyPaperlessQrValue(`${value}x`, "test-secret-with-enough-entropy", tenantId), null);
  assert.equal(verifyPaperlessQrValue(value, "wrong-secret", tenantId), null);
  assert.equal(verifyPaperlessQrValue(value, "test-secret-with-enough-entropy", "00000000-0000-4000-8000-000000000004"), null);
  const invalidScope = createPaperlessQrValue({ ...payload, wholePdf: "yes" }, "test-secret-with-enough-entropy");
  assert.equal(verifyPaperlessQrValue(invalidScope, "test-secret-with-enough-entropy", tenantId), null);
});

test("ein Gesamt-PDF-QR hat beim Einlesen Vorrang vor seitenspezifischen QRs", () => {
  const pageAssignment = { sourcePage: 1, payload: { projectId: "project-a", wholePdf: false } };
  const wholePdfAssignment = { sourcePage: 4, payload: { projectId: "project-b", wholePdf: true } };

  assert.equal(selectPaperlessQrAssignment([pageAssignment, wholePdfAssignment]), wholePdfAssignment);
  assert.equal(selectPaperlessQrAssignment([pageAssignment]), pageAssignment);
  assert.equal(selectPaperlessQrAssignment([]), null);
});

test("normale Dokument-QRs bilden fortlaufende Paperless-Segmente", () => {
  const plan = buildPaperlessSplitPlan([
    { sourceKind: "document", sourcePage: 1, projectId: "project-a", payload: { wholePdf: false } },
    { sourceKind: "measurement", sourcePage: 2, projectId: "project-a", payload: {} },
    { sourceKind: "document", sourcePage: 4, projectId: "project-a", payload: { wholePdf: false } },
    { sourceKind: "document", sourcePage: 7, projectId: "project-b", payload: { wholePdf: false } }
  ], 9);

  assert.deepEqual(plan.pages, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  assert.deepEqual(plan.operations.slice(2, 5), [
    { page: 3, doc: 0 },
    { page: 4, doc: 1 },
    { page: 5, doc: 1 }
  ]);
  assert.equal(buildPaperlessSplitPlan([
    { sourceKind: "document", sourcePage: 1, projectId: "project-a", payload: { wholePdf: true } },
    { sourceKind: "document", sourcePage: 4, projectId: "project-a", payload: { wholePdf: false } }
  ], 6), null);
});

test("ein Gesamt-PDF-QR reicht bis zum ersten QR eines anderen Projekts", () => {
  const plan = buildPaperlessSplitPlan([
    { sourceKind: "document", sourcePage: 1, projectId: "project-a", payload: { wholePdf: true } },
    { sourceKind: "measurement", sourcePage: 3, projectId: "project-a", payload: {} },
    { sourceKind: "document", sourcePage: 5, projectId: "project-b", payload: { wholePdf: false } },
    { sourceKind: "measurement", sourcePage: 6, projectId: "project-b", payload: {} },
    { sourceKind: "document", sourcePage: 8, projectId: "project-b", payload: { wholePdf: false } }
  ], 10);

  assert.deepEqual(plan.pages, [
    [1, 2, 3, 4],
    [5, 6, 7],
    [8, 9, 10]
  ]);
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
    serverVersion: 3,
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

test("Garage-Dateien werden für die Carpenters-Bibliothek aufbereitet", () => {
  const uploadedAt = new Date("2026-11-10T10:00:00.000Z");
  const file = presentGarageFile({
    id: "file-3",
    fileName: "projektplan.pdf",
    originalName: "Projektplan Küche.pdf",
    mimeType: "application/pdf",
    fileSize: 12345,
    serverVersion: 3,
    category: "production-attachment",
    projectId: "project-1",
    customerId: "customer-1",
    documentFolderId: null,
    project: { id: "project-1", title: "Küche", projectNumber: "P-100" },
    customer: { id: "customer-1", companyName: "Muster GmbH" },
    documentFolder: null,
    uploadedAt
  });
  assert.equal(file.source, "carpenters");
  assert.equal(file.title, "Projektplan Küche.pdf");
  assert.equal(file.documentType, "PDF");
  assert.equal(file.status, "linked");
  assert.equal(file.project.projectNumber, "P-100");
  assert.equal(file.serverVersion, 3);
});
