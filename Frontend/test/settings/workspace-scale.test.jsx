import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScaledWorkspace } from "../../src/shared/workspace/WorkspaceRoot.jsx";

describe("workspace scale", () => {
    it("expands the logical viewport before scaling the complete content", () => {
        const { container } = render(
            <ScaledWorkspace scalePercent={50}>
                <div data-testid="content">Inhalt</div>
            </ScaledWorkspace>
        );

        const scaled = container.querySelector(".workspace-scale-content");
        expect(scaled).toHaveStyle({
            width: "200%",
            height: "200%",
            transform: "scale(0.5)"
        });
        expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("does not add a scaling wrapper at the standard value", () => {
        const { container } = render(
            <ScaledWorkspace scalePercent={100}>
                <div data-testid="standard-content">Inhalt</div>
            </ScaledWorkspace>
        );

        expect(container.querySelector(".workspace-scale-content")).toBeNull();
        expect(screen.getByTestId("standard-content")).toBeInTheDocument();
    });
});
