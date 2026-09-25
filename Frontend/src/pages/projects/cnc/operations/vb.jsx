

import { Circle } from "./elements/circle";
import { getSplitPositions } from "../cncEngine/getSplitPosition";

export default function VB({
    operation,
    height,
    width,
    operationId,
    selectedOperationId,
    onSelectOperation
}) {

    if (
        operation.type !== "vb"
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


    const x =
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
        !Number.isFinite(x)
    ) {
        return null;
    }


    /*
     * ========================================================
     * F = 0
     *
     * Bearbeitung von oben.
     * X = Abstand von links.
     * Y-Positionen kommen aus dem Split-Spec.
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
                            <Circle
                                key={
                                    `${operationId}-${index}`
                                }
                                position={{
                                    x,
                                    y
                                }}
                                radius={
                                    radius
                                }
                                selected={
                                    selected
                                }
                            />
                        );

                    }
                )}

            </g>
        );
    }


    /*
     * ========================================================
     * F = 1
     *
     * Bearbeitung von der gegenüberliegenden Seite.
     *
     * Die Bearbeitung wird als vertikale Linie
     * von der Außenkante in das Bauteil gezeichnet.
     *
     * Länge der Linie = depth
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