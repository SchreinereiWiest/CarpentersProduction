import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import FrontAttachmentProperties from "../../src/features/projects/cabinet/components/editor/properties/FrontAttachmentProperties.jsx";

describe("FrontAttachmentProperties", () => {
    it("verknüpft eine gewählte Schubladenfront mit der passenden Legrabox", () => {
        const updateActiveCabinet = vi.fn();
        const setSelectedElement = vi.fn();
        const front = {
            id: "front-1",
            type: "front",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            children: []
        };
        const section = {
            id: "section-1",
            type: "section",
            x: 19,
            y: 19,
            width: 562,
            height: 682,
            children: [],
            functionConfig: [{
                id: "drawer-1",
                type: "legrabox",
                variant: "M",
                positionFromBottom: 40
            }]
        };

        render(
            <FrontAttachmentProperties
                selectedElement={front}
                activeCabinet={{
                    width: 600,
                    height: 720,
                    thickness: 19,
                    fronts: [front],
                    sections: [section]
                }}
                updateActiveCabinet={updateActiveCabinet}
                setSelectedElement={setSelectedElement}
                cncConfig={DEFAULT_CNC}
                viewMode="combined"
            />
        );

        fireEvent.change(screen.getByLabelText("Fronttyp"), {
            target: { value: "drawer" }
        });

        expect(updateActiveCabinet).toHaveBeenCalledWith({
            fronts: [expect.objectContaining({
                id: "front-1",
                attachment: expect.objectContaining({
                    type: "drawer",
                    sectionId: "section-1",
                    functionId: "drawer-1"
                })
            })]
        });
        expect(setSelectedElement).toHaveBeenCalledWith(expect.objectContaining({
            id: "front-1",
            type: "front"
        }));
    });
});
