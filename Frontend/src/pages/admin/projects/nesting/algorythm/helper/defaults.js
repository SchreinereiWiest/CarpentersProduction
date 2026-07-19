
export const defaultSettings = {

    // Rand zur Außenkante
    margin: 10,

    // Abstand zwischen Teilen
    gap: 5,

    // Sägeschnitt
    cutGap: 4,

    // Anzahl Versuche
    iterations: 50,

    // Teile drehen erlaubt
    allowRotation: true,

    // Wahrscheinlichkeit einer Rotation
    rotationChance: 0.5,

    // 0 = horizontal
    // 1 = vertikal
    // 0.5 = zufällig
    cutDirection: 0.5,

    // Abstand zwischen mehreren Platten
    sheetOffset: 3000,

    // Standardplatte
    defaultSheet: {

        width: 2800,
        height: 2070,
        material: "STANDARD"

    }

};