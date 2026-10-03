import React from "react";

import Drill from "./operations/drill";
import Shelf from "./operations/shelf";
import VB from "./operations/vb";
import VBH from "./operations/vbh";
import LgBox from "./operations/lgBox";
import Milling from "./operations/milling";
import Groove from "./operations/groove";

import {
    getOperationId
} from "./operations/operationUtils";


export default function CncOperationsLayer({
    part,
    selectedOperationId,
    onSelectOperation,
    selectedFace = "A"
}) {

    if (!part) {
        return null;
    }


    const operations =
        Array.isArray(
            part.CNC?.operations
        )
            ? part.CNC.operations
            : [];


    return (
        <g>

            {operations.map(
                (
                    operation,
                    index
                ) => {

                    const operationId =
                        getOperationId(
                            operation,
                            index
                        );


                    /*
                     * ==================================================
                     * FACE
                     * ==================================================
                     *
                     * "A"     -> nur A
                     * "B"     -> nur B
                     * "both"  -> auf A UND B
                     */

                    const operationFace =
                        operation.face ??
                        "A";


                    if (
                        operationFace !== "both" &&
                        operationFace !== selectedFace
                    ) {
                        return null;
                    }


                    const selected =
                        selectedOperationId ===
                        operationId;


                    /*
                     * ==================================================
                     * BO
                     * ==================================================
                     */

                    if (
                        operation.type ===
                        "BO"
                    ) {

                        return (
                            <Drill
                                key={operationId}
                                operation={
                                    operation
                                }
                                part={
                                    part
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }


                    /*
                     * ==================================================
                     * LR
                     * ==================================================
                     */

                    if (
                        operation.type ===
                        "LR"
                    ) {

                        return (
                            <Shelf
                                key={operationId}
                                operation={
                                    operation
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }


                    /*
                     * ==================================================
                     * VB
                     * ==================================================
                     */

                    if (
                        operation.type ===
                        "VB"
                    ) {

                        return (
                            <VB
                                key={operationId}
                                operation={
                                    operation
                                }
                                part={
                                    part
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }


                    /*
                     * ==================================================
                     * VBH
                     * ==================================================
                     */

                    if (
                        operation.type ===
                        "VBH"
                    ) {

                        return (
                            <VBH
                                key={operationId}
                                operation={
                                    operation
                                }
                                part={
                                    part
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }


                    /*
                     * ==================================================
                     * Legrabox
                     * ==================================================
                     */

                    if (
                        operation.type ===
                        "LGBOX"
                    ) {

                        return (
                            <LgBox
                                key={operationId}
                                operation={
                                    operation
                                }
                                part={
                                    part
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }


                    /*
                     * ==================================================
                     * Fräsungen
                     * ==================================================
                     */

                    if (
                        operation.type ===
                            "XG0" ||
                        operation.type ===
                            "XL2P"
                    ) {

                        return (
                            <Milling
                                key={operationId}
                                operation={
                                    operation
                                }
                                part={
                                    part
                                }
                                operationId={
                                    operationId
                                }
                                selected={
                                    selected
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );
                    }

                    if (
                        operation.type === "RNT"
                    ) {

                        return (
                            <Groove
                                key={operationId}
                                operation={operation}
                                part={part}
                                operationId={operationId}
                                selected={
                                    selectedOperationId === operationId
                                }
                                onSelect={
                                    onSelectOperation
                                }
                            />
                        );

                    }


                    return null;
                }
            )}

        </g>
    );
}