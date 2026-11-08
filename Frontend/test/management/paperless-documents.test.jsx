import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

import { ManagementDocuments } from "../../src/features/management/documents/documents.jsx";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("../../src/features/management/hooks/useManagement.js", () => ({
  useManagement: () => ({ references: { files: [] }, refresh: vi.fn(), busy: false })
}));

vi.mock("../../src/shared/components/PaperlessDocumentViewer.jsx", () => ({
  default: ({ document, onClose }) => (
    <div role="dialog" aria-label={`Vorschau ${document.title}`}>
      <button type="button" onClick={onClose}>Vorschau schließen</button>
    </div>
  )
}));

describe("Paperless-Dokumentbereich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation(url => {
      if (url === "/api/paperless/status") return Promise.resolve({ data: { configured: true, connected: true, folders: [{ id: "folder-1", name: "Buchhaltung" }] } });
      if (url === "/api/paperless/documents") return Promise.resolve({ data: { documents: [] } });
      if (url === "/api/paperless/assignment-options") return Promise.resolve({ data: { projects: [], customers: [], folders: [] } });
      if (url === "/api/paperless/library") return Promise.resolve({ data: { count: 0, page: 1, next: false, previous: false, results: [] } });
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
  });

  it("zeigt bei aktiver Verbindung Eingang, Bibliothek und manuelle Ordner", async () => {
    render(<MemoryRouter><ManagementDocuments /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Dokumenteingang" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buchhaltung" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Paperless-Bibliothek" }));
    expect(await screen.findByPlaceholderText("Titel, Inhalt, Korrespondent …")).toBeInTheDocument();
    expect(await screen.findByText("Keine Dokumente gefunden.")).toBeInTheDocument();
  });

  it("kann Eingangsdokumente ausblenden oder in Paperless löschen", async () => {
    const document = {
      id: "document-1",
      remoteDocumentId: 42,
      title: "Privater Beleg",
      status: "inbox",
      receivedAt: "2026-11-08T10:00:00.000Z"
    };
    axios.get.mockImplementation(url => {
      if (url === "/api/paperless/status") return Promise.resolve({ data: { configured: true, connected: true, folders: [] } });
      if (url === "/api/paperless/documents") return Promise.resolve({ data: { documents: [document] } });
      if (url === "/api/paperless/assignment-options") return Promise.resolve({ data: { projects: [], customers: [], folders: [] } });
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    axios.post.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<MemoryRouter><ManagementDocuments /></MemoryRouter>);

    const previewImage = await screen.findByRole("img", { name: "Vorschau von Privater Beleg" });
    expect(previewImage).toHaveAttribute("src", "/api/paperless/documents/document-1/thumbnail?v=2");
    fireEvent.click(screen.getByRole("button", { name: "Privater Beleg in Vorschau öffnen" }));
    expect(screen.getByRole("dialog", { name: "Vorschau Privater Beleg" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vorschau schließen" }));

    fireEvent.click(await screen.findByRole("button", { name: "Ausblenden" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/paperless/documents/document-1/dismiss"));

    fireEvent.click(screen.getByRole("button", { name: "In Paperless löschen" }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith("/api/paperless/documents/document-1"));
  });
});
