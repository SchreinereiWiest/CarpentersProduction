import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "@Engine/postprocessor/index.js";
import CncOperationsLayer from "../../src/features/projects/cnc/shared/cncOperationLayer.jsx";

describe("CNC operation layer", () => {
    it("renders neutral machining operations used by generated cabinet parts", () => {
        const { container } = render(
            <svg>
                <CncOperationsLayer
                    part={{ L: 600, B: 400 }}
                    selectedFace="A"
                    operations={[{
                        id: "drill-1",
                        kind: MACHINING_KINDS.DRILL_POINT,
                        intentId: MACHINING_INTENT_IDS.MANUAL_DRILLING,
                        face: "A",
                        x: 120,
                        y: 80,
                        diameter: 8,
                        depth: 15
                    }]}
                />
            </svg>
        );

        const hole = container.querySelector("circle");
        expect(hole).not.toBeNull();
        expect(hole).toHaveAttribute("cx", "120");
        expect(hole).toHaveAttribute("cy", "80");
    });
});
