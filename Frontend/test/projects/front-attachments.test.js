import { describe, expect, it, vi } from "vitest";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import {
    getFrontBoxPositionFromBottom,
    getInsetFrontGeometry
} from "@Engine/cabinet/sektions/front/frontAttachments.js";
import { cabinet, materials } from "../fixtures/project.fixture.js";

const section = {
    id: "section-drawer",
    type: "section",
    x: 19,
    y: 19,
    width: 562,
    height: 682,
    children: [],
    functionConfig: [{
        id: "drawer-m",
        type: "legrabox",
        variant: "M",
        positionFromBottom: 40
    }]
};

describe("Frontbefestigungen", () => {
    it("leitet 59 mm aus Korpus und Legrabox ab und setzt D5/Z1 bei 72 mm", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const front = {
            id: "drawer-front",
            name: "Schubkastenfront",
            type: "front",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            gapLeft: 0,
            gapRight: 0,
            attachment: {
                type: "drawer",
                sectionId: section.id,
                functionId: "drawer-m"
            },
            children: []
        };
        const testCabinet = {
            ...cabinet,
            backPanel: { construction: "butt", continuous: "side" },
            sections: [section],
            fronts: [front]
        };

        expect(getFrontBoxPositionFromBottom({
            cabinet: testCabinet,
            front
        })).toBe(59);

        const partList = await buildPartList([testCabinet], materials, DEFAULT_CNC);
        const frontPart = partList[0].Children.find(part => part.Source?.frontId === front.id);
        const operations = frontPart.CNC.operations.filter(operation => operation.source?.role === "drawerFront");

        expect(operations).toHaveLength(2);
        expect(operations.every(operation => (
            operation.kind === "drill.point" &&
            operation.intentId === "front.drawerMount" &&
            operation.type === undefined
        ))).toBe(true);
        expect(operations).toEqual(expect.arrayContaining([
            expect.objectContaining({ x: 648, y: 33, diameter: 5, depth: 1 }),
            expect.objectContaining({ x: 648, y: 567, diameter: 5, depth: 1 })
        ]));
        expect(operations.every(operation => operation.source.verticalFromBottom === 72)).toBe(true);
    });

    it("ergänzt für Legrabox C eine zweite Bohrgruppe 92 mm über der Grundgruppe", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const cSection = {
            ...section,
            id: "section-drawer-c",
            functionConfig: [{
                ...section.functionConfig[0],
                id: "drawer-c",
                variant: "C"
            }]
        };
        const front = {
            id: "drawer-front-c",
            name: "Schubkastenfront C",
            type: "front",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            attachment: {
                type: "drawer",
                sectionId: cSection.id,
                functionId: "drawer-c"
            },
            children: []
        };
        const partList = await buildPartList([{
            ...cabinet,
            backPanel: { construction: "butt", continuous: "side" },
            sections: [cSection],
            fronts: [front]
        }], materials, DEFAULT_CNC);
        const frontPart = partList[0].Children.find(part => part.Source?.frontId === front.id);
        const operations = frontPart.CNC.operations.filter(operation => operation.source?.role === "drawerFront");

        expect(operations).toHaveLength(4);
        expect([...new Set(operations.map(operation => operation.source.verticalFromBottom))]).toEqual([72, 164]);
        expect(operations.filter(operation => operation.source.groupId === "c-secondary")).toHaveLength(2);
    });

    it("spiegelt die linke Korpusseite zur CNC-Vorderkante und berücksichtigt die obere Fuge", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const front = {
            id: "door-front",
            name: "Tür",
            type: "front",
            x: 0,
            y: 10,
            width: 600,
            height: 710,
            attachment: { type: "door", hingeSide: "left" },
            children: []
        };
        const partList = await buildPartList([{
            ...cabinet,
            frontGrainDirection: "horizontal",
            backPanel: { construction: "butt", continuous: "side" },
            spax: false,
            sections: [],
            fronts: [front]
        }], materials, DEFAULT_CNC);
        const parts = partList[0].Children;
        const frontPart = parts.find(part => part.Source?.frontId === front.id);
        const cupOperations = frontPart.CNC.operations.filter(operation => operation.source?.role === "hingeCup");
        const leftSide = parts.find(part => part.Source?.instances?.[0]?.side === "left");
        const rightSide = parts.find(part => part.Source?.instances?.[0]?.side === "right");
        const leftCorpusOperations = leftSide.CNC.operations.filter(operation => operation.source?.role === "hingeCorpus");
        const rightCorpusOperations = rightSide.CNC.operations.filter(operation => operation.source?.role === "hingeCorpus");

        expect(frontPart).toMatchObject({
            L: 710,
            B: 600,
            Source: { orientation: "lengthOnDx" }
        });
        expect(cupOperations).toEqual(expect.arrayContaining([
            expect.objectContaining({ x: 100, y: 22.5, diameter: 35, depth: 13 }),
            expect.objectContaining({ x: 610, y: 22.5, diameter: 35, depth: 13 })
        ]));
        expect(cupOperations.every(operation => operation.intentId === "front.hingeCup")).toBe(true);
        expect(leftCorpusOperations.every(operation => operation.intentId === "cabinet.hingePlate")).toBe(true);
        expect(leftCorpusOperations.map(operation => [operation.x, operation.y])).toEqual([
            [642, 37],
            [578, 37],
            [132, 37],
            [68, 37]
        ]);
        expect(rightCorpusOperations).toHaveLength(0);
    });

    it("behält neu erzeugte Türprogramme auch bei einem älteren Partlist-Preset", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        const frontWithoutProgram = {
            id: "preset-door",
            name: "Preset-Tür",
            type: "front",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            attachment: { type: "none" },
            children: []
        };
        const baseCabinet = {
            ...cabinet,
            backPanel: { construction: "butt", continuous: "side" },
            spax: false,
            sections: [],
            fronts: [frontWithoutProgram]
        };
        const oldPartList = await buildPartList([baseCabinet], materials, DEFAULT_CNC);
        const partList = await buildPartList([{
            ...baseCabinet,
            fronts: [{
                ...frontWithoutProgram,
                attachment: { type: "door", hingeSide: "right" }
            }],
            partListPreset: oldPartList[0].Children
        }], materials, DEFAULT_CNC);
        const frontPart = partList[0].Children.find(part => part.Source?.frontId === frontWithoutProgram.id);

        expect(frontPart.CNC.operations.filter(operation => operation.source?.role === "hingeCup")).toHaveLength(2);
    });

    it("berechnet die innenliegende Front aus lichter Breite und Legraboxhöhe", () => {
        const front = {
            id: "inset-front",
            x: 0,
            y: 0,
            width: 600,
            height: 720,
            attachment: {
                type: "insetDrawer",
                sectionId: section.id,
                functionId: "drawer-m"
            }
        };
        const testCabinet = {
            ...cabinet,
            insetFront: {
                widthClearance: 5,
                heightAddition: 10,
                bottomClearance: 2.5
            },
            sections: [section]
        };
        const geometry = getInsetFrontGeometry({
            cabinet: testCabinet,
            front,
            cncConfig: DEFAULT_CNC
        });
        const insetFront = { ...front, ...geometry };

        expect(geometry).toMatchObject({
            x: 21.5,
            y: 584.5,
            width: 557,
            height: 114
        });
        expect(getFrontBoxPositionFromBottom({
            cabinet: testCabinet,
            front: insetFront
        })).toBe(37.5);
    });
});
