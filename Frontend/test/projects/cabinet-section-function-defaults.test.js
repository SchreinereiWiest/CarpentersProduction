import { describe, expect, it } from "vitest";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import { createShelfHoleRowDefaults } from "../../src/features/projects/cabinet/sectionFunctionDefaults.js";

describe("cabinet section function defaults", () => {
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
