import { describe, expect, it } from "vitest";
import { detectPdfSnapPoints } from "../../src/pages/projects/aufmas/import/pdfSnap.js";

const syntheticPlan = () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const paint = (x, y) => {
        const index = (y * width + x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
    };
    for (let x = 15; x <= 85; x += 1) paint(x, 50);
    for (let y = 15; y <= 85; y += 1) paint(50, y);
    return { data, width, height };
};

const onePixelRectangle = () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const paint = (x, y) => {
        const index = (y * width + x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
        data[index + 3] = 255;
    };

    for (let x = 20; x <= 80; x += 1) {
        paint(x, 20);
        paint(x, 80);
    }
    for (let y = 20; y <= 80; y += 1) {
        paint(20, y);
        paint(80, y);
    }
    return { data, width, height };
};

describe("PDF snap point detection", () => {
    it("finds the intersection of long PDF lines", () => {
        const points = detectPdfSnapPoints(syntheticPlan(), { maxPoints: 20, minDistance: 10 });
        expect(points.some(point => Math.hypot(point.x - 50, point.y - 50) < 8)).toBe(true);
        expect(points.length).toBeLessThanOrEqual(20);
    });

    it("finds every corner of a one-pixel technical rectangle", () => {
        const points = detectPdfSnapPoints(onePixelRectangle(), {
            maxPoints: 20,
            minDistance: 8,
            minBranches: 2
        });

        for (const [x, y] of [[20, 20], [80, 20], [20, 80], [80, 80]]) {
            expect(points.some(point => Math.hypot(point.x - x, point.y - y) < 5)).toBe(true);
        }
    });
});
