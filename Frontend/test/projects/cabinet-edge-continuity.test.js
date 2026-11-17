import { describe, expect, it } from "vitest";

import { generateBottomPart } from "@Engine/cabinet/partList/geometry/generate/generateBottomParts.js";
import { generateSideParts } from "@Engine/cabinet/partList/geometry/generate/generateSideParts.js";

const materials = [
    { id: "body", materialNumber: "BODY" },
    { id: "front-edge", materialNumber: "FRONT" },
    { id: "top-edge", materialNumber: "TOP" },
    { id: "bottom-edge", materialNumber: "BOTTOM" }
];

const cabinet = {
    width: 600,
    height: 800,
    depth: 560,
    thickness: 19,
    topExists: true,
    bottomExists: true,
    materialId: "body",
    frontEdgeMaterialId: "front-edge",
    edgeTopMaterialId: "top-edge",
    edgeBottomMaterialId: "bottom-edge"
};

const generateParts = continuous => {
    let pid = 0;
    const nextPID = () => String(++pid).padStart(6, "0");
    const configuredCabinet = { ...cabinet, continuous };
    return {
        sides: generateSideParts({ cabinet: configuredCabinet, materials, nextPID, color: "#fff" }),
        horizontal: generateBottomPart({ cabinet: configuredCabinet, materials, nextPID, color: "#fff" })
    };
};

describe("Korpuskanten nach durchgehendem Bauteil", () => {
    it("belässt Kante oben und unten bei durchgehenden Seiten auf den Seiten", () => {
        const { sides, horizontal } = generateParts("side");

        expect(sides).toHaveLength(2);
        sides.forEach(side => {
            expect(side).toMatchObject({ ERID: "FRONT", ETID: "TOP", EBID: "BOTTOM" });
        });
        expect(horizontal).toMatchObject({ ERID: "FRONT", ETID: "", EBID: "" });
    });

    it("überträgt Kante oben und unten bei durchgehenden Böden auf den Boden", () => {
        const { sides, horizontal } = generateParts("bottom");

        sides.forEach(side => {
            expect(side).toMatchObject({ ERID: "FRONT", ETID: "", EBID: "" });
        });
        expect(horizontal).toMatchObject({ ERID: "FRONT", ETID: "TOP", EBID: "BOTTOM" });
        expect(horizontal.Kante).toBe(":FRONT:TOP:BOTTOM");
    });
});
