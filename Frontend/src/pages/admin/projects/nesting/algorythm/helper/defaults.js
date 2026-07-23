
export const defaultSettings = {

    // Rand zur Außenkante
    margin: 10,

    // Abstand zwischen Teilen
    gap: 20,

    // Sägeschnitt
    cutGap: 4,

    // Anzahl Versuche
    iterations: 1,

    // Teile drehen erlaubt 
    allowRotation: true,

    // Wahrscheinlichkeit einer Rotation
    rotationChance: 0.4,

    // 0 = horizontal
    // 1 = vertikal
    // 0.5 = zufällig
    cutDirection: 0.6,

    // Abstand zwischen mehreren Platten
    sheetOffset: 3000,

    // Standardplatte
    defaultSheet: {

        width: 2800,
        height: 2070,
        material: "STANDARD"

    }

};