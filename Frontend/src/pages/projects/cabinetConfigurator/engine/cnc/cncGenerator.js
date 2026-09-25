
import { createId } from "./cncHelpers";
import { applyShelfCncToSides } from "./operations/generateShelf";
import { createEmptyCnc, ensureCnc, flattenSections } from "./cncHelpers";
import { applyJoints } from "./operations/generateJoints";
import { applyLgBox } from "./operations/generateLegrabox";
// ============================================================
// CNC Basis
// ============================================================



// ============================================================
// Hilfsfunktion
// ============================================================

export const isNear = (
    a,
    b,
    tolerance = 0.01
) => {

    return Math.abs(
        Number(a) - Number(b)
    ) <= tolerance;
};



// ============================================================
// Zentrale CNC-Erzeugung eines Korpus
// ============================================================

export const applyCncToParts = (
    cabinet,
    parts
) => {

    /*
     * Alle Bauteile erhalten zunächst
     * eine einheitliche CNC-Struktur.
     */

    parts.forEach(
        part => ensureCnc(part)
    );

    console.log("parts", parts);
    const sections =
            flattenSections(
                cabinet.sections ?? []
            );
    console.log("sections:", sections);
    /*
     * Shelf / Lochreihen
     */

    applyShelfCncToSides(
        cabinet,
        parts
    );

    applyJoints(cabinet, parts);

    applyLgBox(cabinet, parts);

    return parts;
};