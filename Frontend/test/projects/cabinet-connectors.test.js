import { describe, expect, it, vi } from "vitest";

import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import { groupCncParts } from "@Engine/cnc/groupCncParts.js";
import {
    expandCncMachiningVariants,
    getStoredCncVariantHeader,
    updateCncMachiningVariantHeader
} from "@Engine/cnc/machiningVariants.js";
import { MACHINING_INTENT_IDS, MACHINING_KINDS } from "@Engine/postprocessor/index.js";

const baseCabinet = {
    id: "connector-cabinet",
    name: "Verbinder-Test",
    quantity: 1,
    width: 280,
    height: 580,
    depth: 350,
    thickness: 19,
    topExists: true,
    bottomExists: true,
    spax: false,
    sections: [],
    fronts: []
};

const connectorOperations = part => (part?.CNC?.operations ?? []).filter(operation =>
    operation.intentId === MACHINING_INTENT_IDS.JOINT_CONNECTOR
);

describe("Korpusverbinder", () => {
    it("connects both ends of shortened sides to continuous horizontal panels", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});

        const [root] = await buildPartList([{
            ...baseCabinet,
            continuous: "bottom"
        }], []);
        const sideParts = root.Children.filter(part => part.Source?.role === "side");
        const horizontalPart = root.Children.find(part => part.Source?.role === "horizontalPanel");
        const groupedSides = sideParts[0];

        expect(sideParts).toHaveLength(1);
        expect(groupedSides.Anzahl).toBe(2);
        expect(groupedSides.Source.instances).toEqual([
            expect.objectContaining({ side: "left", mirrorX: false, y: 19, height: 542 }),
            expect.objectContaining({ side: "right", mirrorX: true, y: 19, height: 542 })
        ]);
        expect(groupedSides.CNC.machiningVariants).toEqual([
            expect.objectContaining({ side: "left", mirrorX: false, quantity: 1 }),
            expect.objectContaining({ side: "right", mirrorX: true, quantity: 1 })
        ]);
        expect(horizontalPart.Source.instances).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "top", x: 0, width: 280 }),
            expect.objectContaining({ id: "bottom", x: 0, width: 280 })
        ]));

        expect(connectorOperations(groupedSides).map(operation => ({
            edge: operation.edge,
            position: operation.position,
            panel: operation.source.panelType
        }))).toEqual([
            { edge: "left", position: 0, panel: "top" },
            { edge: "right", position: 542, panel: "bottom" }
        ]);

        const variants = expandCncMachiningVariants(groupedSides);
        expect(variants).toHaveLength(2);
        expect(variants[0]).toMatchObject({ PID: `${groupedSides.PID}-L`, Anzahl: 1 });
        expect(variants[0].CNC.header.sx).toBe(false);
        expect(variants[1]).toMatchObject({ PID: `${groupedSides.PID}-R`, Anzahl: 1 });
        expect(variants[1].CNC.header.sx).toBe(true);

        const rightVariant = groupedSides.CNC.machiningVariants[1];
        expect(getStoredCncVariantHeader({ ...variants[1].CNC.header, sx: false }, rightVariant).sx).toBe(true);
        const manuallyUnmirrored = updateCncMachiningVariantHeader(
            groupedSides,
            rightVariant.id,
            { ...variants[1].CNC.header, sx: false }
        );
        expect(expandCncMachiningVariants(manuallyUnmirrored)[1].CNC.header.sx).toBe(false);
        expect(manuallyUnmirrored.CNC.machiningVariants[1].cnc.header.sx).toBe(true);

        const sideGroup = groupCncParts([root]).find(group => group.name === "Seite");
        expect(sideGroup.count).toBe(2);
        expect(sideGroup.parts).toEqual([
            expect.objectContaining({ PID: `${groupedSides.PID}-L`, Anzahl: 1 }),
            expect.objectContaining({ PID: `${groupedSides.PID}-R`, Anzahl: 1 })
        ]);
        expect(sideGroup.parts.map(part => part.CNC.header.sx)).toEqual([false, true]);

        expect(connectorOperations(horizontalPart).filter(operation =>
            operation.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN
        ).map(operation => operation.x)).toEqual([9.5, 270.5]);
    });

    it("uses the opposite local end for a nested wall meeting a horizontal middle wall", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});

        const verticalWallId = "vertical-wall";
        const horizontalWallId = "horizontal-wall";
        const [root] = await buildPartList([{
            ...baseCabinet,
            id: "nested-connector-cabinet",
            width: 1450,
            height: 891,
            depth: 160,
            continuous: "side",
            sections: [
                {
                    id: "upper-section",
                    type: "section",
                    x: 19,
                    y: 19,
                    width: 1412,
                    height: 633,
                    functionConfig: [],
                    children: [{
                        id: "vertical-wall-section",
                        type: "section",
                        parentId: "upper-section",
                        x: 589,
                        y: 19,
                        width: 19,
                        height: 633,
                        functionConfig: [{
                            id: verticalWallId,
                            type: "middleWall",
                            orientation: "vertical",
                            positionReference: "sectionLeft",
                            positionOffset: 9.5
                        }],
                        children: []
                    }]
                },
                {
                    id: "horizontal-wall-section",
                    type: "section",
                    x: 19,
                    y: 652,
                    width: 1412,
                    height: 19,
                    functionConfig: [{
                        id: horizontalWallId,
                        type: "middleWall",
                        orientation: "horizontal",
                        positionReference: "sectionBottom",
                        positionOffset: 9.5
                    }],
                    children: []
                }
            ]
        }], []);
        const verticalWall = root.Children.find(part => part.Source?.wallId === verticalWallId);
        const edgeOperations = connectorOperations(verticalWall).filter(operation =>
            operation.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN
        );

        expect(edgeOperations.map(operation => ({
            edge: operation.edge,
            position: operation.position,
            panel: operation.source.panelType
        }))).toEqual([
            { edge: "left", position: 0, panel: "top" },
            { edge: "right", position: 633, panel: "middleWall" }
        ]);
        expect(edgeOperations.every(operation => ["left", "right"].includes(operation.edge))).toBe(true);
    });
});
