import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadDocument: vi.fn(),
  saveDocument: vi.fn(),
  createDocument: vi.fn(),
  loadAssignees: vi.fn(),
  assignDocument: vi.fn(),
  user: { id: "admin-1", role: "admin" }
}));

vi.mock("../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../src/shared/components/sideBar.jsx", () => ({ default: () => <nav aria-label="Sidebar"/> }));
vi.mock("../src/shared/settings/company-settings.js", () => ({ loadCompanySettings: vi.fn(async () => ({ branding: { logoDataUrl: "data:image/png;base64,AAAA" } })) }));
vi.mock("../src/features/commercial/commercialApi.js", () => ({
  loadCommercialDocument: mocks.loadDocument,
  saveCommercialDocument: mocks.saveDocument,
  createCommercialDocument: mocks.createDocument,
  loadCommercialDocumentAssignees: mocks.loadAssignees,
  assignCommercialDocument: mocks.assignDocument
}));

import CommercialDocumentEditorPage from "../src/features/commercial/CommercialDocumentEditorPage.jsx";

const document = {
  id: "document-1",
  customerId: "customer-1",
  documentType: "quote",
  documentNumber: "ANG-2026-0001",
  title: "Angebot Einbauschrank",
  status: "draft",
  issuedAt: "2026-11-21T00:00:00.000Z",
  dueAt: null,
  introText: "Vielen Dank für Ihre Anfrage.",
  notes: "14 Tage netto.",
  items: [{ id: "item-1", description: "Einbauschrank", details: "Eiche furniert", unit: "Stk.", quantity: 1, unitPrice: 1200, discountPercent: 0 }],
  totals: { net: 1200, vatPercent: 19, vat: 228, gross: 1428 },
  fieldValues: {},
  customer: { companyName: "Muster GmbH", customerNumber: "KD-1", addresses: [{ street: "Musterweg", houseNumber: "1", postalCode: "12345", city: "Musterstadt" }] },
  project: { title: "Einbauschrank", projectNumber: "P-1" },
  commission: null
};

describe("strukturierter Belegeditor", () => {
  it("fügt Positionen zwischen Zeilen ein und setzt Eingaben als Text fest", async () => {
    mocks.loadDocument.mockResolvedValue(document);
    mocks.saveDocument.mockImplementation(async (_id, input) => ({ ...document, ...input, totals: { ...document.totals, vatPercent: Number(input.vatPercent) } }));

    render(<MemoryRouter initialEntries={["/Belege/document-1"]}><Routes><Route path="/Belege/:documentId" element={<CommercialDocumentEditorPage/>}/></Routes></MemoryRouter>);

    expect(await screen.findByRole("region", { name: "Beleginhalt" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kundenanschrift")).toHaveValue("Muster GmbH\nMusterweg 1\n12345 Musterstadt");
    expect(screen.getAllByLabelText(/Beschreibung Position/)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Position an Stelle 2 einfügen" }));
    expect(screen.getAllByLabelText(/Beschreibung Position/)).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Beschreibung Position 2"), { target: { value: "Montage" } });

    fireEvent.click(screen.getByRole("button", { name: "Eingaben festsetzen" }));
    await waitFor(() => expect(mocks.saveDocument).toHaveBeenCalledWith("document-1", expect.objectContaining({
      fieldValues: expect.objectContaining({ editorLocked: true, customerAddress: "Muster GmbH\nMusterweg 1\n12345 Musterstadt" }),
      items: expect.arrayContaining([expect.objectContaining({ description: "Montage" })])
    })));

    expect(await screen.findByRole("button", { name: "Beleg bearbeiten" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Kundenanschrift")).not.toBeInTheDocument();
    expect(screen.getByText("Montage")).toBeInTheDocument();
    expect(screen.queryByText("PDF erstellen")).not.toBeInTheDocument();
  });

  it("übernimmt statische Elemente und dynamische Felder aus der Standardvorlage", async () => {
    mocks.loadDocument.mockResolvedValue({
      ...document,
      template: {
        id: "template-1",
        name: "Wiest Angebot",
        analysis: {
          version: 4,
          layout: { version: 2, page: { width: 210, height: 297, background: "#ffffff", gridSize: 2 }, objects: [
            { id: "fixed", type: "text", text: "Fester Firmenhinweis", x: 14, y: 10, width: 80, height: 8, fontSize: 9, color: "#18181b" },
            { id: "address", type: "field", key: "customerAddress", x: 14, y: 30, width: 90, height: 30, fontSize: 10, background: "#ffffff", borderColor: "#bae6fd", borderWidth: 0.5, borderStyle: "dashed", padding: 2 },
            { id: "number", type: "field", key: "documentNumber", x: 150, y: 30, width: 46, height: 8, fontSize: 9, background: "#ffffff" },
            { id: "items", type: "field", key: "positions", x: 14, y: 80, width: 182, height: 100, fontSize: 9, background: "#ffffff" }
          ] }
        }
      }
    });

    render(<MemoryRouter initialEntries={["/Belege/document-1"]}><Routes><Route path="/Belege/:documentId" element={<CommercialDocumentEditorPage/>}/></Routes></MemoryRouter>);

    expect(await screen.findByText("Standardvorlage: Wiest Angebot")).toBeInTheDocument();
    expect(screen.getByText("Fester Firmenhinweis")).toBeInTheDocument();
    expect(screen.getByLabelText("Kundenanschrift")).toHaveValue("Muster GmbH\nMusterweg 1\n12345 Musterstadt");
    expect(screen.getAllByLabelText("Belegnummer").some(input => input.value === "ANG-2026-0001")).toBe(true);
    expect(screen.getByLabelText("Beschreibung Position 1")).toHaveValue("Einbauschrank");
  });

  it("weist einen festgesetzten Beleg einem Mitarbeiter zur Bearbeitung zu", async () => {
    const employeeId = "11111111-1111-4111-8111-111111111111";
    mocks.loadDocument.mockResolvedValue({ ...document, fieldValues: { editorLocked: true }, assignedTo: null });
    mocks.loadAssignees.mockResolvedValue([{ id: employeeId, name: "Anna Holz", role: "user" }]);
    mocks.assignDocument.mockResolvedValue({ ...document, fieldValues: { editorLocked: true }, assignedToId: employeeId, assignedTo: { id: employeeId, firstName: "Anna", lastName: "Holz" } });

    render(<MemoryRouter initialEntries={["/Belege/document-1"]}><Routes><Route path="/Belege/:documentId" element={<CommercialDocumentEditorPage/>}/></Routes></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Bearbeitung zuweisen" }));
    fireEvent.change(await screen.findByLabelText("Bearbeiter"), { target: { value: employeeId } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Bearbeitung zuweisen" })).getByRole("button", { name: "Bearbeitung zuweisen" }));

    await waitFor(() => expect(mocks.assignDocument).toHaveBeenCalledWith("document-1", employeeId));
    expect(await screen.findByText("Die Belegbearbeitung wurde zugewiesen.")).toBeInTheDocument();
  });
});
