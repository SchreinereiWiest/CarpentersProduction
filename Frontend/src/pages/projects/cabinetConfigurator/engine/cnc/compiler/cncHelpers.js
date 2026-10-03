import { DEFAULT_CNC } from "../cncDefaults";

export const getOperationSignature = (operation) => {

    const {
        id,
        source,
        reference,
        ...geometry
    } = operation ?? {};

    return JSON.stringify(geometry);
};


export const addOperation = (part, operation) => {

    if (!part) {
        return null;
    }

    ensureCnc(part);

    const signature =
        getOperationSignature(operation);

    const existing =
        part.CNC.operations.find(
            existingOperation =>
                getOperationSignature(existingOperation) === signature
        );

    if (existing) {
        return existing;
    }

    const {
        id,
        ...operationWithoutId
    } = operation;

    const entry = {
        id: id ?? createId(),
        ...operationWithoutId
    };

    part.CNC.operations.push(entry);

    return entry;
};


export function createId() {
        return Date.now() + Math.random();
}


export const createEmptyCnc = () => ({
    version: 1,

    coordinateSystem: {
        unit: "mm",
        origin: "top-left"
    },

    operations: []
});


export const ensureCnc = (part) => {

    // console.log(part);

    if (!part.CNC) {
        part.CNC = createEmptyCnc();
    }

    if (!Array.isArray(part.CNC.operations)) {
        part.CNC.operations = [];
    }

    return part;
};


export function flattenSections(
    sections
) {

    const result = [];


    const walk = (
        sectionList
    ) => {

        sectionList.forEach(
            section => {

                result.push(
                    section
                );


                if (
                    Array.isArray(
                        section.children
                    ) &&
                    section.children.length > 0
                ) {

                    walk(
                        section.children
                    );

                }

            }
        );

    };


    walk(
        sections ?? []
    );


    return result;

};


/* =========================================================
 * Allgemeine Helfer
 * ========================================================= */

export const getCncConfig = (cabinet) => {

    const custom =
        cabinet?.cncDefault ??
        {};

    return {

        spax: {
            ...DEFAULT_CNC.spax,
            ...custom.spax,

            screw: {
                ...DEFAULT_CNC.spax.screw,
                ...(custom.spax?.screw ?? {})
            },

            connector: {
                ...DEFAULT_CNC.spax.connector,
                ...(custom.spax?.connector ?? {})
            },

            horizontal: {
                ...DEFAULT_CNC.spax.horizontal,
                ...(custom.spax?.horizontal ?? {})
            }
        },

        shelf: {
            ...DEFAULT_CNC.shelf,
            ...(custom.shelf ?? {})
        },

        legrabox: {
            ...DEFAULT_CNC.legrabox,
            ...(custom.legrabox ?? {})
        },

        backPanel: {

            ...DEFAULT_CNC.backPanel,
            ...(custom.backPanel ?? {}),

            groove: {
                ...DEFAULT_CNC.backPanel.groove,
                ...(custom.backPanel?.groove ?? {})
            },

            rabbet: {
                ...DEFAULT_CNC.backPanel.rabbet,
                ...(custom.backPanel?.rabbet ?? {})
            },

            insertedRabbet: {
                ...DEFAULT_CNC.backPanel.insertedRabbet,
                ...(custom.backPanel?.insertedRabbet ?? {})
            }

        }

    };

};


export const getSource = (part) => {

    return (
        part?.Source ??
        part?.source ??
        {}
    );

};


export const getRole = (part) => {

    const source =
        getSource(part);

    return (
        source.role ??
        part?.role ??
        ""
    );

};


export const getPartType = (part) => {

    return (
        part?.Plattentyp ??
        part?.type ??
        ""
    );

};


export const getPartPosition = (part) => {

    return (
        part?.position ??
        part?.Position ??
        {}
    );

};


export const getSectionFunctions = (section) => {

    return Array.isArray(
        section?.functionConfig
    )
        ? section.functionConfig
        : [];

};


export const isNear = (
    a,
    b,
    tolerance = 0.5
) => {

    return (
        Math.abs(
            Number(a) -
            Number(b)
        ) <= tolerance
    );

};


export const getConnectorHoleCount = (
    total,
    threshold = 300
) => {

    const numericTotal =
        Number(total);

    const numericThreshold =
        Number(threshold);

    if (
        !Number.isFinite(numericTotal) ||
        !Number.isFinite(numericThreshold)
    ) {
        return 4;
    }

    return numericTotal < numericThreshold
        ? 3
        : 4;
};
/* =========================================================
 * Partklassifikation
 * ========================================================= */

export const isSidePart = (part) => {

    const role =
        String(
            getRole(part)
        ).toLowerCase();

    const type =
        String(
            getPartType(part)
        ).toLowerCase();

    const name =
        String(
            part?.Objektname ?? ""
        ).toLowerCase();

    return (
        role === "side" ||
        role === "seiten" ||
        type === "seite" ||
        name === "seiten"
    );

};


export const isTopPart = (part) => {

    const role =
        String(
            getRole(part)
        ).toLowerCase();

    const type =
        String(
            getPartType(part)
        ).toLowerCase();

    const name =
        String(
            part?.Objektname ?? ""
        ).toLowerCase();

    return (
        role === "top" ||
        type === "deckel" ||
        name === "deckel"
    );

};


export const isBottomPart = (part) => {

    const role =
        String(
            getRole(part)
        ).toLowerCase();

    const type =
        String(
            getPartType(part)
        ).toLowerCase();

    const name =
        String(
            part?.Objektname ?? ""
        ).toLowerCase();

    return (
        role === "bottom" ||
        type === "boden" ||
        name === "boden"
    );

};


export const isMiddleWallPart = (part) => {

    const source =
        getSource(part);

    const role =
        String(
            source.role ??
            ""
        ).toLowerCase();

    const type =
        String(
            getPartType(part)
        ).toLowerCase();

    return (
        role === "middlewall" ||
        type === "mittelwand"
    );

};
