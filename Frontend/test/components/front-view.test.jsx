import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrontLayer } from "../../src/features/projects/cabinet/components/view/front.view.jsx";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";


describe("FrontLayer", () => {
    it("renders a removed front gray and transparent while keeping it selectable", () => {
        const { container } = render(
            <svg>
                <FrontLayer
                    cabinet={{
                        width: 600,
                        height: 700,
                        fronts: [{
                            id: "front-removed",
                            x: 0,
                            y: 0,
                            width: 600,
                            height: 700,
                            isRemoved: true,
                            children: []
                        }]
                    }}
                    selectedElement={{ id: "front-removed" }}
                />
            </svg>
        );

        const frontRectangle = container.querySelector('rect[fill="#52525b"]');

        expect(frontRectangle).not.toBeNull();
        expect(frontRectangle).toHaveAttribute("stroke-dasharray", "8 6");
        expect(frontRectangle.parentElement).toHaveAttribute("opacity", "0.35");
        expect(frontRectangle.parentElement).toHaveStyle({ cursor: "pointer" });
    });

    it("shows hinge and drawer machining with reduced opacity in the combined layer", () => {
        const { container } = render(
            <svg>
                <FrontLayer
                    cabinet={{
                        width: 600,
                        height: 700,
                        sections: [],
                        fronts: [
                            {
                                id: "door-front",
                                x: 0,
                                y: 0,
                                width: 300,
                                height: 700,
                                attachment: { type: "door", hingeSide: "left" },
                                children: []
                            },
                            {
                                id: "drawer-front",
                                x: 300,
                                y: 0,
                                width: 300,
                                height: 200,
                                attachment: { type: "drawer", boxPositionFromBottom: 59 },
                                children: []
                            }
                        ]
                    }}
                    cncConfig={DEFAULT_CNC}
                    showMachining
                    machiningOpacity={0.65}
                />
            </svg>
        );

        const cups = container.querySelectorAll('[data-machining-role="hingeCup"]');
        const drawerHoles = container.querySelectorAll('[data-machining-role="drawerFront"]');
        const doorMachining = container.querySelector('[data-front-machining="door-front"]');

        expect(cups).toHaveLength(2);
        expect(cups[0]).toHaveAttribute("cx", "22.5");
        expect(cups[0]).toHaveAttribute("cy", "100");
        expect(drawerHoles).toHaveLength(2);
        expect(drawerHoles[0]).toHaveAttribute("cx", "333");
        expect(drawerHoles[0]).toHaveAttribute("cy", "128");
        expect(doorMachining).toHaveAttribute("opacity", "0.65");
    });
});
