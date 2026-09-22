import { getMaterialNumber } from "../../materials";

export const getDefaultEdges = (
    cabinet,
    materials,
    options = {}
) => {

    const {

        front = false,

        top = true,

        bottom = true

    } = options;


    return {

        ELID: "",

        ERID:
            front
                ? getMaterialNumber(
                    materials,
                    cabinet.frontEdgeMaterialId
                )
                : "",

        ETID:
            top
                ? getMaterialNumber(
                    materials,
                    cabinet.edgeTopMaterialId
                )
                : "",

        EBID:
            bottom
                ? getMaterialNumber(
                    materials,
                    cabinet.edgeBottomMaterialId
                )
                : ""
    };
};