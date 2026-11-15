import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewStrip } from "../../src/features/projects/measurement/components/panels/AufmasPanels.jsx";

const views = [
  { id: "front", label: "Vorderansicht", type: "elevation" },
  { id: "expose", label: "Exposé", type: "expose" }
];

describe("Aufmaß-Ansichtenleiste", () => {
  it("lässt sich zu einer kleinen unteren Zeile reduzieren und wieder öffnen", () => {
    const onToggleCollapsed = vi.fn();
    const { rerender } = render(
      <ViewStrip
        views={views}
        activeViewId="front"
        onViewChange={() => {}}
        objects={[]}
        onToggleCollapsed={onToggleCollapsed}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ansichten einklappen" }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    rerender(
      <ViewStrip
        views={views}
        activeViewId="front"
        onViewChange={() => {}}
        objects={[]}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
      />
    );
    expect(screen.getByText("Vorderansicht")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ansichten ausklappen" }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(2);
  });
});
