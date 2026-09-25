

import { Circle } from "./elements/circle";
import { getSplitPositions } from "../cncEngine/getSplitPosition";

export default function VB2({
    operation,
    height,
    width,
    operationId,
    selectedOperationId,
    onSelectOperation
}) {

    if (
        operation.type !== "vb2"
    ) {
        return null;
    }


    const selected =
        operationId ===
        selectedOperationId;


    const diameter =
        Number(
            operation.diameter ??
            operation.d
        ) || 8;


    const radius =
        diameter / 2;


    const operationX =
        Number(
            operation.x
        );


    const depth =
        Number(
            operation.depth
        ) || 0;


    const f =
        Number(
            operation.f
        ) || 0;


    if (
        !Number.isFinite(
            operationX
        )
    ) {
        return null;
    }


    /*
     * ========================================================
     * VB2 gespiegelt
     *
     * 9.5 von links
     * bei 2200 Länge:
     *
     * 2200 - 9.5 = 2190.5
     * ========================================================
     */

    const mirroredX =
        Number(height) - operationX;


    /*
     * ========================================================
     * F = 0
     * ========================================================
     */

    if (f === 0) {

        const positions =
            getSplitPositions(
                width,
                operation.spec
            );


        if (
            positions.length === 0
        ) {
            return null;
        }


        return (
            <g
                onClick={(event) => {

                    event.stopPropagation();

                    onSelectOperation?.(
                        operation
                    );
                }}
                style={{
                    cursor: "pointer"
                }}
            >

                {positions.map(
                    (y, index) => {

                        return (
                            <g>
                            <Circle
                                key={
                                    `${operationId}-${index}-M`
                                }
                                position={{
                                    x:
                                        mirroredX,

                                    y
                                }}
                                radius={
                                    radius
                                }
                                selected={
                                    selected
                                }
                            />

                            <Circle
                                key={
                                    `${operationId}-${index}`
                                }
                                position={{
                                    x:
                                        operationX,

                                    y
                                }}
                                radius={
                                    radius
                                }
                                selected={
                                    selected
                                }
                            />
                            </g>
                        );

                    }
                )}

            </g>
        );
    }


    /*
     * ========================================================
     * F = 1
     * ========================================================
     */

    if (f === 1) {

    const positions =
        getSplitPositions(
            width,
            operation.spec
        );

    if (
        positions.length === 0
    ) {
        return null;
    }

    return (
        <g
            onClick={(event) => {

                event.stopPropagation();

                onSelectOperation?.(
                    operation
                );

            }}
            style={{
                cursor: "pointer"
            }}
        >

            {positions.map(
                (yPosition, index) => {

                    return (
                        <g>
                        <line
                            key={
                                `${operationId}-${index}`
                            }
                            x1={0}
                            y1={yPosition}
                            x2={depth}
                            y2={yPosition}
                            stroke={
                                selected
                                    ? "rgb(59 130 246)"
                        : "rgb(239 68 68)"
                            }
                            strokeWidth={
                                Math.max(
                                    0.5,
                                    diameter
                                )
                            }
                            strokeOpacity={
                                selected
                                    ? 1
                                    : 0.75
                            }
                        />
                        <line
                            key={
                                `${operationId}-${index}`
                            }
                            x1={height-depth}
                            y1={yPosition}
                            x2={height}
                            y2={yPosition}
                            stroke={
                                selected
                                    ? "rgb(59 130 246)"
                        : "rgb(239 68 68)"
                            }
                            strokeWidth={
                                Math.max(
                                    0.5,
                                    diameter
                                )
                            }
                            strokeOpacity={
                                selected
                                    ? 1
                                    : 0.75
                            }
                        />
                        </g>
                    );

                }
            )}

        </g>
    );
}


    return null;
}