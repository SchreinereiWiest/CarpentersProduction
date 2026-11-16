import { describe, expect, it } from "vitest";
import {
    createCabinetSvg,
    getCabinetFunctionLines,
    getCabinetInformation
} from "@EngineBrowser/project-pdf/cabinetSvgRenderer.js";
import {
    createNestingPlateSvg,
    createNestingOverviewSvg,
    getNestingPlateEntries
} from "@EngineBrowser/project-pdf/nestingSvgRenderer.js";
import {
    getContainedImagePlacement,
    getImagePageLayout
} from "@EngineBrowser/project-pdf/createProjectPDF.js";
import { createMeasurementViewSvg } from "@EngineBrowser/project-pdf/measurementViewSvgRenderer.js";
import {
    createCncProgramSvg,
    getCncPrograms
} from "@EngineBrowser/project-pdf/cncProgramSvgRenderer.js";

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

    it("löst interne Material-IDs und Materialnummern vor dem Druck in Realnamen auf", () => {
        const information = getCabinetInformation({
            ...cabinet,
            materialId: "material-uuid",
            frontMaterialId: "FRONT-01",
            frontEdgeMaterialId: { materialId: "edge-uuid" }
        }, [
            { id: "material-uuid", materialNumber: "KORPUS-19", name: "Eiche Natur" },
            { id: "front-uuid", materialNumber: "FRONT-01", name: "Lack Weiß" },
            { _id: "edge-uuid", materialNumber: "K-ABS", name: "ABS Eiche" }
        ]);

        expect(information).toContainEqual(["Korpusmaterial", "Eiche Natur (KORPUS-19)"]);
        expect(information).toContainEqual(["Frontmaterial", "Lack Weiß (FRONT-01)"]);
        expect(information).toContainEqual(["Frontkante", "ABS Eiche (K-ABS)"]);
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

    it("passt automatisch eingefügte Bilder vollständig und ohne Beschnitt ein", () => {
        const landscape = getContainedImagePlacement({
            sourceWidth: 1600,
            sourceHeight: 900,
            targetWidth: 1200,
            targetHeight: 900
        });

        expect(landscape).toEqual({ x: 0, y: 112.5, width: 1200, height: 675 });
    });
});

describe("Projekt-PDF CNC-Kompaktansicht", () => {
    it("erzeugt eine weiße SVG-Liniengrafik mit Außenbemaßung", () => {
        const part = {
            PID: "P-1",
            Objektname: "Seite links",
            Plattentyp: "TE",
            L: 720,
            B: 560,
            D: 19,
            CNC: { operations: [{ type: "BO", x: 37, y: 64, diameter: 5 }] }
        };
        const programs = getCncPrograms([{ PID: "K-1", Objektname: "Korpus", Plattentyp: "KO", Children: [part] }]);
        const graphic = createCncProgramSvg(programs[0]);
        const smallerGraphic = createCncProgramSvg({ L: 300, B: 200, CNC: { operations: [{ type: "BO", x: 20, y: 20 }] } });
        const printGraphic = createCncProgramSvg(programs[0], { showDimensions: false });

        expect(programs).toHaveLength(1);
        expect(graphic.svg).toContain('fill="#fff"');
        expect(graphic.svg).toContain("720 mm");
        expect(graphic.svg).toContain("560 mm");
        expect(graphic.svg).toContain("<circle");
        expect(graphic.svg).toContain('viewBox="-100.8 -100.8 921.6 761.6"');
        expect(graphic.svg).toContain('font-size="42"');
        expect(smallerGraphic.svg).toContain('font-size="42"');
        expect(graphic.svg).toContain('dominant-baseline="middle"');
        expect(printGraphic.svg).not.toContain("720 mm");
        expect(printGraphic.svg).not.toContain("560 mm");
        expect(printGraphic.svg).toContain('viewBox="0 0 720 560"');
    });

    it("rendert alle neutralen Bohrungs- und Lochreihenoperationen", () => {
        const graphic = createCncProgramSvg({
            L: 500,
            B: 300,
            CNC: {
                operations: [
                    { kind: "drill.point", intentId: "manual.drilling", x: 20, y: 20, diameter: 5 },
                    { kind: "drill.pattern", intentId: "manual.drilling", x: 50, y: 40, columns: 2, rows: 2, stepX: 32, stepY: 32, count: 4, diameter: 5 },
                    { kind: "drill.linearPattern", intentId: "manual.drilling", x: 120, y: 30, count: 3, spacing: 32, diameter: 5 },
                    { kind: "drill.row", intentId: "manual.drilling", axis: "x", start: 10, end: 74, spacing: 32, crossPositions: [150, 250], diameter: 5 },
                    { kind: "drill.edgePattern", intentId: "manual.drilling", edge: "right", positions: [60, 180], depth: 12, diameter: 8 }
                ]
            }
        }, { showDimensions: false });

        expect(graphic.svg.match(/<circle/g)).toHaveLength(16);
        expect(graphic.svg).toContain('x1="500" y1="60" x2="488" y2="60"');
    });
});

describe("Projekt-PDF Aufmaßansichten", () => {
    it("übernimmt auch gezeichnete Maße ohne hinterlegte Plan-Datei", () => {
        const result = createMeasurementViewSvg({
            view: { id: "front" },
            objects: [{
                id: "measurement-1",
                viewId: "front",
                kind: "measurement",
                status: "measured",
                value: "720",
                unit: "mm",
                points: [{ x: 180, y: 220 }, { x: 620, y: 220 }]
            }]
        });

        expect(result.width).toBe(1000);
        expect(result.svg).toContain("720 mm");
        expect(result.svg).toContain("#227a5b");
        expect(result.svg).toContain("x1=\"180\"");
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
            cuts: [{ x: 620, y: 0, width: 4, height: 2070, stripId: "strip-1" }],
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

    it("nimmt jede Nestingplatte in eine schwarz-weisse SVG-Uebersicht auf", () => {
        const result = createNestingOverviewSvg(nesting);
        const plate = createNestingPlateSvg(getNestingPlateEntries(nesting)[0]);

        expect(getNestingPlateEntries(nesting)).toHaveLength(1);
        expect(result.count).toBe(1);
        expect(result.svg).toContain("W980-ST2 · 19 mm · Platte 1");
        expect(result.svg).not.toContain("#123456");
        expect(result.svg).not.toContain("#2ecc71");
        expect(result.svg).toContain("#f3f4f6");
        expect(result.svg).not.toContain("strip-1");
        expect(result.svg).toContain('data-strip-dimension-background="true"');
        expect(result.svg).toContain('fill="#ffffff" fill-opacity="0.94"');
        expect(result.svg).toContain('data-position="plate-edge"');
        expect(plate.plan.cuts).toEqual(expect.arrayContaining([
            expect.objectContaining({ number: 1, direction: "vertical", position: 622, stripId: "strip-1" })
        ]));
        expect(result.height).toBeLessThan(1660);
    });
});
