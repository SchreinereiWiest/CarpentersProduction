

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

    return cadData.map((item) => ({

        id: item.PID ?? Date.now() + Math.random(),

        _source: item,

        manual: item.manual === true,

        name: item.Objektname,

        quantity: Number(item.Anzahl),

        width: item.B ? Number(item.B) : null,

        height: item.L ?Number(item.L) : null,

        depth: item.T ? Number(item.T) : null,

        MID: getMaterialId(item.MID),

        preset: "def",

        type: item.Plattentyp,

        Children: (item.Children ?? []).map((child) => ({

            id: child.PID ?? Date.now() + Math.random(),

            _source: child,

            manual: child.manual === true,

            name: child.Objektname,

            quantity: Number(child.Anzahl),

            width: Number(child.B),

            height: Number(child.L),

            depth: Number(child.T),

            MID: getMaterialId(child.MID),

            preset: detectPreset(child),

            type: child.Plattentyp,

            ELID: getMaterialId(child.ELID) ?? "",

            ERID: getMaterialId(child.ERID) ?? "",

            ETID: getMaterialId(child.ETID) ?? "",

            EBID: getMaterialId(child.EBID) ?? "",

            Maserung: child.Maserung ?? "",

            Notiz: child.Notiz ?? ""

        }))

    }));

}
