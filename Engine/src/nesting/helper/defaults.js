
    export const defaultSettings = {

        // Rand zur Außenkante
        margin: 0,

        // Abstand zwischen Teilen
        gap: 20,

        // Sägeschnitt
        cutGap: 4,

        // Teile drehen erlaubt 
        allowRotation: true,

        // 1d bildet Kanten-Strips; 2d packt einzelne Teile in freie Plattenbereiche.
        nestingMode: "1d",

        // Anzahl zusätzlicher Belegungsreihenfolgen im 2D-Nesting.
        optimizationPasses: 8,

        stripDifference: 100,

        // Abstand zwischen mehreren Platten
        sheetOffset: 3000,

        // Fangabstand beim manuellen Strip-Placement
        snapDistance: 120,

    // Standardplatte
    defaultSheet: {

        width: 2800,
        height: 2070,
        material: "STANDARD"

    },

    remainingPlates: []

};
