import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANY_SETTINGS } from "../../src/shared/settings/company-settings.js";

const mocks = vi.hoisted(() => ({ request: vi.fn(), get: vi.fn() }));
vi.mock("axios", () => ({ default: Object.assign(mocks.request, { get: mocks.get }) }));
vi.mock("../../src/shared/components/sideBar.jsx", () => ({ default: ({ selected }) => <div data-testid="sidebar">{selected}</div> }));
vi.mock("../../src/shared/settings/company-settings.js", async importOriginal => {
  const original = await importOriginal();
  return { ...original, loadCompanySettings: vi.fn(async () => original.DEFAULT_COMPANY_SETTINGS) };
});

import ManagementLayout from "../../src/features/management/layout/managementLayout.jsx";
import ManagementOverview from "../../src/features/management/operating/overview.jsx";
import ManagementBoard from "../../src/features/management/operating/projectBoard.jsx";
import AnnualGoals from "../../src/features/management/operating/annualGoals.jsx";
import HourlyRates from "../../src/features/management/operating/hourlyRates.jsx";
import ProjectTimeline from "../../src/features/management/operating/projectTimeline.jsx";

const year = new Date().getFullYear();
let workspace;

function open(path) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/Management" element={<ManagementLayout />}>
      <Route index element={<ManagementOverview />} />
      <Route path="Board" element={<ManagementBoard />} />
      <Route path="Timeline" element={<ProjectTimeline />} />
      <Route path="Goals" element={<AnnualGoals />} />
      <Route path="Rates" element={<HourlyRates />} />
    </Route>
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  workspace = {
    year,
    employees: [
      { id: "employee-1", name: "Anna Holz", role: "user", isActive: true },
      { id: "employee-2", name: "Max Bank", role: "user", isActive: false }
    ],
    projects: [{
      id: "project-1", title: "Einbauschrank", projectNumber: "P-100", status: "active", priority: "normal",
      customer: { companyName: "Muster GmbH" }
    }],
    assignments: [],
    projectStages: [],
    projectSchedules: [],
    employeeProfiles: [],
    timeSummary: [],
    vacationEvents: [],
    goals: [],
    goalYears: [year - 1],
    rateCalculation: null
  };
  mocks.get.mockImplementation(async () => ({ data: structuredClone(workspace) }));
  mocks.request.mockImplementation(async () => ({ data: { success: true } }));
});

