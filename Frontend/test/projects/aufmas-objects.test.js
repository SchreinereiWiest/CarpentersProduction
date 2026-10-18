import { describe, expect, it } from "vitest";
import { isListedAufmasObject } from "../../src/features/projects/measurement/domain/objects.js";

describe("Aufmaß object lists", () => {
  it("excludes guide lines while retaining regular measurement objects", () => {
    const objects = [
      { id: "measurement-1", kind: "measurement" },
      { id: "guide-1", kind: "guide" },
      { id: "point-1", kind: "point" }
    ];

    expect(objects.filter(isListedAufmasObject).map((object) => object.id)).toEqual([
      "measurement-1",
      "point-1"
    ]);
  });
});
