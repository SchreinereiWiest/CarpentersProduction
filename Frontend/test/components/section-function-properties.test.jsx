import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SectionFunctionProperties from "../../src/features/projects/cabinet/components/editor/properties/SectionFunctionProperties.jsx";


describe("SectionFunctionProperties", () => {
    it("shows one less shelf than the internal compartment count and adds it back on change", () => {
        const updateActiveCabinet = vi.fn();
        const section = {
            id: "section-1",
            type: "section",
            width: 600,
            height: 1000,
            functionConfig: [{
                id: "shelf-1",
                type: "shelf",
                compartmentCount: 4,
                shelfFrontOffset: 0,
                holeRow: { centered: false }
            }],
            children: []
        };

        render(
            <SectionFunctionProperties
                selectedElement={section}
                activeCabinet={{
                    depth: 600,
                    thickness: 19,
                    functionDefaults: {
                        shelf: {
                            holeRow: { centered: true }
                        }
                    },
                    sections: [section]
                }}
                updateActiveCabinet={updateActiveCabinet}
                setSelectedElement={vi.fn()}
                cncConfig={{}}
            />
        );

        const input = screen.getByDisplayValue("3");

        expect(input).toHaveValue("3");

        fireEvent.change(input, { target: { value: "5" } });

        expect(updateActiveCabinet).toHaveBeenCalledWith({
            sections: [expect.objectContaining({
                functionConfig: [expect.objectContaining({
                    compartmentCount: 6
                })]
            })]
        });

        fireEvent.click(screen.getByRole("checkbox", { name: "Lochreihe mittig" }));

        expect(updateActiveCabinet).toHaveBeenLastCalledWith({
            sections: [expect.objectContaining({
                functionConfig: [expect.objectContaining({
                    id: "shelf-1",
                    holeRow: expect.objectContaining({ centered: true })
                })]
            })]
        });
    });
});
