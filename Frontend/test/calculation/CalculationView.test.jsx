import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalculationView from "../../src/pages/projects/calculation/CalculationView.jsx";

const api = vi.hoisted(() => ({
  loadCalculationWorkspace: vi.fn(),
  releaseCalculationSnapshot: vi.fn(),
  saveCalculation: vi.fn()
}));

vi.mock("../../src/pages/projects/calculation/calculationApi.js", () => api);
vi.mock("../../src/components/sideBar.jsx", () => ({ default: () => null }));
vi.mock("../../src/components/projectBar.jsx", () => ({ default: () => null }));

describe("CalculationView", () => {
  beforeEach(() => {
    api.loadCalculationWorkspace.mockResolvedValue({
      project: { id: "project-1", title: "Testprojekt", description: "Einbauschrank", projectType: "cabinet" },
      cabinets: [{ id: "cabinet-1", name: "Flurschrank", quantity: 1, width: 600, height: 2000, depth: 550, sections: [], fronts: [] }],
      procurement: { items: [{ quantity: 2, netPrice: 50 }] },
      calculation: null,
      context: {
        management: {
          available: true,
          approved: true,
          fullHourlyRate: 60,
          rateSource: "staff-allocation",
          staffCount: 2,
          costCenters: [{ id: "shop", name: "Werkstatt", hourlyRate: 60, activityIds: ["cutting"] }],
          easyRates: []
        },
        currentTimeEntries: [{ workType: "cutting", duration: 120 }],
        historicalProjects: []
      }
    });
    api.saveCalculation.mockResolvedValue({ status: "synced" });
    api.releaseCalculationSnapshot.mockResolvedValue({
      id: "snapshot-1",
      releasedAt: "2026-10-17T10:00:00.000Z"
    });
  });

  it("loads purchasing and cabinet data and transfers the interactive hour estimate", async () => {
    render(
      <MemoryRouter initialEntries={["/Projects/Calculation/project-1"]}>
        <Routes>
          <Route path="/Projects/Calculation/:projectId" element={<CalculationView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Testprojekt" })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("100").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("60")).toBeInTheDocument();
    expect(screen.getByText("Gewichteter Mittelwert aus 2 Mitarbeitern; jederzeit editierbar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preisaufbau" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /h \/ Stück/ })).not.toBeInTheDocument();

    const selectSpy = vi.spyOn(HTMLInputElement.prototype, "select");
    fireEvent.focus(screen.getByRole("spinbutton", { name: /Materialzuschlag/ }));
    expect(selectSpy).toHaveBeenCalled();
    selectSpy.mockRestore();

    fireEvent.click(screen.getByRole("tab", { name: "Stundenschätzung" }));
    expect(screen.getByRole("tab", { name: "Schätzung" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Assistent" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Assistent" }));
    expect(screen.getByRole("heading", { name: "Automatische Stundenschätzung" })).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /h \/ Stück/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Schätzung" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Werkstatt · Flurschrank · h / Stück" }), { target: { value: "3.5" } });
    fireEvent.click(screen.getByRole("button", { name: "3,5 h in Schnellkalkulation" }));
    expect(screen.getByRole("spinbutton", { name: /Arbeitsstunden/ })).toHaveValue(3.5);

    fireEvent.click(screen.getByRole("tab", { name: "Stundenschätzung" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Werkstatt · Flurschrank · h / Stück" }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Aufgeschlüsselt in Vollkalkulation" }));
    expect(screen.getByRole("tab", { name: "Vollkalkulation" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Stunden Werkstatt")).toHaveValue(4);

    fireEvent.click(screen.getByRole("tab", { name: "Nachkalkulation" }));
    await waitFor(() => expect(screen.getByLabelText("Stunden Werkstatt")).toHaveValue(2));
    fireEvent.click(screen.getByRole("button", { name: "Nachkalkulation freigeben" }));
    await waitFor(() => expect(api.releaseCalculationSnapshot).toHaveBeenCalledWith("project-1"));
    expect(api.saveCalculation).toHaveBeenCalledWith("project-1", expect.objectContaining({ version: 2 }));
    expect(await screen.findByText(/Nachkalkulation wurde freigegeben/)).toBeInTheDocument();
  });
});
