import {
    calculateGeometryChange
} from "./calculateGeometryChange";

import {
    resizeChildrenToParent
} from "./resizeChildrenToParent";

import {updateParentGeometry} from "./updateParentGeometry"


export const updateElementGeometry = (
    elements,
    elementId,
    property,
    value,
    gap = 0
) => {

    const updateLevel = (nodes) => {

        for (
            let index = 0;
            index < nodes.length;
            index++
        ) {

            const node = nodes[index];


            // =================================================
            // ELEMENT GEFUNDEN
            // =================================================

            if (node.id === elementId) {

                const changes =
                    calculateGeometryChange(
                        node,
                        property,
                        value
                    );


                if (!changes) {
                    return {
                        nodes,
                        found: true,
                        changed: false
                    };
                }


                const updatedNode = {
                    ...node,
                    ...changes
                };


                // ---------------------------------------------
                // CHILDREN MITNEHMEN
                // ---------------------------------------------

                if (
                    node.children &&
                    node.children.length > 0
                ) {

                    updatedNode.children =
                        resizeChildrenToParent(
                            node,
                            updatedNode
                        );
                }


                const newNodes =
                    [...nodes];

                newNodes[index] =
                    updatedNode;


                // =================================================
                // VORHERIGES GESCHWISTER ANPASSEN
                // =================================================

                if (index > 0) {

                    const previousNode =
                        newNodes[index - 1];


                    // ---------------------------------------------
                    // horizontal
                    // ---------------------------------------------

                    if (
                        property === "x" ||
                        property === "width"
                    ) {

                        const previousRight =
                            updatedNode.x - gap;

                        const newPreviousWidth =
                            previousRight -
                            previousNode.x;


                        if (
                            newPreviousWidth <= 0
                        ) {

                            return {
                                nodes,
                                found: true,
                                changed: false
                            };
                        }


                        const updatedPreviousNode = {
                            ...previousNode,
                            width:
                                newPreviousWidth
                        };


                        // Hat das Geschwister Children,
                        // werden diese mit skaliert.
                        if (
                            previousNode.children &&
                            previousNode.children.length > 0
                        ) {

                            updatedPreviousNode.children =
                                resizeChildrenToParent(
                                    previousNode,
                                    updatedPreviousNode
                                );
                        }


                        newNodes[index - 1] =
                            updatedPreviousNode;
                    }


                    // ---------------------------------------------
                    // vertikal
                    // ---------------------------------------------

                    if (
                        property === "y" ||
                        property === "height"
                    ) {

                        const previousBottom =
                            updatedNode.y - gap;

                        const newPreviousHeight =
                            previousBottom -
                            previousNode.y;


                        if (
                            newPreviousHeight <= 0
                        ) {

                            return {
                                nodes,
                                found: true,
                                changed: false
                            };
                        }


                        const updatedPreviousNode = {
                            ...previousNode,
                            height:
                                newPreviousHeight
                        };


                        // Children des vorherigen
                        // Geschwisters mitnehmen
                        if (
                            previousNode.children &&
                            previousNode.children.length > 0
                        ) {

                            updatedPreviousNode.children =
                                resizeChildrenToParent(
                                    previousNode,
                                    updatedPreviousNode
                                );
                        }


                        newNodes[index - 1] =
                            updatedPreviousNode;
                    }
                }


                return {
                    nodes: newNodes,
                    found: true,
                    changed: true
                };
            }


            // =================================================
            // CHILDREN DURCHSUCHEN
            // =================================================

            if (
                node.children &&
                node.children.length > 0
            ) {

                const childResult =
                    updateLevel(
                        node.children
                    );


                if (childResult.found) {

                    if (
                        !childResult.changed
                    ) {
                        return {
                            nodes,
                            found: true,
                            changed: false
                        };
                    }


                    const updatedChildren =
                        childResult.nodes;


                    // =============================================
                    // PARENT AUS CHILDREN NEU BERECHNEN
                    // =============================================

                    const updatedParent =
                        updateParentGeometry(
                            node,
                            updatedChildren,
                            property
                        );


                    const newNodes =
                        [...nodes];


                    newNodes[index] = {
                        ...updatedParent,
                        children:
                            updatedChildren
                    };


                    // =============================================
                    // ANGRENZENDES GESCHWISTER
                    // =============================================

                    if (index > 0) {

                        const previousNode =
                            newNodes[index - 1];


                        // -----------------------------------------
                        // horizontal
                        // -----------------------------------------

                        if (
                            property === "x" ||
                            property === "width"
                        ) {

                            const previousRight =
                                updatedParent.x - gap;

                            const newPreviousWidth =
                                previousRight -
                                previousNode.x;


                            if (
                                newPreviousWidth <= 0
                            ) {

                                return {
                                    nodes,
                                    found: true,
                                    changed: false
                                };
                            }


                            const updatedPreviousNode = {
                                ...previousNode,
                                width:
                                    newPreviousWidth
                            };


                            if (
                                previousNode.children &&
                                previousNode.children.length > 0
                            ) {

                                updatedPreviousNode.children =
                                    resizeChildrenToParent(
                                        previousNode,
                                        updatedPreviousNode
                                    );
                            }


                            newNodes[index - 1] =
                                updatedPreviousNode;
                        }


                        // -----------------------------------------
                        // vertikal
                        // -----------------------------------------

                        if (
                            property === "y" ||
                            property === "height"
                        ) {

                            const previousBottom =
                                updatedParent.y - gap;

                            const newPreviousHeight =
                                previousBottom -
                                previousNode.y;


                            if (
                                newPreviousHeight <= 0
                            ) {

                                return {
                                    nodes,
                                    found: true,
                                    changed: false
                                };
                            }


                            const updatedPreviousNode = {
                                ...previousNode,
                                height:
                                    newPreviousHeight
                            };


                            if (
                                previousNode.children &&
                                previousNode.children.length > 0
                            ) {

                                updatedPreviousNode.children =
                                    resizeChildrenToParent(
                                        previousNode,
                                        updatedPreviousNode
                                    );
                            }


                            newNodes[index - 1] =
                                updatedPreviousNode;
                        }
                    }


                    return {
                        nodes: newNodes,
                        found: true,
                        changed: true
                    };
                }
            }
        }


        return {
            nodes,
            found: false,
            changed: false
        };
    };


    const result =
        updateLevel(elements);


    return result.nodes;
};