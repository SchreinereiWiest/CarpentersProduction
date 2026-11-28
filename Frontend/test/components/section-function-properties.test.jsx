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

    it("allows locked middle walls to be positioned only from cabinet edges", () => {
        const updateActiveCabinet = vi.fn();
        const selectedSnapshot = {
            id: "wall-section",
            type: "section",
            x: 19,
            y: 100,
            width: 562,
            height: 19,
            functionConfig: [],
            children: []
        };
        const currentSection = {
            ...selectedSnapshot,
            y: 300,
            lockedMiddleWall: true,
            functionConfig: [{
                id: "wall",
                type: "middleWall",
                locked: true,
                orientation: "horizontal",
                positionReference: "cabinetTop",
                positionOffset: 309.5
            }]
        };

        render(
            <SectionFunctionProperties
                selectedElement={selectedSnapshot}
                activeCabinet={{
                    width: 600,
                    height: 720,
                    depth: 535,
                    thickness: 19,
                    functionDefaults: {
                        shelf: {
                            holeRow: { centered: true }
                        }
                    },
                    sections: [currentSection]
                }}
                updateActiveCabinet={updateActiveCabinet}
                setSelectedElement={vi.fn()}
                cncConfig={{}}
            />
        );

        expect(screen.getByDisplayValue("309.5")).toBeInTheDocument();
        expect(screen.getByDisplayValue("410.5")).toBeInTheDocument();
        expect(screen.queryByText("Abstand zur Sektionoberkante")).not.toBeInTheDocument();
        expect(screen.queryByText("Abstand zur Sektionunterkante")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Horizontal" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Vertikal" })).toBeDisabled();

        fireEvent.change(screen.getByDisplayValue("410.5"), {
            target: { value: "100" }
        });

        expect(updateActiveCabinet).toHaveBeenLastCalledWith({
            sections: [expect.objectContaining({
                functionConfig: [expect.objectContaining({
                    id: "wall",
                    positionReference: "cabinetBottom",
                    positionOffset: 100,
                    absoluteOffset: 100
                })]
            })]
        });
    });
});
