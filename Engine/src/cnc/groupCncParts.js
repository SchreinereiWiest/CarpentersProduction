import { flattenPartList } from "./flattenPartList.js";
import { getCncProgramSignature } from "./getCncProgramSignature.js";
import { expandCncMachiningVariants } from "./machiningVariants.js";
import { createId } from "../shared/id.js";

const getPartOrder = (part) => {
  const name = String(part.Objektname || "").toLowerCase();
  const source = part.source || part.Source || {};

  // Seiten
  if (
    source.role === "side" ||
    source.role === "sidePart" ||
    name.includes("seite")
  ) {
    return 0;
  }

  // Böden
  if (
    source.role === "bottom" ||
    source.role === "horizontalPanel" ||
    name.includes("boden")
  ) {
    return 1;
  }

  // Mittelwände
  if (
    source.role === "middleWall" ||
    source.type === "middleWall" ||
    name.includes("mittelwand")
  ) {
    return 2;
  }

  // Rest
  return 3;
};


export const groupCncParts = (partList = []) => {

  const baseParts = flattenPartList(partList);

  const groups = new Map();

  baseParts.forEach((basePart) => {

    const hasVariantOperations = (basePart.CNC?.machiningVariants ?? []).some(variant =>
      Array.isArray(variant?.cnc?.operations) && variant.cnc.operations.length > 0
    );

    if (
      !basePart.CNC ||
      !Array.isArray(basePart.CNC.operations) ||
      (basePart.CNC.operations.length === 0 && !hasVariantOperations)
    ) {
      return;
    }

    // Die Rohteilgruppe verwendet weiterhin die gemeinsame Signatur. Die
    // darin enthaltenen Links-/Rechtsprogramme werden nur als Children
    // aufgelöst und bleiben dadurch unter derselben Teileposition sichtbar.
    const signature = getCncProgramSignature(basePart);
    const partOrder = getPartOrder(basePart);
    const partType = ["Seite", "Boden", "Mittelwand"][partOrder]
      ?? basePart.Objektname
      ?? "Bauteil";
    const groupKey = `${partOrder}|${partType}|${signature}`;
    const cabinetName =
      basePart.cabinetName ||
      basePart.korpusName ||
      basePart.CabinetName ||
      basePart.parentName ||
      "";

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        id: createId(),
        signature,
        name: partType,
        type: basePart.Plattentyp || "",
        order: partOrder,
        parts: [],
        count: 0,
        cabinetNames: [],
        displayName: cabinetName
          ? `${partType} – ${cabinetName}`
          : partType
      });
    }

    const group = groups.get(groupKey);
    const programParts = expandCncMachiningVariants(basePart).filter(part =>
      Array.isArray(part.CNC?.operations) && part.CNC.operations.length > 0
    );

    programParts.forEach(part => {
      group.parts.push(part);
      group.count += Number(part.Anzahl) || 1;
    });

    if (
      cabinetName &&
      !group.cabinetNames.includes(cabinetName)
    ) {
      group.cabinetNames.push(cabinetName);
    }
  });


  /*
   * Für die Anzeige den Korpusnamen aktualisieren.
   *
   * Wenn mehrere Korpusse in derselben CNC-Gruppe landen,
   * werden alle Namen angezeigt.
   */
  groups.forEach((group) => {

    if (group.cabinetNames.length > 0) {
      group.displayName =
        `${group.name} – ${group.cabinetNames.join(", ")}`;
    } else {
      group.displayName = group.name;
    }
  });


  /*
   * Feste Reihenfolge:
   *
   * Seiten
   * Böden
   * Mittelwände
   * Rest
   */
  return Array.from(groups.values()).sort(
    (a, b) => a.order - b.order
  );
};
