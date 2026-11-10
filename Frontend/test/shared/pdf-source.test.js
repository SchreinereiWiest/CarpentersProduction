import { describe, expect, it } from "vitest";

import { pdfSourceUsesCredentials } from "../../src/shared/pdf/pdfSource.js";

describe("PDF-Quellen und Browser-Zugangsdaten", () => {
  const appOrigin = "http://av.localhost";

  it("sendet Cookies nur an die Carpenters-Origin", () => {
    expect(pdfSourceUsesCredentials("/api/paperless/documents/1/content", appOrigin)).toBe(true);
    expect(pdfSourceUsesCredentials("http://av.localhost/api/files/1", appOrigin)).toBe(true);
    expect(pdfSourceUsesCredentials("http://storage.localhost/bucket/file.pdf?signature=1", appOrigin)).toBe(false);
    expect(pdfSourceUsesCredentials("blob:http://av.localhost/example", appOrigin)).toBe(false);
  });
});
