import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CalendarEventForm from "../../src/features/calendar/components/CalendarEventForm.jsx";

const renderForm = onSave => render(<CalendarEventForm
  focusDate={new Date(2026, 10, 14, 12)}
  projects={[]}
  admin={false}
  readOnly={false}
  saving={false}
  onSave={onSave}
  onDelete={vi.fn()}
  onNew={vi.fn()}
/>);

describe("Kalender-Sichtbarkeit", () => {
  it("legt Termine standardmäßig firmenweit sichtbar an", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm(onSave);

    fireEvent.change(screen.getByLabelText(/Titel/), { target: { value: "Teambesprechung" } });
    fireEvent.click(screen.getByRole("button", { name: "Termin anlegen" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      scope: "personal",
      title: "Teambesprechung",
      isPrivate: false
    })));
  });

  it("überträgt den expliziten Privat-Haken", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm(onSave);

    fireEvent.change(screen.getByLabelText(/Titel/), { target: { value: "Arzttermin" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Privat/ }));
    fireEvent.click(screen.getByRole("button", { name: "Termin anlegen" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: "Arzttermin",
      isPrivate: true
    })));
  });
});
