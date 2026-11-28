import test from "node:test";
import assert from "node:assert/strict";
import { createPlateCutPlan, paginateNestingCuts } from "../src/nesting/cutPlan.js";

test("Schnittplan übernimmt Reihenfolge, Maße und Richtung der Plattenschnitte", () => {
  const group = { MID: "U960", T: 19, settings: { cutGap: 4 } };
  const plate = {
    placedWidth: 2800,
    placedHeight: 2070,
    cuts: [
      { x: 600, y: 0, width: 4, height: 2070, stripId: "A" },
      { x: 0, y: 720, width: 600, height: 4, stripId: "A" }
    ]
  };

  const plan = createPlateCutPlan(group, plate, 0);

  assert.equal(plan.material, "U960");
  assert.equal(plan.cuts.length, 2);
  assert.deepEqual(
    plan.cuts.map(({ number, direction, position, length, stripId }) => ({ number, direction, position, length, stripId })),
    [
      { number: 1, direction: "vertical", position: 602, length: 2070, stripId: "A" },
      { number: 2, direction: "horizontal", position: 722, length: 600, stripId: "A" }
    ]
  );
});

test("lange Schnittfolgen werden ausgewogen auf Spalten und Seiten verteilt", () => {
  const cuts = Array.from({ length: 47 }, (_, index) => ({ number: index + 1 }));
  const pages = paginateNestingCuts(cuts);

  assert.deepEqual(pages.map((page) => page.cuts.length), [24, 23]);
  assert.deepEqual(pages.map((page) => page.columns.map((column) => column.length)), [
    [12, 12],
    [12, 11]
  ]);
  assert.equal(pages[0].startNumber, 1);
  assert.equal(pages[1].endNumber, 47);
});
