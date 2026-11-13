import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CncViewport from "../../src/features/projects/cnc/shared/cncViewport.jsx";

describe("CNC viewport program header", () => {
    it("mirrors machining geometry for the resolved stop and draws two stop points", () => {
        const { container } = render(<CncViewport
            part={{ L: 300, B: 200, CNC: { operations: [] } }}
            operations={[{ id: "drill", type: "BO", face: "A", x: 40, y: 50, diameter: 5 }]}
            selectedFace="A"
            onSelectOperation={() => {}}
            onSelectPart={() => {}}
            programHeader={{
                stopLabel: "D",
                anchorCorner: "top-right",
                displayMirrorX: true,
                displayMirrorY: false
            }}
        />);

        expect(container.querySelector('g[transform="translate(300 0) scale(-1 1)"]')).not.toBeNull();
        expect(container.querySelectorAll('g[aria-label="Anschlag D"] circle')).toHaveLength(2);
    });
});
