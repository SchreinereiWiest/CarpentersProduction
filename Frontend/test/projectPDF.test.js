import { describe, expect, it } from "vitest";
import {
    createCabinetSvg,
    getCabinetFunctionLines,
    getCabinetInformation
} from "@EngineBrowser/project-pdf/cabinetSvgRenderer.js";
import {
    createNestingOverviewSvg,
    getNestingPlateEntries
} from "@EngineBrowser/project-pdf/nestingSvgRenderer.js";
import { getImagePageLayout } from "@EngineBrowser/project-pdf/createProjectPDF.js";

const cabinet = {
    name: "Unterschrank",
    width: 600,
    height: 720,
    depth: 535,
    thickness: 19,
    quantity: 2,
    spax: true,
    backPanel: { construction: "groove" },
    sections: [{
        id: "section-1",
        x: 19,
        y: 19,
        width: 562,
        height: 682,
        children: [],
        functionConfig: [
            { id: "shelf", type: "shelf", compartmentCount: 3 },
            {
                id: "wall",
                type: "middleWall",
                orientation: "horizontal",
                positionReference: "sectionBottom",
                positionOffset: 100
            },
            {
                id: "drawer",
                type: "legrabox",
                variant: "M",
                positionFromBottom: 40,
                doubling: { insideRightOffset: 12 }
            }
        ]
    }]
};

describe("Projekt-PDF Korpusdarstellung", () => {
    it("zeichnet Korpus und Funktionen als eigenstaendiges SVG", () => {
        const result = createCabinetSvg(cabinet);

        expect(result.svg).toContain("<svg");
        expect(result.svg).toContain("#374151");
        expect(result.svg).toContain("600 mm");
        expect(result.width).toBeGreaterThan(cabinet.width);
    });

    it("fasst Funktionen und Korpusinformationen druckbar zusammen", () => {
        const functions = getCabinetFunctionLines(cabinet);
        const information = getCabinetInformation(cabinet);

        expect(functions).toEqual(expect.arrayContaining([
            expect.stringContaining("Fachböden Anzahl: 2"),
            expect.stringContaining("Mittelwand horizontal"),
            expect.stringContaining("innenliegend: 12 mm")
        ]));
        expect(information).toContainEqual(["Außenmaße", "600 × 720 × 535 mm"]);
        expect(information).toContainEqual(["Ausführung", "Nut geschlossen"]);
        expect(information).toContainEqual(["Geschraubt", "Ja"]);
    });
});

describe("Projekt-PDF Bildseiten", () => {
    it("setzt Querformatbilder randlos auf eine A4-Querformatseite", () => {
        expect(getImagePageLayout(3508, 2480)).toEqual({
            orientation: "landscape",
            pageWidth: 297,
            pageHeight: 210,
            x: 0,
            y: 0,
            width: 297,
            height: 210
        });
    });
});

describe("Projekt-PDF Nestingdarstellung", () => {
    const nesting = [{
        MID: "W980-ST2",
        T: 19,
        settings: {
            gap: 20,
            cutGap: 4,
            defaultSheet: { width: 2800, height: 2070 }
        },
        nestingPlates: [{
            id: 0,
            placedWidth: 2800,
            placedHeight: 2070,
            freeSpaces: [],
            strips: [{
                id: "strip-1",
                x: 0,
                y: 0,
                type: "vertical",
                placedWidth: 620,
                placedHeight: 740,
                plates: [{
                    id: "part-1",
                    width: 620,
                    height: 740,
                    originalWidth: 600,
                    originalHeight: 720,
                    color: "#123456"
                }]
            }]
        }]
    }];

    it("nimmt jede Nestingplatte in eine farbige SVG-Uebersicht auf", () => {
        const result = createNestingOverviewSvg(nesting);

        expect(getNestingPlateEntries(nesting)).toHaveLength(1);
        expect(result.count).toBe(1);
        expect(result.svg).toContain("W980-ST2 · 19 mm · Platte 1");
        expect(result.svg).toContain("#123456");
        expect(result.svg).toContain("#2ecc71");
        expect(result.height).toBeLessThan(1660);
    });
});
