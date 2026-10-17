function normalizeMaterialNumber(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
}

/** Sucht die angefragte MID im Storage-Katalog und bevorzugt passende Stärke. */
export function findStorageMaterial(materialNumber, thickness, storageMaterials = []) {
    const requestedNumber = normalizeMaterialNumber(materialNumber);
    if (!requestedNumber) return null;

    const matchingMaterials = storageMaterials.filter((material) => (
        normalizeMaterialNumber(material.materialNumber) === requestedNumber &&
        Number(material.width) > 0 &&
        Number(material.height) > 0
    ));

    if (!matchingMaterials.length) return null;
    if (matchingMaterials.length === 1) return matchingMaterials[0];

    const requestedThickness = Number(thickness);
    return matchingMaterials.find((material) => (
        Number.isFinite(requestedThickness) &&
        Number.isFinite(Number(material.thickness)) &&
        Math.abs(Number(material.thickness) - requestedThickness) < 0.001
    )) ?? null;
}
