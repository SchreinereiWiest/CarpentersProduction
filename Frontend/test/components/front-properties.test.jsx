import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FrontProperties from "../../src/features/projects/cabinet/components/editor/properties/FrontProperties.jsx";
import { toggleFrontRemoved } from "@Engine/cabinet/sektions/front/toggleFrontRemoved.js";


describe("FrontProperties", () => {
    it("uses vertical grain by default and allows horizontal grain for all fronts", () => {
        const updateActiveCabinet = vi.fn();

        render(
            <FrontProperties
                selectedElement={null}
                activeCabinet={{ fronts: [] }}
                updateActiveCabinet={updateActiveCabinet}
                frontSplitSpec="1"
                setFrontSplitSpec={vi.fn()}
                frontSplitDirection="vertical"
                setFrontSplitDirection={vi.fn()}
                generateFronts={vi.fn()}
                setSelectedElement={vi.fn()}
            />
        );

        expect(screen.getByRole("button", { name: "Hochkant" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
        expect(screen.getByRole("button", { name: "Quer" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );

        fireEvent.click(screen.getByRole("button", { name: "Quer" }));

        expect(updateActiveCabinet).toHaveBeenCalledWith({
            frontGrainDirection: "horizontal"
        });
    });

    it("keeps a leading minus while entering an outer front overhang", () => {
        const updateActiveCabinet = vi.fn();

        function TestHarness() {
            const [activeCabinet, setActiveCabinet] = useState({
                frontGap: 3,
                frontGapLeft: 0,
                frontGapRight: 0,
                frontGapTop: 0,
                frontGapBottom: 0,
                fronts: []
            });

            return (
                <FrontProperties
                    selectedElement={null}
                    activeCabinet={activeCabinet}
                    updateActiveCabinet={changes => {
                        updateActiveCabinet(changes);
                        setActiveCabinet(current => ({
                            ...current,
                            ...changes
                        }));
                    }}
                    frontSplitSpec="1"
                    setFrontSplitSpec={vi.fn()}
                    frontSplitDirection="vertical"
                    setFrontSplitDirection={vi.fn()}
                    splitFront={vi.fn()}
                    mergeFrontChildren={vi.fn()}
                    findFrontParent={vi.fn(() => null)}
                    generateFronts={vi.fn()}
                    setSelectedElement={vi.fn()}
                />
            );
        }

        render(<TestHarness />);

        const input = screen.getByLabelText("Links");

        fireEvent.change(input, { target: { value: "-" } });

        expect(input).toHaveValue("-");
        expect(updateActiveCabinet).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: "-12,5" } });

        expect(input).toHaveValue("-12,5");
        expect(updateActiveCabinet).toHaveBeenLastCalledWith({
            frontGapLeft: -12.5
        });
    });

    it("removes a selected front reversibly without changing its layout", () => {
        const updateActiveCabinet = vi.fn();

        function TestHarness() {
            const initialFront = {
                id: "front-1",
                type: "front",
                name: "Front 1",
                x: 12,
                y: 24,
                width: 500,
                height: 300,
                children: []
            };
            const [activeCabinet, setActiveCabinet] = useState({
                frontGap: 3,
                fronts: [initialFront]
            });
            const [selectedElement, setSelectedElement] = useState(initialFront);

            return (
                <FrontProperties
                    selectedElement={selectedElement}
                    activeCabinet={activeCabinet}
                    updateActiveCabinet={changes => {
                        updateActiveCabinet(changes);
                        setActiveCabinet(current => ({
                            ...current,
                            ...changes
                        }));
                    }}
                    frontSplitSpec="1"
                    setFrontSplitSpec={vi.fn()}
                    frontSplitDirection="vertical"
                    setFrontSplitDirection={vi.fn()}
                    splitFront={vi.fn()}
                    toggleFrontRemoved={toggleFrontRemoved}
                    mergeFrontChildren={vi.fn()}
                    findFrontParent={vi.fn(() => null)}
                    setSelectedElement={setSelectedElement}
                />
            );
        }

        render(<TestHarness />);

        fireEvent.click(screen.getByRole("button", { name: "Front löschen" }));

        expect(updateActiveCabinet).toHaveBeenLastCalledWith({
            fronts: [{
                id: "front-1",
                type: "front",
                name: "Front 1",
                x: 12,
                y: 24,
                width: 500,
                height: 300,
                children: [],
                isRemoved: true
            }]
        });
        expect(screen.getByRole("button", { name: "Front wieder einfügen" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Front unterteilen" })).toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Front wieder einfügen" }));

        expect(updateActiveCabinet).toHaveBeenLastCalledWith({
            fronts: [expect.objectContaining({
                id: "front-1",
                isRemoved: false
            })]
        });
        expect(screen.getByRole("button", { name: "Front löschen" })).toBeInTheDocument();
    });
});
