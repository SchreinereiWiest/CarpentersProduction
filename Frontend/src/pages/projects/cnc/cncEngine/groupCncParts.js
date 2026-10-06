import { flattenPartList } from "./falttenPartList";
import { getCncProgramSignature } from "./getCncProgramSignature";
import { createId } from "./cncGroupUtils";

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

  const parts = flattenPartList(partList);

  const groups = new Map();

  parts.forEach((part) => {

    if (
      !part.CNC ||
      !Array.isArray(part.CNC.operations) ||
      part.CNC.operations.length === 0
    ) {
      return;
    }

    const signature = getCncProgramSignature(part);

    const partOrder = getPartOrder(part);

    /*
     * Korpusname:
     *
     * Idealfall ist der Korpusname bereits am geflatten
     * Part vorhanden.
     *
     * Fallbacks für unterschiedliche Strukturen.
     */
    const cabinetName =
      part.cabinetName ||
      part.korpusName ||
      part.CabinetName ||
      part.parentName ||
      "";

    /*
     * Der Typ des Bauteils soll unabhängig vom
     * konkreten Namen als Anzeige dienen.
     */
    let partType = "Bauteil";

    if (partOrder === 0) {
      partType = "Seite";
    } else if (partOrder === 1) {
      partType = "Boden";
    } else if (partOrder === 2) {
      partType = "Mittelwand";
    } else {
      partType = part.Objektname || "Bauteil";
    }

    /*
     * Gleiche CNC-Signatur + gleicher Bauteiltyp
     * werden zu einer Gruppe.
     *
     * Dadurch wird z.B. nicht versehentlich eine Seite
     * mit einem Boden zusammengefasst, nur weil die
     * CNC-Operationen identisch sind.
     */
    const groupKey = `${partOrder}|${partType}|${signature}`;

    if (!groups.has(groupKey)) {

      groups.set(groupKey, {
        id: createId(),

        signature,

        name: partType,

        type: part.Plattentyp || "",

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

    group.parts.push(part);

    // Anzahl der tatsächlichen Bauteile
    group.count += Number(part.Anzahl) || 1;

    // Korpusnamen einmalig sammeln
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