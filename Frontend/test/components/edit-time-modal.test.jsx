import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditTimeModal from "../../src/features/employees/editTimeModal.jsx";

const renderModal = (onSave = vi.fn()) => {
  render(
    <EditTimeModal
      open
      slot={{ id: "slot-1", position: { day: 0, block: 1 }, date: "2026-11-21", start: "08:00", duration: 60 }}
      blocks={[{ id: 1, start: "07:00", end: "12:00" }]}
      projects={[{ id: "project-1", title: "Küche" }]}
      workTypes={[{ id: "assembly", label: "Zusammenbau" }]}
      onSave={onSave}
      onClose={vi.fn()}
      onDelete={vi.fn()}
      mode="new"
      Cal={{}}
    />
  );
  fireEvent.change(screen.getByLabelText("Projekt"), { target: { value: "project-1" } });
  fireEvent.change(screen.getByLabelText("Tätigkeit"), { target: { value: "assembly" } });
  return onSave;
};

describe("manueller Mitarbeitenden-Zeiteintrag", () => {
  it("berechnet aus Start und Ende die Dauer", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "08:15" } });
    fireEvent.change(screen.getByLabelText("Ende"), { target: { value: "09:45" } });

    expect(screen.getByLabelText("Dauer (Minuten)")).toHaveValue(90);
  });

  it("berechnet aus Start und Dauer die Endzeit und speichert beide Werte", () => {
    const onSave = renderModal();

    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "08:15" } });
    fireEvent.change(screen.getByLabelText("Dauer (Minuten)"), { target: { value: "45" } });
    expect(screen.getByLabelText("Ende")).toHaveValue("09:00");

    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      start: "08:15",
      end: "09:00",
      duration: 45,
      projectId: "project-1",
      workType: "assembly"
    }), "new", {});
  });
});
