import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CutPlanPanel from "../../src/features/projects/nesting/CutPlanPanel.jsx";

describe("Nesting-Schnittplan", () => {
  it("wählt beim Klick auf einen Schnitt den zugehörigen Strip aus", () => {
    const onSelectStrip = vi.fn();
    render(
      <CutPlanPanel
        sheet={{
          MID: "U960",
          settings: { cutGap: 4 },
          nestingPlates: [
            {
              placedWidth: 2800,
              placedHeight: 2070,
              cuts: [
                { x: 600, y: 0, width: 4, height: 2070, stripId: "strip-A" }
              ]
            }
          ]
        }}
        activeStripId={null}
        onSelectStrip={onSelectStrip}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Vertikal/ }));

    expect(onSelectStrip).toHaveBeenCalledWith("strip-A");
    expect(screen.getByText(/strip-A/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vertikal/ })).toHaveClass("absolute", "inset-0", "h-full", "w-full");
  });

  it("blendet die PID-Einzelteilanzeige im kompakten Schnittplan aus", () => {
    const plate = { id: "part-1", original: { PID: "000042", Objektname: "Seite" } };
    const strip = { id: "strip-A", plates: [plate] };
    render(
      <CutPlanPanel
        sheet={{
          MID: "U960",
          settings: { cutGap: 4 },
          strips: [strip],
          nestingPlates: [{
            placedWidth: 2800,
            placedHeight: 2070,
            cuts: [{ x: 600, y: 0, width: 4, height: 2070, stripId: "strip-A" }]
          }]
        }}
        activeStripId={null}
        onSelectStrip={vi.fn()}
      />
    );

    expect(screen.queryByText("PID 000042")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Einzelteile in Strip/)).not.toBeInTheDocument();
  });
});
