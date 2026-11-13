import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const EXPECTED_STREAM_ERRORS = new Set([
  "AbortError",
  "TimeoutError",
  "ERR_STREAM_PREMATURE_CLOSE"
]);

/**
 * Streamt eine Paperless-Antwort, ohne dass ein Browserabbruch oder ein
 * Upstream-Timeout als unbehandeltes Readable-Event den Backendprozess beendet.
 */
export async function streamPaperlessResponse(paperlessResponse, res, { inline = false } = {}) {
  // Node fetch entpackt gzip/br automatisch, lässt aber die Content-Length des
  // komprimierten Upstream-Bodys in den Headern stehen. Diese Länge darf nicht
  // weitergegeben werden, sonst schneiden Node/Traefik das entpackte PDF vor
  // dem %%EOF-Marker ab. Ohne Content-Length wird vollständig chunked gestreamt.
  for (const header of ["content-type", "etag", "last-modified"]) {
    const value = paperlessResponse.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  const disposition = paperlessResponse.headers.get("content-disposition");
  if (disposition) {
    res.setHeader("content-disposition", inline ? disposition.replace(/^attachment/i, "inline") : disposition);
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!paperlessResponse.body) return res.end();

  try {
    await pipeline(Readable.fromWeb(paperlessResponse.body), res);
  } catch (error) {
    if (res.destroyed || EXPECTED_STREAM_ERRORS.has(error?.name) || EXPECTED_STREAM_ERRORS.has(error?.code)) {
      if (!res.destroyed) res.destroy();
      return;
    }
    if (res.headersSent) {
      res.destroy();
      return;
    }
    throw error;
  }
}
