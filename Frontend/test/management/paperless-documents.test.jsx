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
      if (url === "/api/paperless/status") return Promise.resolve({ data: { configured: true, connected: true, baseUrl: "http://paperless.internal", folders: [{ id: "folder-1", name: "Buchhaltung" }] } });
      if (url === "/api/paperless/documents") return Promise.resolve({ data: { documents: [] } });
      if (url === "/api/paperless/local-documents") return Promise.resolve({ data: { documents: [] } });
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
    expect(screen.getByRole("link", { name: "Paperless öffnen" })).toHaveAttribute("href", "http://paperless.internal");
    expect(screen.getByRole("link", { name: "Paperless öffnen" })).toHaveAttribute("target", "_blank");
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
      if (url === "/api/paperless/local-documents") return Promise.resolve({ data: { documents: [] } });
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

  it("lädt Belege wahlweise direkt nach Paperless oder in Carpenters hoch", async () => {
    axios.post.mockImplementation(url => {
      if (url === "/api/paperless/upload") return Promise.resolve({ data: { status: "processing", taskId: "task-1" } });
      if (url === "/api/files/management-document") return Promise.resolve({ data: { success: true } });
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    render(<MemoryRouter><ManagementDocuments /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Beleg hochladen" }));
    expect(screen.getByRole("dialog", { name: "Beleg manuell hochladen" })).toBeInTheDocument();
    const dmsFile = new File(["%PDF-test"], "rechnung.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Belegdatei auswählen"), { target: { files: [dmsFile] } });
    fireEvent.click(screen.getByRole("button", { name: "An Paperless senden" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/paperless/upload", expect.any(FormData)));
    expect(await screen.findByRole("status")).toHaveTextContent("an Paperless übergeben");

    fireEvent.click(screen.getByRole("button", { name: "Beleg hochladen" }));
    fireEvent.click(screen.getByRole("button", { name: "Speicherort Carpenters" }));
    const localFile = new File(["%PDF-local"], "interner-beleg.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Belegdatei auswählen"), { target: { files: [localFile] } });
    fireEvent.click(screen.getByRole("button", { name: "In Carpenters speichern" }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/files/management-document", expect.any(FormData)));
    expect(await screen.findByRole("heading", { name: "Dokumenteingang" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("auf einen QR-Code geprüft");
  });

  it("führt Carpenters-Belege im gemeinsamen Eingang und erlaubt die Zuweisung", async () => {
    const localDocument = {
      id: "local-file-1",
      source: "carpenters",
      title: "interner-beleg.pdf",
      fileName: "interner-beleg.pdf",
      mimeType: "application/pdf",
      status: "inbox",
      receivedAt: "2026-11-09T10:00:00.000Z"
    };
    axios.get.mockImplementation(url => {
      if (url === "/api/paperless/status") return Promise.resolve({ data: { configured: true, connected: true, folders: [] } });
      if (url === "/api/paperless/documents") return Promise.resolve({ data: { documents: [] } });
      if (url === "/api/paperless/local-documents") return Promise.resolve({ data: { documents: [localDocument] } });
      if (url === "/api/paperless/assignment-options") return Promise.resolve({ data: { projects: [{ id: "project-1", title: "Küche", projectNumber: "P-1", customer: { companyName: "Muster GmbH" } }], customers: [], folders: [] } });
      return Promise.reject(new Error(`Unexpected URL ${url}`));
    });
    axios.put.mockResolvedValue({ data: { document: { ...localDocument, status: "linked" } } });

    render(<MemoryRouter><ManagementDocuments /></MemoryRouter>);

    expect(await screen.findByRole("button", { name: "interner-beleg.pdf in Vorschau öffnen" })).toBeInTheDocument();
    expect(screen.getAllByText("Carpenters").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Zuordnen" }));
    expect(await screen.findByRole("dialog", { name: "Dokument zuordnen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      "/api/paperless/local-documents/local-file-1/assignment",
      { targetType: "project", targetId: "project-1" }
    ));
  });
});
