import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PaperlessDocumentViewer from "../../src/shared/components/PaperlessDocumentViewer.jsx";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({
    onProgress: null,
    promise: new Promise(() => {}),
    destroy: vi.fn()
  }))
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/pdf.worker.mjs" }));

describe("Paperless-Dokumentviewer", () => {
  it("schließt bei einem Klick auf einen Sidebar-Link auch ohne URL-Wechsel", () => {
    const onClose = vi.fn();
    const sidebar = window.document.createElement("nav");
    sidebar.className = "app-sidebar";
    const documentsLink = window.document.createElement("a");
    documentsLink.href = "/Documents";
    documentsLink.textContent = "Dokumente";
    documentsLink.addEventListener("click", event => event.preventDefault());
    sidebar.append(documentsLink);
    window.document.body.append(sidebar);

    const view = render(
      <PaperlessDocumentViewer
        document={{ id: "document-1", title: "Testdokument.pdf" }}
        onClose={onClose}
      />
    );

    fireEvent.click(documentsLink);
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    sidebar.remove();
  });
});
