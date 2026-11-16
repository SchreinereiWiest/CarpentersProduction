import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultSettings } from "@Engine/nesting/helper/defaults.js";
import NestingScene from "../../src/features/projects/nesting/nestingscene.jsx";

const part = {
  id: "part-1",
  originalWidth: 240,
  originalHeight: 120,
  width: 240,
  height: 120,
  nestingX: 0,
  nestingY: 0,
  nestingRotation: 0,
  nestingFootprintWidth: 240,
  nestingFootprintHeight: 120,
  color: "#60a5fa",
  original: { PID: "000042", Objektname: "Seite", L: 240, B: 120, CNC: { operations: [] } }
};

const strip = {
  id: "strip-1",
  sheet: 0,
  x: 0,
  y: 0,
  width: 240,
  height: 120,
  placedWidth: 240,
  placedHeight: 120,
  packingMode: "2d",
  plates: [part]
};

const result = {
  strips: [strip],
  emptyStrips: [],
  nestingPlates: [{
    id: 0,
    placedWidth: 600,
    placedHeight: 400,
    freeSpaces: [{ x: 250, y: 0, width: 350, height: 400 }]
  }]
};

const renderScene = props => render(<NestingScene
  result={result}
  setActiveStrip={vi.fn()}
  settings={{ ...defaultSettings, defaultSheet: { width: 600, height: 400 } }}
  {...props}
/>);

const viewBoxNumbers = svg => svg.getAttribute("viewBox").split(" ").map(Number);
const prepareSvgGeometry = svg => {
  Object.defineProperty(svg, "clientWidth", { configurable: true, value: 1000 });
  Object.defineProperty(svg, "clientHeight", { configurable: true, value: 700 });
  svg.getScreenCTM = () => ({ a: 1, b: 0, inverse: () => ({}) });
  svg.createSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform() { return { x: this.x, y: this.y }; }
  });
};

describe("SVG-Nesting-Viewport", () => {
  it("startet mit einem um 20 Prozent zurückgenommenen Basiszoom", () => {
    const settings = { ...defaultSettings, defaultSheet: { width: 600, height: 400 } };
    const { container, rerender } = render(<NestingScene result={null} setActiveStrip={vi.fn()} settings={settings} />);
    rerender(<NestingScene result={result} setActiveStrip={vi.fn()} settings={settings} />);
    expect(viewBoxNumbers(container.querySelector("svg"))).toEqual([-400, -960, 1400, 1800]);
  });

  it("markiert nur den Hintergrund gelb und lässt das Bauteil in seiner Materialfarbe", () => {
    const { container, rerender } = renderScene({ activeStrip: strip, activePartId: part.id });
    const partRect = container.querySelector('[data-nesting-part="part-1"]');
    const stripRect = container.querySelector('[data-nesting-strip-background="strip-1"]');
    const unused = container.querySelector('[data-unused-space="true"]');

    expect(partRect.getAttribute("rx")).toBeNull();
    expect(stripRect.getAttribute("rx")).toBeNull();
    expect(partRect.getAttribute("fill")).toBe("#60a5fa");
    expect(partRect.getAttribute("stroke")).toBeNull();
    expect(stripRect.getAttribute("stroke")).toBeNull();
    expect(stripRect.getAttribute("fill")).toBe("#facc15");
    expect(unused.getAttribute("fill")).toBe("#ef4444");
    expect(unused.getAttribute("opacity")).toBe("0.62");

    rerender(<NestingScene result={result} setActiveStrip={vi.fn()} activeStrip={strip} activePartId={null} settings={{ ...defaultSettings, defaultSheet: { width: 600, height: 400 } }} />);
    expect(container.querySelector('[data-nesting-strip-background="strip-1"]').getAttribute("fill")).toBe("#facc15");
  });

  it("zeigt einen nicht ausgewählten Hintergrund standardmäßig grün", () => {
    const { container } = renderScene({ activeStrip: null, activePartId: null });
    expect(container.querySelector('[data-nesting-strip-background="strip-1"]').getAttribute("fill")).toBe("#16a34a");
    expect(container.querySelector('[data-nesting-part="part-1"]').getAttribute("fill")).toBe("#60a5fa");
  });

  it("fängt auch Ctrl-Mausrad ab und ändert ausschließlich die SVG-viewBox", () => {
    const { container } = renderScene({ activeStrip: null, activePartId: null });
    const svg = container.querySelector("svg");
    const viewport = svg.parentElement;
    const initial = svg.getAttribute("viewBox");
    prepareSvgGeometry(svg);
    const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -100, clientX: 100, clientY: 100 });

    act(() => viewport.dispatchEvent(wheel));

    expect(wheel.defaultPrevented).toBe(true);
    expect(svg.getAttribute("viewBox")).not.toBe(initial);
    const before = initial.split(" ").map(Number);
    const after = viewBoxNumbers(svg);
    expect(after[1] + after[3] / 2).toBeCloseTo(before[1] + before[3] / 2);
  });

  it("zoomt mit zwei Fingern und hält die Y-Achse mittig gesperrt", () => {
    const { container } = renderScene({ activeStrip: null, activePartId: null });
    const svg = container.querySelector("svg");
    prepareSvgGeometry(svg);
    const before = viewBoxNumbers(svg);

    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "touch", clientX: 250, clientY: 300 });
    fireEvent.pointerDown(svg, { pointerId: 2, pointerType: "touch", clientX: 450, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 2, pointerType: "touch", clientX: 650, clientY: 500 });

    const after = viewBoxNumbers(svg);
    expect(after[2]).toBeLessThan(before[2]);
    expect(after[1] + after[3] / 2).toBeCloseTo(before[1] + before[3] / 2);

    fireEvent.pointerUp(svg, { pointerId: 1, pointerType: "touch", clientX: 250, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 2, pointerType: "touch", clientX: 650, clientY: 500 });
  });

  it("folgt beim horizontalen Panning pixelgenau der Bildschirmmatrix", () => {
    const { container } = renderScene({ activeStrip: null, activePartId: null });
    const svg = container.querySelector("svg");
    prepareSvgGeometry(svg);
    svg.getScreenCTM = () => ({ a: 0.5, b: 0, inverse: () => ({}) });
    const before = viewBoxNumbers(svg);

    fireEvent.pointerDown(svg, { pointerId: 7, pointerType: "mouse", button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(svg, { pointerId: 7, pointerType: "mouse", button: 0, clientX: 400, clientY: 500 });

    const after = viewBoxNumbers(svg);
    expect(after[0]).toBeCloseTo(before[0] - 400);
    expect(after[1]).toBe(before[1]);
  });
});
