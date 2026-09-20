import { updateElementGeometry } from "./updateGeometry";
import { findElement } from "./findElement";

export const updateSelectedGeometry = (
    property,
    value,
    selectedElement,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {

    if (
        !selectedElement ||
        !activeCabinet
    ) {
        return;
    }


    const numericValue =
        Number(value);


    if (!Number.isFinite(numericValue)) {
        return;
    }


    // =====================================================
    // SECTION
    // =====================================================

    if (
        selectedElement.type === "section"
    ) {

        const newSections =
            updateElementGeometry(
                activeCabinet.sections ?? [],
                selectedElement.id,
                property,
                numericValue,
                0
            );


        updateActiveCabinet({
            sections: newSections
        });


        const updatedElement =
            findElement(
                newSections,
                selectedElement.id
            );


        if (updatedElement) {

            setSelectedElement(
                updatedElement
            );
        }


        return;
    }


    // =====================================================
    // FRONT
    // =====================================================

    if (
        selectedElement.type === "front"
    ) {

        const frontGap =
            Number(
                activeCabinet.frontGap ?? 3
            );


        const newFronts =
            updateElementGeometry(
                activeCabinet.fronts ?? [],
                selectedElement.id,
                property,
                numericValue,
                frontGap
            );


        updateActiveCabinet({
            fronts: newFronts
        });


        const updatedElement =
            findElement(
                newFronts,
                selectedElement.id
            );


        if (updatedElement) {

            setSelectedElement(
                updatedElement
            );
        }
    }
};