import { findTreeNode, updateTree } from "../../../shared/tree.js";


export const toggleFrontRemoved = (
    frontId,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement
) => {
    if (!activeCabinet) {
        return;
    }

    const selectedFront = findTreeNode(
        activeCabinet.fronts ?? [],
        frontId
    );

    if (!selectedFront || selectedFront.children?.length) {
        return;
    }

    const isRemoved = !selectedFront.isRemoved;
    const updatedFronts = updateTree(
        activeCabinet.fronts ?? [],
        frontId,
        front => ({
            ...front,
            isRemoved
        })
    );

    updateActiveCabinet({
        fronts: updatedFronts
    });

    setSelectedElement?.({
        ...selectedFront,
        type: "front",
        isRemoved
    });
};
