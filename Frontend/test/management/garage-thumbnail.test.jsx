import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import axios from "axios";

import { GarageThumbnail } from "../../src/features/management/documents/paperlessDocuments.jsx";

const loadingTaskDestroy = vi.fn();

vi.mock("axios", () => ({
  default: { get: vi.fn() }
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      getPage: () => Promise.resolve({
        getViewport: ({ scale }) => ({ width: 595 * scale, height: 842 * scale }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() })
      })
      // Einige PDF.js-Ausgaben besitzen am Dokument-Proxy kein destroy().
    }),
    destroy: loadingTaskDestroy
  }))
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/pdf.worker.mjs" }));

describe("Garage-PDF-Vorschau", () => {
  it("räumt nach dem Rendern auch Dokument-Proxies ohne destroy-Methode fehlerfrei auf", async () => {
    axios.get.mockResolvedValue({ data: { url: "blob:garage-pdf" } });
    const view = render(<GarageThumbnail document={{ id: "file-1", title: "Plan.pdf", mimeType: "application/pdf", serverVersion: 2 }} />);

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    await waitFor(() => expect(view.getByLabelText("Vorschau von Plan.pdf")).toHaveClass("opacity-100"));
    expect(() => view.unmount()).not.toThrow();
    expect(loadingTaskDestroy).toHaveBeenCalled();
  });
});
