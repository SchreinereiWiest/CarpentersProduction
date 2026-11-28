import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  loadCalendarEvents: vi.fn(),
  loadCalendarProjects: vi.fn(),
  saveAssignmentCalendarPeriod: vi.fn(),
  saveCalendarEvent: vi.fn(),
  removeCalendarEvent: vi.fn()
}));

vi.mock("../../src/features/calendar/engine/calendarApi.js", () => api);
vi.mock("../../src/shared/components/sideBar.jsx", () => ({ default: () => <div /> }));
vi.mock("../../src/app/providers/AuthContext.js", () => ({ useAuth: () => ({ user: { role: "admin" } }) }));

import CalendarPage from "../../src/features/calendar/CalendarPage.jsx";

describe("Projektzeitraum im Kalender", () => {
  beforeEach(() => {
    api.loadCalendarEvents.mockResolvedValue([]);
    api.loadCalendarProjects.mockResolvedValue([]);
    api.saveAssignmentCalendarPeriod.mockResolvedValue({ id: "event-1" });
  });

  it("marks the first click with the provisional range and saves the second click as the end day", async () => {
    render(<MemoryRouter initialEntries={[{
      pathname: "/Calendar",
      search: "?view=month&date=2026-03-01",
      state: { projectPeriod: {
        assignmentId: "assignment-1",
        projectTitle: "Einbauschrank",
        assigneeName: "Anna Holz",
        preliminaryStart: "2026-03-02",
        preliminaryEnd: "2026-03-10"
      } }
    }]}><Routes><Route path="/Calendar" element={<CalendarPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText(/Projektzeitraum planen: Einbauschrank/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/02\.03.*Projektzeitraum auswählen/));
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("vorl. Ende")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/05\.03.*Projektzeitraum auswählen/));
    await waitFor(() => expect(api.saveAssignmentCalendarPeriod).toHaveBeenCalledWith("assignment-1", {
      startAt: new Date(2026, 2, 2, 0, 0).toISOString(),
      endAt: new Date(2026, 2, 6, 0, 0).toISOString(),
      allDay: true
    }));
  });
});
