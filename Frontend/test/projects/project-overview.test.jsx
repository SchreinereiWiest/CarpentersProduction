import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDemoProject: vi.fn(),
  getProjects: vi.fn(),
  isDemoProject: vi.fn(project => project?.temporaryPurpose === "guided-tour")
}));

vi.mock("../../src/shared/projects/project-records.js", () => ({ getProjectRecords: mocks.getProjects }));
vi.mock("../../src/features/guided-help/guidedTourDemoProject.js", () => ({
  ensureGuidedTourDemoProject: mocks.ensureDemoProject,
  isGuidedTourDemoProject: mocks.isDemoProject
}));
vi.mock("../../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: { role: "admin" } }) }));
vi.mock("../../src/shared/components/sideBar.jsx", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("../../src/features/projects/import/ProjectImportDialog.jsx", () => ({ default: () => null }));

import ProjectOverviewPage from "../../src/features/projects/ProjectOverviewPage.jsx";

describe("Projektübersicht", () => {
  beforeEach(() => {
    mocks.ensureDemoProject.mockReset();
    mocks.ensureDemoProject.mockResolvedValue({
      id: "tour-project",
      title: "Temporäres Rundgangsprojekt",
      status: "active",
      priority: "normal",
      localOnly: true,
      temporaryPurpose: "guided-tour"
    });
    mocks.isDemoProject.mockClear();
    mocks.getProjects.mockResolvedValue([
      {
        id: "project-1",
        title: "Küche Erdgeschoss",
        customer: { id: "customer-1", firstName: "Anna", lastName: "Muster" },
        commission: { id: "commission-1", title: "Hausausbau Muster", commissionNumber: "K-2026-1" },
        startDate: "2026-11-01T00:00:00.000Z",
        priority: "high",
        status: "active"
      }
    ]);
  });

  it("bündelt kommissionierte Projekte und öffnet den Kunden ohne das Projekt zu öffnen", async () => {
    render(
      <MemoryRouter initialEntries={["/Projects"]}>
        <Routes>
          <Route path="/Projects" element={<ProjectOverviewPage />} />
          <Route path="/Kontakte/:userid" element={<div>Kundenseite</div>} />
          <Route path="/Projects/:projectId" element={<div>Projektseite</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Kommission · Hausausbau Muster")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Anna Muster" }));
    expect(await screen.findByText("Kundenseite")).toBeInTheDocument();
    expect(screen.queryByText("Projektseite")).not.toBeInTheDocument();
  });

  it("zeigt Backendfehler anstatt einer scheinbar leeren Projektliste", async () => {
    mocks.getProjects.mockRejectedValueOnce(new Error("Backend unavailable"));
    render(
      <MemoryRouter initialEntries={["/Projects"]}>
        <Routes><Route path="/Projects" element={<ProjectOverviewPage />} /></Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Projekte konnten nicht geladen werden");
  });

  it("legt im Einrichtungsrundgang bei leerer Projektliste ein lokales Testprojekt an", async () => {
    mocks.getProjects.mockResolvedValueOnce([]);
    render(
      <MemoryRouter initialEntries={["/Projects?guidedTour=onboarding"]}>
        <Routes>
          <Route path="/Projects" element={<ProjectOverviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Temporäres Rundgangsprojekt")).toBeInTheDocument();
    expect(screen.getByText("Ohne Kunde (lokal)")).toBeInTheDocument();
    expect(mocks.ensureDemoProject).toHaveBeenCalledTimes(1);
  });
});
