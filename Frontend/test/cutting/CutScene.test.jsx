import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CutScene from "../../src/features/projects/cutting/cutScene.jsx";

const plate = {
    id: "part-1",
    originalWidth: 240,
    originalHeight: 120,
    width: 240,
    height: 120,
    color: "#60a5fa",
    EdgeT: "ABS-1",
    EdgeR: "ABS-2",
    EdgeB: "",
    EdgeL: "",
    original: {
        PID: "000042",
        Objektname: "Seite",
        L: 240,
        B: 120,
        CNC: { operations: [{ id: "drill-1", type: "BO", face: "A", x: 40, y: 30, diameter: 5 }] }
    }
};

const strip = {
    id: "strip-1",
    packingMode: "1d",
    plates: [plate]
};

const stack = {
    strips: [{
        strip,
        originalIndex: 0,
        layout: {
            layoutType: "vertical",
            rotation: 0,
            placedWidth: 260,
            placedHeight: 140,
            items: [{ plate, x: 10, y: 10, width: 240, height: 120 }]
        }
    }]
};

const partId = "strip-1-part-1-0";
const viewBoxNumbers = svg => svg.getAttribute("viewBox").split(" ").map(Number);
const prepareSvgGeometry = (svg, scale = 1) => {
    Object.defineProperty(svg, "clientWidth", { configurable: true, value: 1000 });
    Object.defineProperty(svg, "clientHeight", { configurable: true, value: 700 });
    svg.getScreenCTM = () => ({ a: scale, b: 0, inverse: () => ({}) });
    svg.createSVGPoint = () => ({
        x: 0,
        y: 0,
        matrixTransform() { return { x: this.x, y: this.y }; }
    });
};

describe("SVG-Cut-View", () => {
    it("startet mit einem um 20 Prozent zurückgenommenen Basiszoom", () => {
        const { container } = render(<CutScene stack={stack} />);
        expect(viewBoxNumbers(container.querySelector("svg"))).toEqual([-357.5, -342.5, 975, 825]);
    });

    it("behält die Materialfarbe, markiert nur den Strip-Hintergrund und zeigt Kanten sowie CNC", () => {
        const { container } = render(
            <CutScene
                stack={stack}
                selectedPartKey={partId}
                finishedPartKeys={new Set([partId])}
                cncSettings={{}}
            />
        );

        const background = container.querySelector('[data-cut-strip-background="strip-1"]');
        const partGroup = container.querySelector(`[data-cut-part="${partId}"]`);
        const partRect = partGroup.querySelector("rect");

        expect(background.getAttribute("fill")).toBe("#facc15");
        expect(background.getAttribute("stroke")).toBeNull();
        expect(background.getAttribute("rx")).toBeNull();
        expect(partRect.getAttribute("fill")).toBe("#60a5fa");
        expect(partRect.getAttribute("stroke")).toBeNull();
        expect(partGroup.querySelectorAll("[data-cut-edge]")).toHaveLength(2);
        expect(partGroup.querySelector('[data-cut-edge="top"]')).toBeInTheDocument();
        expect(partGroup.querySelector('[data-cut-edge="right"]')).toBeInTheDocument();
        expect(partGroup.querySelector('[data-cnc-part-overlay="true"]')).toBeInTheDocument();
        expect(partGroup.querySelector('[data-cnc-part-overlay="true"] circle')).toBeInTheDocument();
        expect(partGroup).toHaveTextContent("FERTIG");
    });

    it("zeigt den nicht ausgewählten Strip-Hintergrund grün und wählt per Klick das Einzelteil", () => {
        const onSelectPart = vi.fn();
        const { container } = render(<CutScene stack={stack} onSelectPart={onSelectPart} />);
        const svg = container.querySelector("svg");
        const partGroup = container.querySelector(`[data-cut-part="${partId}"]`);
        prepareSvgGeometry(svg);

        expect(container.querySelector('[data-cut-strip-background="strip-1"]').getAttribute("fill")).toBe("#16a34a");
        fireEvent.pointerDown(partGroup, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 200 });
        fireEvent.pointerUp(svg, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 200 });

        expect(onSelectPart).toHaveBeenCalledWith(expect.objectContaining({ key: partId, plate }));
    });

    it("folgt beim horizontalen Panning pixelgenau der Bildschirmmatrix und sperrt Y", () => {
        const { container } = render(<CutScene stack={stack} />);
        const svg = container.querySelector("svg");
        prepareSvgGeometry(svg, 0.5);
        const before = viewBoxNumbers(svg);

        fireEvent.pointerDown(svg, { pointerId: 7, pointerType: "mouse", button: 0, clientX: 200, clientY: 200 });
        fireEvent.pointerMove(svg, { pointerId: 7, pointerType: "mouse", button: 0, clientX: 400, clientY: 500 });

        const after = viewBoxNumbers(svg);
        expect(after[0]).toBeCloseTo(before[0] - 400);
        expect(after[1]).toBe(before[1]);
    });

    it("zoomt mit zwei Fingern und hält die Y-Achse mittig", () => {
        const { container } = render(<CutScene stack={stack} />);
        const svg = container.querySelector("svg");
        prepareSvgGeometry(svg);
        const before = viewBoxNumbers(svg);

        fireEvent.pointerDown(svg, { pointerId: 1, pointerType: "touch", clientX: 250, clientY: 300 });
        fireEvent.pointerDown(svg, { pointerId: 2, pointerType: "touch", clientX: 450, clientY: 300 });
        fireEvent.pointerMove(svg, { pointerId: 2, pointerType: "touch", clientX: 650, clientY: 500 });

        const after = viewBoxNumbers(svg);
        expect(after[2]).toBeLessThan(before[2]);
        expect(after[1] + after[3] / 2).toBeCloseTo(before[1] + before[3] / 2);
    });
});
