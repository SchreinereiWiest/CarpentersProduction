function normalizeMaterialNumber(value) {
    return String(value ?? "").trim().toLocaleLowerCase("de");
}

function toMillimeters(value) {
    const normalizedValue = typeof value === "string"
        ? value.trim().replace(",", ".")
        : value;
    const millimeters = Number(normalizedValue);

    return Number.isFinite(millimeters) && millimeters > 0 ? millimeters : 0;
}

function getEdgeMaterialNumber(value) {
    const materialNumber = String(value ?? "").trim();

    if (!materialNumber || normalizeMaterialNumber(materialNumber) === "standardmaterial") {
        return "";
    }

    return materialNumber;
}

/**
 * Summiert den Kantenbedarf eines Plattenmaterials ueber alle Staerken hinweg.
 * Oben/unten verwenden die Plattenbreite, links/rechts die Plattenlaenge.
 */
export function calculateEdgeRequirements(sheets = [], materialNumber, storageMaterials = []) {
    const requestedMaterial = normalizeMaterialNumber(materialNumber);
    const requirements = new Map();
    const edgeNumbersByReference = new Map();

    (Array.isArray(storageMaterials) ? storageMaterials : []).forEach((material) => {
        const materialNumber = String(material?.materialNumber ?? "").trim();
        const edgeArticleNumber = String(material?.edgeArticleNumber ?? "").trim();
        const canonicalNumber = edgeArticleNumber || materialNumber;
        if (!canonicalNumber) return;

        if (material?.id) {
            edgeNumbersByReference.set(normalizeMaterialNumber(material.id), canonicalNumber);
        }
        if (materialNumber) {
            edgeNumbersByReference.set(normalizeMaterialNumber(materialNumber), canonicalNumber);
        }
        if (edgeArticleNumber) {
            edgeNumbersByReference.set(normalizeMaterialNumber(edgeArticleNumber), canonicalNumber);
        }
    });

    if (!Array.isArray(sheets)) {
        return { totalMeters: 0, byEdgeMaterial: [] };
    }

    const addRequirement = (edgeMaterial, millimeters) => {
        const storedReference = getEdgeMaterialNumber(edgeMaterial);
        if (!storedReference || millimeters <= 0) return;

        const displayNumber = edgeNumbersByReference.get(normalizeMaterialNumber(storedReference))
            ?? storedReference;

        const key = normalizeMaterialNumber(displayNumber);
        const current = requirements.get(key) ?? {
            materialNumber: displayNumber,
            millimeters: 0
        };

        current.millimeters += millimeters;
        requirements.set(key, current);
    };

    sheets
        .filter((sheet) => (
            !requestedMaterial || normalizeMaterialNumber(sheet?.MID) === requestedMaterial
        ))
        .forEach((sheet) => {
            (sheet.plates ?? []).forEach((plate) => {
                const width = toMillimeters(
                    plate.originalWidth ?? plate.original?.B ?? plate.width
                );
                const height = toMillimeters(
                    plate.originalHeight ?? plate.original?.L ?? plate.height
                );

                addRequirement(plate.EdgeT ?? plate.original?.ETID, width);
                addRequirement(plate.EdgeB ?? plate.original?.EBID, width);
                addRequirement(plate.EdgeL ?? plate.original?.ELID, height);
                addRequirement(plate.EdgeR ?? plate.original?.ERID, height);
            });
        });

    const byEdgeMaterial = [...requirements.values()]
        .map(({ materialNumber: edgeMaterialNumber, millimeters }) => ({
            materialNumber: edgeMaterialNumber,
            meters: millimeters / 1000
        }))
        .sort((a, b) => a.materialNumber.localeCompare(b.materialNumber, "de", {
            numeric: true,
            sensitivity: "base"
        }));

    return {
        totalMeters: byEdgeMaterial.reduce((sum, requirement) => sum + requirement.meters, 0),
        byEdgeMaterial
    };
}
