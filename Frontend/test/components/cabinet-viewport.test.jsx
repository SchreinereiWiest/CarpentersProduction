import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CabinetViewport from "../../src/features/projects/cabinet/components/view/cabinetViewport.jsx";


describe("CabinetViewport", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", class ResizeObserver {
            observe() {}
            disconnect() {}
        });
    });

    it("keeps ctrl-wheel zoom inside the editor viewport", () => {
        const { container } = render(
            <CabinetViewport
                cabinet={{
                    width: 600,
                    height: 2000,
                    depth: 580,
                    thickness: 19,
                    fronts: [],
                    sections: []
                }}
            />
        );
        const svg = container.querySelector("svg");
        const viewport = svg.parentElement;
        const initialViewBox = svg.getAttribute("viewBox");

        svg.getBoundingClientRect = () => ({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 800,
            bottom: 600,
            width: 800,
            height: 600,
            toJSON: () => ({})
        });

        const wheelEvent = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: 400,
            clientY: 300,
            ctrlKey: true,
            deltaY: -100
        });

        let dispatched;
        act(() => {
            dispatched = viewport.dispatchEvent(wheelEvent);
        });

        expect(dispatched).toBe(false);
        expect(wheelEvent.defaultPrevented).toBe(true);
        expect(svg.getAttribute("viewBox")).not.toBe(initialViewBox);
    });
});
