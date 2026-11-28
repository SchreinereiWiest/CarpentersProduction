import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  user: { id: "user-1", role: "user" },
  settings: { userInterface: { home: { documentTags: ["Rechnung", "Auftragsbestätigung", "Angebot"] } } }
}));

vi.mock("axios", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("../../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../../src/shared/components/sideBar.jsx", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("../../src/shared/settings/company-settings.js", () => ({ loadCompanySettings: vi.fn(async () => mocks.settings) }));

import DashboardPage from "../../src/features/dashboard/pages/DashboardPage.jsx";

const baseDashboard = {
  role: "user",
  week: { start: "2026-11-09", end: "2026-11-15" },
  preferences: { home: { order: ["assignments", "appointments", "week"], hidden: [] } },
  assignments: [{
    id: "assignment-1",
    info: "Beschläge montieren",
    project: { id: "project-1", title: "Empfangstheke", projectNumber: "P-100", status: "active" },
    calendarEvent: null
  }],
  assignedCommercialDocuments: [],
  workAssignments: [{
    id: "assignment-1", kind: "project", sourceId: "project-1", title: "P-100 · Empfangstheke",
    info: "Beschläge montieren", href: "/Projects/project-1", status: "open",
    createdBy: { id: "manager-1", name: "Mara Manager" }, assignee: { id: "user-1", name: "Uwe User" }
  }],
  completedAssignments: [],
  events: [{ id: "event-1", title: "Baustellentermin", startAt: "2026-11-10T08:00:00.000Z", endAt: "2026-11-10T09:00:00.000Z", allDay: false, project: null }],
  assignedDocuments: [],
  inboxDocuments: [],
  releasedPurchases: [],
  openDeliveries: []
};

describe("rollenabhängige Startseite", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1", role: "user" };
    mocks.settings = { userInterface: { home: { documentTags: ["Rechnung", "Auftragsbestätigung", "Angebot"] } } };
    mocks.get.mockResolvedValue({ data: structuredClone(baseDashboard) });
    mocks.post.mockReset();
  });

  it("zeigt Mitarbeitern ihre Zuweisungs-Notification, Aufträge und Kalenderwoche", async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText("Auftragszuweisung")).toBeInTheDocument();
    expect(screen.getByText("P-100 · Empfangstheke")).toBeInTheDocument();
    expect(screen.getByText("Beschläge montieren")).toBeInTheDocument();
    expect(screen.getAllByText("Baustellentermin").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Kompakte Wochenübersicht" })).toBeInTheDocument();
  });

  it("zeigt Managern die zur Bearbeitung freigegebenen Dokumente", async () => {
    mocks.user = { id: "manager-1", role: "manager" };
    mocks.get.mockResolvedValue({ data: {
      ...structuredClone(baseDashboard),
      role: "manager",
      preferences: { home: { order: ["managerDocuments", "assignments", "appointments", "week"], hidden: [] } },
      assignedDocuments: [{ id: "doc-1", title: "Angebot prüfen", documentType: "Angebot", project: null }]
    } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Zu bearbeitende Dokumente" })).toBeInTheDocument();
    expect(screen.getByText("Angebot prüfen")).toBeInTheDocument();
  });

  it("zeigt zugewiesene Belege als Aufgabe unter Meine Aufträge", async () => {
    mocks.get.mockResolvedValue({ data: {
      ...structuredClone(baseDashboard),
      assignments: [],
      workAssignments: [{ id: "beleg-assignment", kind: "commercial_document", sourceId: "beleg-1", title: "ANG-1 · Einbauschrank", info: "P-100 · Empfangstheke", href: "/Belege/beleg-1", status: "open", createdBy: { id: "admin-1", name: "Ada Admin" }, assignee: { id: "user-1", name: "Uwe User" } }]
    } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText("ANG-1 · Einbauschrank")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abgeschlossen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ANG-1/ })).toHaveAttribute("href", "/Belege/beleg-1");
  });

  it("meldet einen Auftrag abgeschlossen und zeigt dem Absender die ausblendbare Rückmeldung", async () => {
    mocks.post.mockResolvedValue({ data: { assignment: {
      ...baseDashboard.workAssignments[0], status: "completed", createdBy: { id: "user-1", name: "Uwe User" }, assignee: { id: "user-1", name: "Uwe User" }
    } } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: "Abgeschlossen" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/api/dashboard/assignments/assignment-1/complete"));
    expect(await screen.findByText("Abschlussmeldungen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ausblenden" })).toBeInTheDocument();
  });

  it("filtert den Admin-Dokumenteingang nach den konfigurierten Tags", async () => {
    mocks.user = { id: "admin-1", role: "admin" };
    mocks.settings = { userInterface: { home: { documentTags: ["Rechnung"] } } };
    mocks.get.mockResolvedValue({ data: {
      ...structuredClone(baseDashboard),
      role: "admin",
      preferences: { home: { order: ["documentInbox", "approvedPurchases", "openDeliveries", "appointments", "week", "assignments"], hidden: [] } },
      inboxDocuments: [
        { id: "doc-1", title: "Eingangsrechnung Holz", documentType: "Rechnung", tags: [], correspondent: "Holz GmbH" },
        { id: "doc-2", title: "Interne Notiz", documentType: "Notiz", tags: [], correspondent: "Intern" }
      ]
    } });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(await screen.findByText("Eingangsrechnung Holz")).toBeInTheDocument();
    expect(screen.queryByText("Interne Notiz")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Freigegebene Einkäufe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Offene Lieferungen" })).toBeInTheDocument();
  });
});
