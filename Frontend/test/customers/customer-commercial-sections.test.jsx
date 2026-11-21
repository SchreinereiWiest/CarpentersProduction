import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createCommission: vi.fn()
}));

vi.mock("../../src/features/commercial/commercialApi.js", () => ({
  createCommercialDocument: mocks.createDocument,
  createCommission: mocks.createCommission
}));

import CommercialDocumentModal from "../../src/features/commercial/CommercialDocumentModal.jsx";
import { CustomerProjectsList } from "../../src/features/customers/components/CustomerCommercialSections.jsx";

const projects = [
  { id: "project-1", title: "Küche", status: "active", startDate: "2026-11-01T00:00:00.000Z", commission: { id: "commission-1" } },
  { id: "project-2", title: "Garderobe", status: "active", startDate: "2026-11-02T00:00:00.000Z", commission: null }
];
const commissions = [{ id: "commission-1", title: "Hausausbau", commissionNumber: "K-1", projects: [projects[0]] }];

describe("Kundenprojekte und Belege", () => {
  it("gruppiert Kommissionen und bietet Belege an Projekt und Gruppenzeile an", () => {
    const openDocument = vi.fn();
    render(<MemoryRouter><CustomerProjectsList projects={projects} commissions={commissions} selectionMode={false} selectedProjectIds={[]} onToggleProject={vi.fn()} onOpenDocument={openDocument} onRemoveCommission={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText("Kommission · Hausausbau")).toBeInTheDocument();
    expect(screen.getByText("Küche")).toBeInTheDocument();
    expect(screen.getByText("Garderobe")).toBeInTheDocument();
    const documentButtons = screen.getAllByRole("button", { name: "Beleg" });
    expect(documentButtons).toHaveLength(3);
    fireEvent.click(documentButtons[0]);
    expect(openDocument).toHaveBeenCalledWith({ type: "commission", id: "commission-1", label: "Hausausbau" });
  });

  it("blendet im Kommissionierungsmodus bestehende Gruppen aus und wählt graue Einzelprojekte", () => {
    const toggle = vi.fn();
    render(<MemoryRouter><CustomerProjectsList projects={projects} commissions={commissions} selectionMode selectedProjectIds={[]} onToggleProject={toggle} onOpenDocument={vi.fn()} onRemoveCommission={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText("Hausausbau")).not.toBeInTheDocument();
    expect(screen.queryByText("Küche")).not.toBeInTheDocument();
    const row = screen.getByText("Garderobe").closest("tr");
    expect(row).toHaveClass("bg-slate-700/45");
    fireEvent.click(row);
    expect(toggle).toHaveBeenCalledWith("project-2");
  });

  it("erstellt im Modal einen Beleg mit festem Projektbezug und zeigt vorhandene Belege", async () => {
    mocks.createDocument.mockResolvedValue({ id: "document-new" });
    render(
      <MemoryRouter initialEntries={["/Kontakte/customer-1"]}>
        <Routes>
          <Route path="/Kontakte/:id" element={<CommercialDocumentModal customerId="customer-1" target={{ type: "project", id: "project-2", label: "Garderobe" }} projects={projects} commissions={commissions} documents={[{ id: "document-1", documentNumber: "ANG-1", title: "Angebot Garderobe", documentType: "quote", totals: { gross: 100 }, project: { id: "project-2", title: "Garderobe" } }]} onClose={vi.fn()} />} />
          <Route path="/Belege/:id" element={<div>Belegeditor</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("ANG-1 · Angebot Garderobe")).toBeInTheDocument();
    expect(screen.queryByText("PDF-Vorlage")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Angebot anlegen" }));
    await waitFor(() => expect(mocks.createDocument).toHaveBeenCalledWith(expect.objectContaining({ customerId: "customer-1", projectId: "project-2", commissionId: null, documentType: "quote" })));
    expect(await screen.findByText("Belegeditor")).toBeInTheDocument();
  });
});
