import { describe, expect, it } from "vitest";
import {
  applyMaterialMappings,
  collectMaterialReferences,
  createCabinetsFromPartList,
  parseCadJson,
  parseCadText
} from "../../src/features/projects/import/cpImport.js";
import { importCadData } from "../../src/features/projects/legacy-editor/importCAD.js";
import { buildPartList } from "@Engine/cabinet/partList/buildPartList.js";

describe("Palette CAD cpimport conversion", () => {
  it("repairs trailing commas and normalizes decimal commas", () => {
    const raw =
      '[{"PID":"001000","Plattentyp":"KO","L":"600,5","B":"535,0","T":"870,0",},]';
    const [cabinet] = parseCadJson(parseCadText(raw));

    expect(cabinet).toMatchObject({
      PID: "001000",
      L: 600.5,
      B: 535,
      T: 870,
      Children: []
    });
  });

  it("groups cabinet children and retains every orphan in a manual group", () => {
    const list = parseCadJson([
      {
        PID: "001000",
        Objektname: "Unterschrank",
        Plattentyp: "KO",
        Anzahl: "1",
        L: "600,0",
        B: "535,0",
        T: "870,0"
      },
      {
        PID: "001001",
        BPID: "Nein",
        Objektname: "Seite links",
        Plattentyp: "Seite links",
        L: "870,0",
        B: "535,0",
        T: "19,0"
      },
      {
        PID: "010000",
        BPID: "Nein",
        Objektname: "Arbeitsplatte",
        Plattentyp: "Standardplatte",
        L: "1200,0",
        B: "600,0",
        T: "40,0"
      },
      {
        PID: "",
        BPID: "Nein",
        Objektname: "Freies Teil",
        Plattentyp: "Standardplatte",
        L: "10,0",
        B: "10,0",
        T: "10,0"
      },
      {
        PID: "099001",
        BPID: "",
        Objektname: "Teil ohne BPID",
        Plattentyp: "Standardplatte"
      },
      {
        PID: "099002",
        BPID: null,
        Objektname: "Teil mit null-BPID",
        Plattentyp: "Standardplatte"
      }
    ]);

    expect(list).toHaveLength(2);
    expect(list[0].Children).toHaveLength(1);
    expect(list[1]).toMatchObject({
      PID: "MANUAL000",
      Objektname: "Freie Bauteile",
      manual: true,
      tag: "manual"
    });
    expect(list[1].Children).toHaveLength(2);
    expect(list[1].Children.every((part) => part.manual && part.tag === "manual"))
      .toBe(true);
    expect(list[1].Children[1].PID).toMatch(/^MAN\d{6}$/);
  });

  it("loads the manual import group with its parts into the legacy editor", () => {
    const partList = parseCadJson([
      {
        PID: "010000",
        BPID: "Nein",
        Objektname: "Arbeitsplatte",
        Plattentyp: "Standardplatte",
        Anzahl: "1",
        L: "1200",
        B: "600",
        T: "40"
      }
    ]);

    const [manualGroup] = importCadData(partList, []);

    expect(manualGroup).toMatchObject({
      id: "MANUAL000",
      name: "Freie Bauteile",
      type: "KO",
      manual: true,
      groupOnly: true
    });
    expect(manualGroup.Children).toEqual([
      expect.objectContaining({
        id: "010000",
        name: "Arbeitsplatte",
        type: "Standardplatte",
        manual: true,
        width: 600,
        height: 1200,
        depth: 40
      })
    ]);
  });

  it("keeps KO records regardless of BPID and rejects other records without BPID", () => {
    const list = parseCadJson([
      { PID: "001000", BPID: "", Plattentyp: "KO", Objektname: "Korpus 1" },
      { PID: "002000", BPID: null, type: "ko", Objektname: "Korpus 2" },
      { PID: "001001", BPID: "Nein", Plattentyp: "Seite" },
      { PID: "001002", BPID: "", Plattentyp: "Boden" },
      { PID: "001003", BPID: null, Plattentyp: "Boden" },
      { PID: "001004", Plattentyp: "Boden" }
    ]);

    expect(list).toHaveLength(2);
    expect(list.map((item) => item.PID)).toEqual(["001000", "002000"]);
    expect(list[0].Children.map((item) => item.PID)).toEqual(["001001"]);
  });

  it("creates cabinets using Palette CAD outer dimension axes", () => {
    const partList = parseCadJson([
      {
        PID: "007000",
        Objektname: "Hochschrank",
        Plattentyp: "KO",
        Anzahl: "2",
        L: "500,0",
        B: "330,0",
        T: "2100,0"
      }
    ]);

    expect(createCabinetsFromPartList(partList)).toEqual([
      expect.objectContaining({
        id: "cad-007000",
        name: "Hochschrank",
        quantity: 2,
        width: 500,
        height: 2100,
        depth: 330,
        outerDimensions: { width: 500, height: 2100, depth: 330 },
        sourcePid: "007000"
      })
    ]);
  });

  it("creates positioned fronts and applies the company part-list grouping", async () => {
    const partList = parseCadJson([
      {
        PID: "004000",
        Objektname: "Unterschrank",
        Plattentyp: "KO",
        Anzahl: "1",
        L: "200",
        B: "535",
        T: "870",
        X: "533.5",
        Y: "331.8",
        Z: "0",
        RZ: "-90",
        OX: "0",
        OY: "-53.5",
        OZ: "0"
      },
      {
        PID: "004003",
        BPID: "Nein",
        Objektname: "Seite links",
        Plattentyp: "Seite links",
        L: "750",
        B: "508",
        T: "19"
      },
      {
        PID: "004015",
        BPID: "Nein",
        Objektname: "Rückwand",
        Plattentyp: "RW",
        L: "750",
        B: "200",
        T: "8"
      },
      {
        PID: "004008",
        BPID: "Nein",
        Objektname: "Front",
        Plattentyp: "FR",
        L: "597",
        B: "196",
        T: "19",
        X: "481.9",
        Y: "331.6",
        Z: "12",
        RZ: "-90",
        OX: "0",
        OY: "-1.9",
        OZ: "0"
      },
      {
        PID: "004011",
        BPID: "Nein",
        Objektname: "Front",
        Plattentyp: "FR",
        L: "145",
        B: "196",
        T: "19",
        X: "481.9",
        Y: "331.6",
        Z: "72.1",
        RZ: "-90",
        OX: "0",
        OY: "-1.9",
        OZ: "0"
      }
    ]);

    const [cabinet] = createCabinetsFromPartList(partList, {
      partListSettings: {
        grouping: "separate",
        separate: { fronts: true }
      }
    });

    expect(cabinet).toMatchObject({
      width: 200,
      height: 750,
      depth: 508,
      thickness: 19,
      continuous: "side",
      topExists: true,
      bottomExists: true,
      frontThickness: 19,
      partListSettingsSource: "company",
      partListSettings: {
        grouping: "separate",
        separate: {
          fronts: true,
          shelves: false,
          middleWalls: false,
          legrabox: false
        }
      },
      outerDimensions: { width: 200, height: 870, depth: 535 },
      backPanel: expect.objectContaining({
        construction: "butt",
        continuous: "side",
        thickness: 8
      }),
      frontGap: 4,
      frontGapLeft: 2,
      frontGapRight: 2,
      frontGapTop: 4,
      frontGapBottom: 0,
      frontLayout: {
        spec: "145mm:1",
        direction: "vertical",
        source: "palette-cad"
      }
    });
    expect(cabinet.fronts).toEqual([
      expect.objectContaining({
        sourcePid: "004011",
        name: "Front 1",
        x: 2,
        y: 4,
        width: 196,
        height: 145
      }),
      expect.objectContaining({
        sourcePid: "004008",
        name: "Front 2",
        x: 2,
        y: 153,
        width: 196,
        height: 597
      })
    ]);

    const generatedPartList = await buildPartList([cabinet], []);
    const frontGroup = generatedPartList.find(
      (group) => group.Objektname === "Fronten"
    );
    const cabinetGroup = generatedPartList.find(
      (group) => group._generatedId === `${cabinet.id}:root`
    );

    expect(frontGroup?.Children).toHaveLength(2);
    expect(cabinetGroup.Children).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Plattentyp: "Front" })
      ])
    );
  });

  it("detects continuous horizontal panels and removes the KO floor offset", () => {
    const partList = parseCadJson([
      {
        PID: "200000",
        Plattentyp: "KO",
        L: "600",
        B: "500",
        T: "900",
        X: "0",
        Y: "0",
        Z: "0",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      },
      {
        PID: "200001",
        BPID: "Nein",
        Plattentyp: "Seite links",
        L: "762",
        B: "480",
        T: "19",
        X: "0",
        Y: "0",
        Z: "11.9",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      },
      {
        PID: "200002",
        BPID: "Nein",
        Plattentyp: "Boden",
        L: "600",
        B: "480",
        T: "19",
        X: "0",
        Y: "0",
        Z: "10",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      },
      {
        PID: "200003",
        BPID: "Nein",
        Plattentyp: "Deckel",
        L: "600",
        B: "480",
        T: "19",
        X: "0",
        Y: "0",
        Z: "88.1",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      }
    ]);

    const [cabinet] = createCabinetsFromPartList(partList);

    expect(cabinet).toMatchObject({
      width: 600,
      height: 800,
      thickness: 19,
      continuous: "bottom",
      topExists: true,
      bottomExists: true,
      outerDimensions: { width: 600, height: 900, depth: 500 },
      backPanel: expect.objectContaining({ continuous: "bottom" })
    });
  });

  it("detects butt, rabbet, closed groove and open groove back panels", () => {
    const cabinetRecords = [
      { prefix: "301", width: "600", height: "700", depth: "500" },
      { prefix: "302", width: "600", height: "700", depth: "500" },
      { prefix: "303", width: "600", height: "700", depth: "500" },
      { prefix: "304", width: "600", height: "700", depth: "500" }
    ];
    const rootsAndSides = cabinetRecords.flatMap((record) => [
      {
        PID: `${record.prefix}000`,
        Plattentyp: "KO",
        L: record.width,
        B: record.depth,
        T: record.height,
        X: "0",
        Y: "0",
        Z: "0",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      },
      {
        PID: `${record.prefix}001`,
        BPID: "Nein",
        Plattentyp: "Seite links",
        L: record.height,
        B: "500",
        T: "19",
        X: "0",
        Y: "0",
        Z: "0",
        RZ: "0",
        OX: "0",
        OY: "0",
        OZ: "0"
      }
    ]);
    const backPanels = [
      { PID: "301002", B: "600", L: "700", Y: "49.2", Z: "0" },
      { PID: "302002", B: "588", L: "688", Y: "49.2", Z: "0" },
      { PID: "303002", B: "579", L: "679", Y: "47", Z: "1" },
      { PID: "304002", B: "579", L: "689", Y: "47", Z: "1.1" }
    ].map((back) => ({
      ...back,
      BPID: "Nein",
      Plattentyp: "RW",
      T: "8",
      X: "0",
      RZ: "0",
      OX: "0",
      OY: "0",
      OZ: "0"
    }));

    const cabinets = createCabinetsFromPartList(
      parseCadJson([...rootsAndSides, ...backPanels])
    );

    expect(cabinets.map((cabinet) => ({
      construction: cabinet.backPanel.construction,
      depth: cabinet.depth
    }))).toEqual([
      { construction: "butt", depth: 492 },
      { construction: "rabbet", depth: 500 },
      { construction: "groove", depth: 500 },
      { construction: "grooveOpen", depth: 500 }
    ]);
  });

  it("recognizes a horizontal front layout from CAD positions", () => {
    const partList = parseCadJson([
      {
        PID: "020000",
        Plattentyp: "KO",
        L: "1000",
        B: "600",
        T: "700",
        X: "0",
        Y: "0",
        Z: "0",
        RZ: "0",
        OX: "0",
        OY: "-60",
        OZ: "0"
      },
      {
        PID: "020001",
        BPID: "Nein",
        Plattentyp: "FR",
        L: "696",
        B: "497",
        T: "19",
        X: "0.1",
        Y: "-1.9",
        Z: "0.2",
        RZ: "0",
        OX: "0",
        OY: "-1.9",
        OZ: "0"
      },
      {
        PID: "020002",
        BPID: "Nein",
        Plattentyp: "FR",
        L: "696",
        B: "497",
        T: "19",
        X: "50.2",
        Y: "-1.9",
        Z: "0.2",
        RZ: "0",
        OX: "0",
        OY: "-1.9",
        OZ: "0"
      }
    ]);

    const [cabinet] = createCabinetsFromPartList(partList);

    expect(cabinet.frontLayout).toEqual({
      spec: "497mm:1",
      direction: "horizontal",
      source: "palette-cad"
    });
    expect(cabinet).toMatchObject({
      frontGap: 4,
      frontGapLeft: 1,
      frontGapRight: 1,
      frontGapTop: 2,
      frontGapBottom: 2
    });
    expect(cabinet.fronts.map(({ x, y, width, height }) => ({
      x,
      y,
      width,
      height
    }))).toEqual([
      { x: 1, y: 2, width: 497, height: 696 },
      { x: 502, y: 2, width: 497, height: 696 }
    ]);
  });

  it("collects and translates CAD material references for lists and cabinets", () => {
    const partList = parseCadJson([
      {
        PID: "007000",
        Plattentyp: "KO",
        Objektname: "Hochschrank",
        L: "500",
        B: "330",
        T: "2100"
      },
      {
        PID: "007001",
        BPID: "Nein",
        Plattentyp: "Seite",
        MID: "CAD-KORPUS",
        ETID: "CAD-KANTE",
        EBID: "CAD-KANTE"
      },
      {
        PID: "007002",
        BPID: "Nein",
        Plattentyp: "FR",
        MID: "CAD-FRONT",
        ELID: "CAD-KANTE",
        ERID: "CAD-KANTE"
      }
    ]);
    const materials = [
      {
        id: "material-korpus",
        materialNumber: "INT-KORPUS",
        edgeArticleNumber: null,
        maser: true
      },
      {
        id: "material-front",
        materialNumber: "INT-FRONT",
        edgeArticleNumber: null,
        maser: false
      },
      {
        id: "material-kante",
        materialNumber: "INT-KANTENPLATTE",
        edgeArticleNumber: "INT-KANTE",
        maser: false
      }
    ];
    const mappings = [
      { source: "CAD-KORPUS", materialId: "material-korpus" },
      { source: "CAD-FRONT", materialId: "material-front" },
      { source: "CAD-KANTE", materialId: "material-kante" }
    ];

    expect(collectMaterialReferences(partList)).toEqual([
      { source: "CAD-FRONT", fields: ["MID"], occurrences: 1 },
      { source: "CAD-KANTE", fields: ["ELID", "ERID", "ETID", "EBID"], occurrences: 4 },
      { source: "CAD-KORPUS", fields: ["MID"], occurrences: 1 }
    ]);

    const translated = applyMaterialMappings(partList, mappings, materials);
    expect(translated[0].Children[0]).toMatchObject({
      MID: "INT-KORPUS",
      ETID: "INT-KANTENPLATTE",
      EBID: "INT-KANTENPLATTE",
      Maserung: "Ja"
    });
    expect(translated[0].Children[1]).toMatchObject({
      MID: "INT-FRONT",
      ELID: "INT-KANTENPLATTE",
      ERID: "INT-KANTENPLATTE",
      Maserung: ""
    });

    expect(createCabinetsFromPartList(partList, { mappings, materials })).toEqual([
      expect.objectContaining({
        materialId: "material-korpus",
        frontMaterialId: "material-front",
        edgeTopMaterialId: "material-kante",
        edgeBottomMaterialId: "material-kante",
        frontEdgeMaterialId: "material-kante"
      })
    ]);
  });
});
