

import {
    getMaterialNumber,
    getGrainValue
} from "./materials";

import { generateSideParts } from "./geometry/generate/generateSideParts";
import { generateBottomPart } from "./geometry/generate/generateBottomParts";
import { generateBackPart } from "./geometry/generate/generateBackParts";
import { generateShelfParts } from "./geometry/generate/generateShelfParts";
import { generateMiddleWallParts } from "./geometry/generate/generateMiddleWall";
import { generateFrontParts } from "./geometry/generate/generateFrontParts";
import { generateLegraboxHardware } from "./hardware/generateLegraboxHardware";

import { compileCnc } from "../cnc/compiler/cncCompiler";

export const buildPartList = async (
  cabinets = [],
  materials = [],
  defaultConfig = {}
) => {
  let pid = 0;

  const nextPID = () => {
    pid++;
    return String(pid).padStart(6, "0");
  };

  // ------------------------------------------------------------
  // Getrennte Gruppen
  // ------------------------------------------------------------

  const shelfParts = [];
  const frontParts = [];
  const middleWallParts = [];
  const legraboxes = [];

  // ------------------------------------------------------------
  // Hilfsfunktionen
  // ------------------------------------------------------------

  const pushChildren = (target, parts) => {
    if (!parts) return;

    if (Array.isArray(parts)) {
      target.push(...parts.filter(Boolean));
    } else {
      target.push(parts);
    }
  };

  const getSettings = (cabinet) => {
    const settings = cabinet.partListSettings ?? {};

    return {
      grouping: settings.grouping ?? "cabinet",

      // Unterstützt sowohl:
      //   settings.separate.shelves
      // als auch die ältere direkte Schreibweise:
      //   settings.shelves
      separate: {
        shelves:
          settings.separate?.shelves ??
          settings.shelves ??
          false,

        fronts:
          settings.separate?.fronts ??
          settings.fronts ??
          false,

        middleWalls:
          settings.separate?.middleWalls ??
          settings.middleWalls ??
          false,

        legrabox:
          settings.separate?.legrabox ??
          settings.legrabox ??
          false
      }
    };
  };
const createGroupRoot = (name, children = [], hardware = []) => {

  const color =
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");

  const coloredChildren = children.map(child => ({
    ...child,
    color: color
  }));

  return {
    PID: nextPID(),
    BPID: "",
    Objektname: name,
    Plattentyp: "KO",
    Anzahl: 1,
    L: 0,
    B: 0,
    T: 0,
    MID: "",
    Maserung: "",
    ELID: "",
    ERID: "",
    ETID: "",
    EBID: "",
    Kante: ":::",
    Notiz: "",
    color: color,
    Children: coloredChildren,
    Hardware: hardware
  };
};

  // ------------------------------------------------------------
  // Korpusse erzeugen
  // ------------------------------------------------------------

  const cabinetList = cabinets.map((cabinet) => {
    const settings = getSettings(cabinet);

    const cabinetMaterial = cabinet.materialId;

    const color = 
        "#" +
        Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0");

    const root = {
      PID: nextPID(),
      BPID: "",
      Objektname: cabinet.name,
      Plattentyp: "KO",
      Anzahl: 1,

      L: Number(cabinet.height),
      B: Number(cabinet.width),
      T: Number(cabinet.depth),

      MID: getMaterialNumber(materials, cabinetMaterial),
      Maserung: getGrainValue(materials, cabinetMaterial),

      ELID: "",
      ERID: "",
      ETID: "",
      EBID: "",
      Kante: ":::",
      Notiz: "",
      color: color,

      Children: [],
      Hardware: []
    };

    // ----------------------------------------------------------
    // Alle Teile zunächst erzeugen
    // ----------------------------------------------------------

    const allChildren = [];

    pushChildren(
      allChildren,
      generateSideParts({
        cabinet,
        materials,
        nextPID,
        color
      })
    );

    if (cabinet.topExists || cabinet.bottomExists) {
      pushChildren(
        allChildren,
        generateBottomPart({
          cabinet,
          materials,
          nextPID,
          color
        })
      );
    }

    pushChildren(
      allChildren,
      generateBackPart({
        cabinet,
        materials,
        nextPID,
        color
      })
    );

    const shelves = generateShelfParts({
      cabinet,
      materials,
      nextPID,
      color
    });

    const middleWalls = generateMiddleWallParts({
      cabinet,
      materials,
      nextPID,
      color
    });

    const fronts = generateFrontParts({
      cabinet,
      materials,
      nextPID,
      color
    });

    pushChildren(allChildren, shelves);
    pushChildren(allChildren, middleWalls);
    pushChildren(allChildren, fronts);

    // ----------------------------------------------------------
    // Hardware erzeugen
    // ----------------------------------------------------------

    const hardware = generateLegraboxHardware(cabinet);

    // ----------------------------------------------------------
    // CNC auf ALLE Korpus-Teile anwenden
    // ----------------------------------------------------------

    const compiledChildren = compileCnc(
      cabinet,
      allChildren,
      defaultConfig
    );

    // ----------------------------------------------------------
    // Teile entsprechend der Gruppierung verteilen
    // ----------------------------------------------------------

    const remainingChildren = [];
    // Die Referenzen auf die erzeugten Teile bestimmen.
    // Da compileCnc die Objekte normalerweise nicht ersetzt,
    // sondern ergänzt, können wir über die PID arbeiten.

    const shelfIds = new Set(
      (Array.isArray(shelves) ? shelves : [shelves])
        .filter(Boolean)
        .map((part) => part.PID)
    );

    const middleWallIds = new Set(
      (Array.isArray(middleWalls) ? middleWalls : [middleWalls])
        .filter(Boolean)
        .map((part) => part.PID)
    );

    const frontIds = new Set(
      (Array.isArray(fronts) ? fronts : [fronts])
        .filter(Boolean)
        .map((part) => part.PID)
    );

    for (const part of compiledChildren) {
      if (!part) continue;

      if (settings.grouping === "separate") {
        if (settings.separate.shelves && shelfIds.has(part.PID)) {
          shelfParts.push(part);
          continue;
        }

        if (
          settings.separate.middleWalls &&
          middleWallIds.has(part.PID)
        ) {
          middleWallParts.push(part);
          continue;
        }

        if (settings.separate.fronts && frontIds.has(part.PID)) {
          frontParts.push(part);
          continue;
        }
      }

      remainingChildren.push(part);
    }

    // ----------------------------------------------------------
    // Legrabox-Hardware
    // ----------------------------------------------------------

    if (
      settings.grouping === "separate" &&
      settings.separate.legrabox
    ) {
      if (Array.isArray(hardware)) {
        legraboxes.push(...hardware.filter(Boolean));
      } else if (hardware) {
        legraboxes.push(hardware);
      }

      root.Hardware = [];
    } else {
      root.Hardware = hardware ?? [];
    }

    root.Children = remainingChildren;

    return root;
  });

  // ------------------------------------------------------------
  // Getrennte Obergruppen erzeugen
  // ------------------------------------------------------------

  if (shelfParts.length > 0) {
    cabinetList.push(
      createGroupRoot(
        "Fächer",
        shelfParts
      )
    );
  }

  if (frontParts.length > 0) {
    cabinetList.push(
      createGroupRoot(
        "Fronten",
        frontParts
      )
    );
  }

  if (middleWallParts.length > 0) {
    cabinetList.push(
      createGroupRoot(
        "Mittelwände",
        middleWallParts
      )
    );
  }

  if (legraboxes.length > 0) {
    cabinetList.push(
      createGroupRoot(
        "Legraboxen",
        [],
        legraboxes
      )
    );
  }

  return cabinetList;
};