describe("neuer Management-Arbeitsbereich", () => {
  it("zeigt alle registrierten Mitarbeiter und weist einen Auftrag mit Info zu", async () => {
    open("/Management");
    expect(await screen.findByRole("heading", { name: "Auftrag zuweisen" })).toBeInTheDocument();
    expect(screen.getAllByText("Anna Holz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Max Bank").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Mitarbeiter"), { target: { value: "employee-1" } });
    fireEvent.change(screen.getByLabelText("Auftrag / Projekt"), { target: { value: "project-1" } });
    fireEvent.change(screen.getByLabelText("Info und erledigte Arbeiten"), { target: { value: "Zuschnitt erledigt" } });
    fireEvent.click(screen.getByRole("button", { name: "Zuweisen" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "post",
      url: "/api/management/assignments",
      data: { assigneeId: "employee-1", projectId: "project-1", info: "Zuschnitt erledigt" }
    })));
  });

  it("verschiebt Projekte unabhängig vom allgemeinen Projektstatus nach rechts", async () => {
    open("/Management/Board");
    expect(await screen.findByRole("heading", { name: "Projektstatus" })).toBeInTheDocument();
    expect(screen.getByText("Einbauschrank")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eine Spalte nach rechts" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "put",
      url: "/api/management/projects/project-1/stage",
      data: expect.objectContaining({ stageId: DEFAULT_COMPANY_SETTINGS.management.workflowStates[1].id })
    })));
  });

  it("legt ein Jahresziel mit konfiguriertem Datentyp an", async () => {
    open("/Management/Goals");
    expect(await screen.findByRole("heading", { name: `Jahreszielplanung ${year}` })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Sollwert"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Ziel anlegen" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "post",
      url: "/api/management/goals",
      data: expect.objectContaining({ targetValue: "12", typeId: "employees", unit: "Personen" })
    })));
  });

  it("zeigt standardmäßig alle Projekt-Gantts chronologisch in einer Auslastungsübersicht", async () => {
    workspace.projects.push({
      id: "project-2", title: "Empfangstheke", projectNumber: "P-200", status: "active", priority: "normal",
      customer: { companyName: "Beispiel AG" }
    });
    workspace.projectSchedules = [
      {
        projectId: "project-1", plannedStart: "2026-03-10", plannedEnd: "2026-03-20",
        plan: [
          { id: "late", label: "Montage", bars: [{ id: "late-bar", start: "2026-03-18", end: "2026-03-20" }] },
          { id: "early", label: "Aufmaß", bars: [
            { id: "early-bar", start: "2026-03-10", end: "2026-03-11" },
            { id: "overlap-bar", start: "2026-03-11", end: "2026-03-12" }
          ] }
        ]
      },
      {
        projectId: "project-2", plannedStart: "2026-03-01", plannedEnd: "2026-03-08",
        plan: [{ id: "planning", label: "Planung", bars: [{ id: "planning-bar", start: "2026-03-01", end: "2026-03-08" }] }]
      }
    ];
    open("/Management/Timeline");
    expect(await screen.findByRole("heading", { name: "Gesamtübersicht der Projektzeiträume" })).toBeInTheDocument();
    expect(screen.getByText("Planungsdichte")).toBeInTheDocument();
    const earlierProject = screen.getByRole("link", { name: "P-200 · Empfangstheke" });
    const laterProject = screen.getByRole("link", { name: "P-100 · Einbauschrank" });
    expect(earlierProject.compareDocumentPosition(laterProject) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const earlyStep = screen.getByText("Aufmaß");
    const lateStep = screen.getByText("Montage");
    expect(earlyStep.compareDocumentPosition(lateStep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Aufmaß · Spur 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Neue Planzeile")).not.toBeInTheDocument();
  });

  it("plant einen vorläufigen Projektzeitraum in der Roadmap", async () => {
    open("/Management/Timeline");
    expect(await screen.findByRole("heading", { name: "Interaktive Projektzeitplanung" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Einzelprojekt bearbeiten" }));
    fireEvent.change(screen.getByLabelText("Neue Planzeile"), { target: { value: "Aufmaß" } });
    fireEvent.click(screen.getByRole("button", { name: "Zeile hinzufügen" }));
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const format = value => value.toLocaleDateString("en-CA");
    fireEvent.click(screen.getByLabelText(`Aufmaß ${format(start)}`));
    fireEvent.click(screen.getByLabelText(`Aufmaß ${format(end)}`));
    fireEvent.click(screen.getByRole("button", { name: "Projektplanung speichern" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "put",
      url: "/api/management/projects/project-1/schedule",
      data: { rows: [expect.objectContaining({ label: "Aufmaß", bars: [expect.objectContaining({ start: format(start), end: format(end) })] })] }
    })));
    fireEvent.change(screen.getByLabelText("Kalendertyp"), { target: { value: "planning" } });
    fireEvent.click(screen.getByRole("button", { name: "In Kalender übertragen" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "post",
      url: "/api/management/projects/project-1/schedule/calendar",
      data: expect.objectContaining({
        calendarType: "planning",
        rows: [expect.objectContaining({ label: "Aufmaß" })]
      })
    })));
  });

  it("berechnet alle Unternehmenstätigkeiten und speichert die Sätze für Projekte", async () => {
    workspace.rateCalculation = {
      savedAt: "2026-01-01T00:00:00.000Z",
      profitPercent: 10,
      overheadCosts: [],
      activities: DEFAULT_COMPANY_SETTINGS.workTypes.map(item => ({
        id: item.id, name: item.label, productiveHours: 100,
        personnelCosts: 1000, otherDirectCosts: 0,
        machineCosts: 0, machineHours: 0, machineUsagePercent: 0
      }))
    };
    open("/Management/Rates");
    expect(await screen.findByRole("heading", { name: new RegExp(`Stunden- und Maschinenstundensätze ${year}`) })).toBeInTheDocument();
    expect(screen.getAllByText("Zuschnitt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Montage").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Sätze speichern und in Projekte übernehmen" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
      method: "put",
      url: "/api/management/rates",
      data: expect.objectContaining({ activities: expect.arrayContaining([expect.objectContaining({ id: "cutting" })]) })
    })));
  });

  it("übernimmt produktive Jahresstunden und anteilige Lohnkosten je Kostenstelle", async () => {
    workspace.timeSummary = [{ userId: "employee-1", workType: "cutting", customWorkType: null, minutes: 750 }];
    workspace.employeeProfiles = [{ userId: "employee-1", year, annualSalary: 60000, vacationDays: 30 }];
    open("/Management/Rates");
    expect(await screen.findByRole("heading", { name: new RegExp("Stunden- und Maschinenstundensätze") })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Daten abgreifen" }));
    expect(screen.getByRole("dialog", { name: "Jahresdaten aus Zeiterfassung und Löhnen übernehmen" })).toBeInTheDocument();
    expect(screen.getByText(`Erfassungszeitraum 01.01.${year} – 31.12.${year}`)).toBeInTheDocument();
    expect(screen.getAllByText("12,5 h").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60.000,00 €").length).toBeGreaterThan(0);
    expect(screen.getByText("100 %")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jahressummen übernehmen" }));
    expect(screen.getAllByDisplayValue("12.5").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("60000").length).toBeGreaterThan(0);
  });
});
