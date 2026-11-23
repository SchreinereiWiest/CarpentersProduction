import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CabinetWorkspaceToolbar from "../../src/features/projects/cabinet/components/editor/CabinetWorkspaceToolbar.jsx";

describe("Cabinet workspace toolbar", () => {
    it("keeps project-create actions fixed to the right of the page tabs", () => {
        render(
            <CabinetWorkspaceToolbar
                pages={[{ id: "page-1", name: "Seite 1" }]}
                activePageId="page-1"
                onSelectPage={vi.fn()}
                guideLayer="front"
                onGuideLayerChange={vi.fn()}
                activeGuideTool={null}
                setActiveGuideTool={vi.fn()}
                selectedGuide={null}
                onUpdateGuide={vi.fn()}
                onDeleteGuide={vi.fn()}
                onApplyGuide={vi.fn()}
                actions={(
                    <>
                        <button type="button">Überspringen</button>
                        <button type="button">Weiter</button>
                    </>
                )}
            />
        );

        const skipButton = screen.getByRole("button", { name: "Überspringen" });
        const actions = skipButton.parentElement;

        expect(actions).toHaveClass("ml-auto", "shrink-0");
        expect(actions).toContainElement(screen.getByRole("button", { name: "Weiter" }));
        expect(actions.previousElementSibling).toContainElement(screen.getByRole("button", { name: "Seite 1" }));
    });
});
