import { describe, expect, it } from "vitest";
import {
  createMeasurementScale,
  measurementValueForPoints
} from "../../src/features/projects/measurement/domain/geometry.js";

describe("Aufmaß-Rastermaßstab", () => {
  it("erzeugt aus zwei Referenzpunkten Millimeter pro Rastereinheit", () => {
    const scale = createMeasurementScale(
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      2500
    );

    expect(scale.millimetersPerUnit).toBe(25);
    expect(scale.referenceValueMm).toBe(2500);
  });

  it("berechnet und formatiert ein neues Maß anhand des Maßstabs", () => {
    const value = measurementValueForPoints(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 }
      ],
      { millimetersPerUnit: 20.25 }
    );

    expect(value).toBe("101");
  });

  it("ignoriert ungültige Referenzen und fehlende Maßstäbe", () => {
    expect(
      createMeasurementScale({ x: 1, y: 1 }, { x: 1, y: 1 }, 1000)
    ).toBeNull();
    expect(
      measurementValueForPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 }
        ],
        null
      )
    ).toBe("");
  });
});
