import { describe, expect, it } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { compileShelf } from "@Engine/cabinet/cnc/compiler/sections/operations/compileShelf.js";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";
import {
    AVAILABLE_POSTPROCESSORS,
    createPluginConfiguration,
    DEFAULT_MACHINING_ASSIGNMENTS,
    generateCncMachineCode,
    MACHINING_INTENT_IDS,
    MACHINING_KINDS
} from "@Engine/postprocessor/index.js";

const compile = centered => {
    const part = {
        L: 720,
        B: 535,
        T: 19,
        CNC: { operations: [] }
    };

    compileShelf({
        section: {
            id: "section-1",
            y: 20,
            height: 500
        },
        func: {
            id: "shelf-1",
            type: "shelf",
            compartmentCount: 2,
            holeRow: {
                spacing: 32,
                startFromBottom: 44,
                endFromTop: 53,
                centered
            }
        },
        boundary: { part, face: "A" },
        config: DEFAULT_CNC
    });

    return part.CNC.operations[0];
};

describe("mittige Lochreihe", () => {
    it("speichert die Benutzergrenzen neutral und überlässt die Auflösung dem Postprozessor", () => {
        const operation = compile(true);
        const requestedStart = 20 + 53;
        const requestedEnd = 20 + 500 - 44;

        expect(operation.start).toBe(requestedStart);
        expect(operation.end).toBe(requestedEnd);
        expect(operation.centered).toBe(true);
        expect(operation.rangeStart).toBeUndefined();
        expect(operation.rangeEnd).toBeUndefined();
        expect(operation.source.centered).toBe(true);
    });

    it("verwendet ohne aktivierte Checkbox unverändert die angegebenen Grenzen", () => {
        const operation = compile(false);

        expect(operation.start).toBe(73);
        expect(operation.end).toBe(476);
        expect(operation.centered).toBe(false);
        expect(operation.rangeStart).toBeUndefined();
        expect(operation.rangeEnd).toBeUndefined();
        expect(operation.source.centered).toBe(false);
    });

    it("lässt beim Partlist-Build keinen älteren CNC-Profilsnapshot die Cabinet-Grenzen überschreiben", async () => {
        const cabinet = {
            id: "centered-build-cabinet",
            name: "Lochreihen-Test",
            width: 600,
            height: 720,
            depth: 535,
            thickness: 19,
            quantity: 1,
            topExists: true,
            bottomExists: true,
            continuous: "side",
            spax: false,
            fronts: [],
            sections: [{
                id: "section-1",
                type: "section",
                x: 19,
                y: 20,
                width: 562,
                height: 500,
                children: [],
                functionConfig: [{
                    id: "shelf-1",
                    type: "shelf",
                    compartmentCount: 2,
                    holeRow: {
                        spacing: 32,
                        startFromBottom: 44,
                        endFromTop: 53,
                        centered: true
                    }
                }]
            }],
            functionConfig: [{
                id: "stored-cnc-programs",
                type: "cncPrograms",
                schemaVersion: 1,
                recognizedProfiles: [{
                    id: "old-centered-profile",
                    partKey: "part:1",
                    profileType: "shelf.row",
                    sectionId: "section-1",
                    functionId: "shelf-1",
                    intentIds: [MACHINING_INTENT_IDS.SHELF_PIN_ROW],
                    operations: [{
                        id: "old-centered-row",
                        kind: MACHINING_KINDS.DRILL_ROW,
                        intentId: MACHINING_INTENT_IDS.SHELF_PIN_ROW,
                        face: "A",
                        axis: "x",
                        start: 82.5,
                        end: 466.5,
                        rangeStart: 73,
                        rangeEnd: 476,
                        centered: true,
                        spacing: 32,
                        crossPositions: [37, 498],
                        diameter: 5,
                        depth: 14,
                        source: {
                            type: "section",
                            role: "shelf",
                            sectionId: "section-1",
                            functionId: "shelf-1",
                            centered: true
                        }
                    }]
                }],
                customPrograms: [],
                partOrders: [],
                partHeaders: []
            }]
        };

        const [root] = await buildPartList([cabinet], [], DEFAULT_CNC);
        const side = root.Children.find(part => part.Source?.role === "side");
        const leftProgram = side.CNC.machiningVariants?.[0]?.cnc ?? side.CNC;
        const operation = leftProgram.operations.find(entry => entry.intentId === MACHINING_INTENT_IDS.SHELF_PIN_ROW);

        expect(operation).toMatchObject({
            start: 73,
            end: 476,
            centered: true,
            depth: 16
        });
        expect(operation.rangeStart).toBeUndefined();
        expect(operation.rangeEnd).toBeUndefined();
    });

    it("transformiert die Lochreihe eingesetzter Seiten in lokale Bauteilkoordinaten", async () => {
        const cabinet = {
            id: "rechts-u",
            name: "rechtsU",
            width: 280,
            height: 580,
            depth: 350,
            thickness: 19,
            quantity: 1,
            topExists: true,
            bottomExists: true,
            continuous: "bottom",
            spax: false,
            fronts: [],
            sections: [{
                id: "section-rechts-u",
                type: "section",
                x: 19,
                y: 19,
                width: 242,
                height: 542,
                children: [],
                functionConfig: [{
                    id: "shelf-rechts-u",
                    type: "shelf",
                    compartmentCount: 2,
                    holeRow: {
                        spacing: 32,
                        frontOffset: 50,
                        backOffset: 70,
                        startFromBottom: 170,
                        endFromTop: 170,
                        centered: true
                    }
                }]
            }]
        };

        const [root] = await buildPartList([cabinet], [], DEFAULT_CNC);
        const side = root.Children.find(part => part.Source?.role === "side");
        const leftProgram = side.CNC.machiningVariants?.[0]?.cnc ?? side.CNC;
        const operation = leftProgram.operations.find(entry => entry.intentId === MACHINING_INTENT_IDS.SHELF_PIN_ROW);

        expect(side.L).toBe(542);
        expect(operation).toMatchObject({
            start: 170,
            end: 372,
            centered: true
        });

        const descriptor = AVAILABLE_POSTPROCESSORS.find(item => item.id === "scm-xilog3-routolink");
        const postprocessor = {
            id: "rechts-u-xilog",
            pluginId: descriptor.id,
            name: "SCM RoutoLink",
            configuration: createPluginConfiguration({ manifest: descriptor })
        };
        const result = generateCncMachineCode(postprocessor, {
            assignments: DEFAULT_MACHINING_ASSIGNMENTS,
            part: {
                ...side,
                CNC: leftProgram
            }
        });

        expect(result.code).toContain("LR2M X=170 Y=50 Z=16 x=170 y=70");
    });
});
