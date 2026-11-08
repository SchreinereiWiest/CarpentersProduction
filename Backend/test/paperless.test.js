import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";

const { normalizePaperlessBaseUrl, paperlessApiUrl } = await import("../src/modules/paperless/paperless.service.js");
const { createPaperlessQrValue, verifyPaperlessQrValue } = await import("../src/modules/paperless/paperless-qr.service.js");
const { streamPaperlessResponse } = await import("../src/modules/paperless/paperless-stream.service.js");

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
