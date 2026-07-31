

function detectPreset(plate) {

    switch (plate.Plattentyp) {

        case "Boden":
            return "Boden";

        case "Back":
        case "Rückwand":
            return "Back";

        case "Seite":
        case "Seite links":
        case "Seite rechts":
            return "Seite";

        case "Front":
            return "Front";

        default:
            return "def";

    }

}

export function importCadData(cadData, materials) {


    const getMaterialId = (materialNumber) => {

        const material = materials.find(
            m => m.materialNumber === materialNumber
        );

        return material?.id ?? "";
    };

    return cadData.map((item, index) => ({

        id: index,

        name: item.Objektname,

        quantity: Number(item.Anzahl),

        width: Number(item.B),

        height: Number(item.L),

        depth: Number(item.T),

        MID: getMaterialId(item.MID),

        preset: "def",

        type: item.Plattentyp,

        Children: (item.Children ?? []).map((child, childIndex) => ({

            id: childIndex,

            name: child.Objektname,

            quantity: Number(child.Anzahl),

            width: Number(child.B),

            height: Number(child.L),

            depth: Number(child.T),

            MID: getMaterialId(child.MID),

            preset: detectPreset(child),

            type: child.Plattentyp,

            ELID: child.ELID ?? "",

            ERID: child.ERID ?? "",

            ETID: child.ETID ?? "",

            EBID: child.EBID ?? "",

            Maserung: child.Maserung ?? "",

            Notiz: child.Notiz ?? ""

        }))

    }));

}