import test from "node:test";
import assert from "node:assert/strict";

import { nestStrips } from "../src/nesting/placement/nestingPlate.js";
import { nestPlates2D } from "../src/nesting/placement/nestPlates2D.js";
import {
    rebuildStripsAtSavedPositions,
    saveStripPositions
} from "../src/nesting/placement/rebuildStripPositions.js";

const settings = {
    margin: 0,
    cutGap: 4,
    nestingMode: "1d"
};

function createStrip(id, placedWidth, placedHeight, cutOrientation) {
    return {
        id,
        placedWidth,
        placedHeight,
        cutOrientation,
        plates: [],
        cuts: []
    };
}

test("rebuild without removed strip keeps every remaining strip position", () => {
    const positionedStrip = (id, x, y, width, height, orientation) => ({
        ...createStrip(id, width, height, orientation),
        x,
        y,
        sheet: 0
    });
    const strips = [
        positionedStrip("removed", 0, 0, 78, 118, "horizontal"),
        positionedStrip("upper-left", 82, 0, 97, 57, "vertical"),
        positionedStrip("upper-lower", 82, 61, 83, 34, "horizontal"),
        positionedStrip("upper-right", 183, 0, 73, 26, "horizontal"),
        positionedStrip("upper-right-middle", 183, 30, 38, 35, "horizontal"),
        positionedStrip("upper-right-bottom", 183, 69, 78, 33, "horizontal"),
        positionedStrip("lower-left", 0, 122, 116, 51, "vertical"),
        positionedStrip("lower-middle", 120, 122, 118, 65, "vertical"),
        positionedStrip("lower-middle-bottom", 120, 191, 52, 29, "horizontal"),
        positionedStrip("lower-left-bottom", 0, 177, 61, 35, "horizontal"),
        positionedStrip("lower-right", 242, 122, 20, 87, "horizontal")
    ];
    const originalPlates = [{
        id: 0,
        width: 300,
        height: 220,
        placedWidth: 300,
        placedHeight: 220,
        strips,
        plates: [],
        cuts: [],
        freeSpaces: []
    }];
    const originalPositions = originalPlates
        .flatMap((plate) => plate.strips)
        .filter((strip) => strip.id !== "removed")
        .map((strip) => ({
            id: strip.id,
            sheet: strip.sheet,
            x: strip.x,
            y: strip.y
        }));

    const savedPositions = saveStripPositions(originalPlates, "removed");
    const rebuilt = rebuildStripsAtSavedPositions(
        originalPlates,
        savedPositions,
        settings
    );

    assert.deepEqual(
        rebuilt.strips.map((strip) => ({
            id: strip.id,
            sheet: strip.sheet,
            x: strip.x,
            y: strip.y
        })),
        originalPositions
    );
    assert.equal(
        rebuilt.nestingPlates.flatMap((plate) => plate.strips)
            .some((strip) => strip.id === "removed"),
        false
    );
});

test("rebuild recalculates cuts and frees the removed footprint", () => {
    const originalPlates = nestStrips(
        [
            createStrip("removed", 80, 100, "vertical"),
            createStrip("bottom", 60, 50, "vertical"),
            createStrip("right", 100, 80, "horizontal")
        ],
        { width: 300, height: 200 },
        { ...settings, cutGap: 10 }
    );
    const rebuilt = rebuildStripsAtSavedPositions(
        originalPlates,
        saveStripPositions(originalPlates, "removed"),
        { ...settings, cutGap: 10 }
    );
    const rebuiltPlate = rebuilt.nestingPlates[0];

    assert.equal(
        rebuiltPlate.cuts.some((cut) =>
            cut.stripId === "removed" || cut.placementId === "removed"
        ),
        false
    );
    assert.ok(rebuiltPlate.cuts.length > 0);
    assert.ok(rebuiltPlate.freeSpaces.some((space) =>
        space.x === 0 &&
        space.y === 0 &&
        space.width > 0 &&
        space.height > 0
    ));
});

test("rebuild preserves empty nesting plates as reusable free space", () => {
    const originalPlates = nestStrips(
        [createStrip("only-strip", 120, 100, "vertical")],
        { width: 300, height: 200 },
        settings
    );
    const rebuilt = rebuildStripsAtSavedPositions(
        originalPlates,
        saveStripPositions(originalPlates, "only-strip"),
        settings
    );

    assert.equal(rebuilt.strips.length, 0);
    assert.equal(rebuilt.nestingPlates.length, 1);
    assert.deepEqual(rebuilt.nestingPlates[0].cuts, []);
    assert.deepEqual(rebuilt.nestingPlates[0].freeSpaces, [
        { sheet: 0, x: 0, y: 0, width: 300, height: 200 }
    ]);
});

test("2D rebuild recalculates the remaining part placements", () => {
    const twoDimensionalSettings = {
        margin: 0,
        gap: 5,
        cutGap: 4,
        nestingMode: "2d",
        allowRotation: true,
        optimizationPasses: 0,
        remainingPlates: []
    };
    const parts = [
        { id: "part-a", originalWidth: 90, originalHeight: 60, width: 95, height: 65 },
        { id: "part-b", originalWidth: 70, originalHeight: 50, width: 75, height: 55 },
        { id: "part-c", originalWidth: 55, originalHeight: 40, width: 60, height: 45 }
    ];
    const originalLayout = nestPlates2D(
        parts,
        { width: 300, height: 200 },
        twoDimensionalSettings
    );
    const removed = originalLayout.strips[0];
    const remainingPositions = originalLayout.strips
        .slice(1)
        .map((strip) => ({ id: strip.id, sheet: strip.sheet, x: strip.x, y: strip.y }));
    const rebuilt = rebuildStripsAtSavedPositions(
        originalLayout.nestingPlates,
        saveStripPositions(originalLayout.nestingPlates, removed.id),
        twoDimensionalSettings
    );

    assert.deepEqual(
        rebuilt.strips.map((strip) => ({
            id: strip.id,
            sheet: strip.sheet,
            x: strip.x,
            y: strip.y
        })),
        remainingPositions
    );
    assert.equal(
        rebuilt.nestingPlates.flatMap((plate) => plate.plates)
            .some((part) => part.placementId === removed.id),
        false
    );
    assert.equal(
        rebuilt.nestingPlates.flatMap((plate) => plate.plates).length,
        remainingPositions.length
    );
});
