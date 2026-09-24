import { getMaterialNumber } from "../materials";
import { getGrainValue } from "../materials";

export const createPart = ({
    PID,
    name,
    type,
    quantity = 1,

    L,
    B,
    T,

    materialId,

    materials,

    edges = {},

    cnc = null,

    position = null,

    source = null,

    note = ""
}) => {

    console.log(cnc);

    const part = {

        PID,

        BPID: "Nein",

        Objektname:
            name,

        Plattentyp:
            type,

        Anzahl:
            Number(quantity),

        L:
            Number(L),

        B:
            Number(B),

        T:
            Number(T),

        MID:
            getMaterialNumber(
                materials,
                materialId
            ),

        Maserung:
            getGrainValue(
                materials,
                materialId
            ),

        ELID:
            edges.ELID ?? "",

        ERID:
            edges.ERID ?? "",

        ETID:
            edges.ETID ?? "",

        EBID:
            edges.EBID ?? "",

        Kante:
            `${edges.ELID ?? ""}:` +
            `${edges.ERID ?? ""}:` +
            `${edges.ETID ?? ""}:` +
            `${edges.EBID ?? ""}`,

        Notiz:
            note,

        color:
            "#25a7b3"
    };


    if (cnc) {
        part.CNC = cnc;
    }

    if (position) {
        part.Position = position;
    }


    if (source) {
        part.Source = source;
    }

    return part;
};