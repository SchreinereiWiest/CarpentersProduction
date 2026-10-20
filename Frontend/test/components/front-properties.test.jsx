import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FrontProperties from "../../src/features/projects/cabinet/components/editor/properties/FrontProperties.jsx";


describe("FrontProperties", () => {
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
});
