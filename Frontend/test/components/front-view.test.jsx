import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrontLayer } from "../../src/features/projects/cabinet/components/view/front.view.jsx";


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
});
