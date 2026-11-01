import { describe, expect, it } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { createShelfHoleRowDefaults, getShelfFrontOffsetDefault } from "../../src/features/projects/cabinet/sectionFunctionDefaults.js";

describe("cabinet section function defaults", () => {
    it("uses a separate 10 mm shelf setback for new hole-row function configs", () => {
        expect(DEFAULT_CNC.shelf.shelfFrontOffset).toBe(10);
        expect(getShelfFrontOffsetDefault()).toBe(10);
        expect(createShelfHoleRowDefaults()).toMatchObject({
            frontOffset: DEFAULT_CNC.shelf.frontOffset,
            backOffset: DEFAULT_CNC.shelf.backOffset
        });
        expect(getShelfFrontOffsetDefault({ shelf: { shelfFrontOffset: 14 } })).toBe(14);
        expect(createShelfHoleRowDefaults({
            shelf: { shelfFrontOffset: 14, frontOffset: 55, backOffset: 72 }
        })).toMatchObject({
            frontOffset: 55,
            backOffset: 72
        });
    });

    it("provides machine-independent defaults for Clamex, grooves and rabbets", () => {
        expect(DEFAULT_CNC.clamex).toMatchObject({
            surface: { axisMode: "3-axis", cutterType: "router" },
            horizontal: { axisMode: "3-axis", cutterType: "disc" },
            edgeDistance: 80,
            outsideOffset: 20,
            reducedConnectorThreshold: 300
        });
        expect(DEFAULT_CNC.backPanel.groove).toMatchObject({
            continuous: { startOffset: -20, endOffset: -20 },
            inserted: { startOffset: 3, endOffset: 3 },
            distanceFromBack: 20,
            zDepth: 9,
            width: 8.3
        });
        expect(DEFAULT_CNC.backPanel.rabbet).toMatchObject({
            continuous: { startLeft: -20, endRight: -20 },
            inserted: { startLeft: 3, endRight: 3 },
            depth: 16,
            topOffset: 7
        });
    });

    it("uses the configured front and back offsets for a new shelf function", () => {
        expect(createShelfHoleRowDefaults({
            shelf: {
                frontOffset: 55,
                backOffset: 72
            }
        })).toMatchObject({
            frontOffset: 55,
            backOffset: 72
        });
    });

    it("supports the persisted cncDefault wrapper and falls back per missing value", () => {
        expect(createShelfHoleRowDefaults({
            cncDefault: {
                shelf: {
                    frontOffset: 48
                }
            }
        })).toEqual({
            spacing: 32,
            frontOffset: 48,
            backOffset: DEFAULT_CNC.shelf.backOffset,
            startFromBottom: 150,
            endFromTop: 150
        });
    });
});
