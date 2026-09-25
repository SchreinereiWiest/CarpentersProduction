import Drill from "./operations/drill";
import Shelf from "./operations/shelf";
import VB from "./operations/vb";
import VB2 from "./operations/vb2";
import LgBox from "./operations/lgBox";
import React, {useState, useEffect,} from "react";


export const getOperationPosition = (
    operation,
    partHeight
) => {

    const x = Number(operation.x);
    const y = Number(operation.y);

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        return null;
    }

    return {
        x,
        y
    };
};


const getOperationId = (
    operation,
    index
) => {

    return (
        operation.id ??
        `operation-${index}`
    );
};


export default function CncOperationsLayer({
    part,
    selectedOperationId,
    onSelectOperation
}) {

    if (!part) {
        return null;
    }

    const width = Number(part.B);
    const height = Number(part.L);

    const operations = part.CNC?.operations
            ? part.CNC.operations
            : [];

    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height)
    ) {
        return null;
    }

    return (
    <g>

        {operations.map(
            (operation, index) => {

                const operationId =
                    getOperationId(
                        operation,
                        index
                    );

                return (
                    <React.Fragment
                        key={operationId}
                    >

                        <Drill
                            operation={operation}
                            height={height}
                            width={width}
                            operationId={operationId}
                            selectedOperationId={
                                selectedOperationId
                            }
                            onSelectOperation={
                                onSelectOperation
                            }
                        />

                        <Shelf
                            operation={operation}
                            height={height}
                            width={width}
                            operationId={operationId}
                            selectedOperationId={
                                selectedOperationId
                            }
                            onSelectOperation={
                                onSelectOperation
                            }
                        />

                        <VB
                                operation={
                                    operation
                                }
                                height={
                                    height
                                }
                                width={
                                    width
                                }
                                operationId={
                                    operationId
                                }
                                selectedOperationId={
                                    selectedOperationId
                                }
                                onSelectOperation={
                                    onSelectOperation
                                }
                            />


                            <VB2
                                operation={
                                    operation
                                }
                                height={
                                    height
                                }
                                width={
                                    width
                                }
                                operationId={
                                    operationId
                                }
                                selectedOperationId={
                                    selectedOperationId
                                }
                                onSelectOperation={
                                    onSelectOperation
                                }
                            />

                            <LgBox
                                operation={operation}
                                height={height}
                                width={width}
                                operationId={operationId}
                                selectedOperationId={
                                    selectedOperationId
                                }
                                onSelectOperation={
                                    onSelectOperation
                                }
                            />

                    </React.Fragment>
                );
            }
        )}

    </g>
);
}