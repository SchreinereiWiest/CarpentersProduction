

import React from "react";
import {
    getPartWidth,
    isFiniteNumber,
    getSelectedFill,
    getSelectedStroke
} from "./operationUtils";

export default function VBH({
    operation,
    part,
    operationId,
    selected,
    onSelect
}) {

    const partWidth =
        getPartWidth(part);


    const positions =
        Array.isArray(
            operation.positions
        )
            ? operation.positions
            : [];


    if (
        positions.length === 0
    ) {
        return null;
    }


    const side =
        operation.side ??
        "left";


    const x =
        side === "right"
            ? partWidth
            : 0;


    const direction =
        side === "right"
            ? -1
            : 1;


    const diameter =
        Math.max(
            2,
            Number(
                operation.diameter ??
                8
            )
        );


    const depth =
        Math.max(
            0,
            Number(
                operation.depth ??
                15
            )
        );


    return (
        <g>

            {positions.map(
                (
                    position,
                    index
                ) => {

                    const y =
                        Number(
                            position
                        );


                    if (
                        !Number.isFinite(
                            y
                        )
                    ) {
                        return null;
                    }


                    const endX =
                        x +
                        direction *
                        depth;


                    return (
                        <React.Fragment
                            key={
                                `${operationId}-${index}`
                            }
                        >

                            {/* Bohrkanal */}
                            <line
                                x1={x}
                                y1={y}
                                x2={endX}
                                y2={y}
                                stroke={
                                    selected
                                        ? "#f97316"
                                        : "#6b7280"
                                }
                                strokeWidth={
                                    Math.max(
                                        1,
                                        diameter / 2
                                    )
                                }
                                opacity="0.8"
                                pointerEvents="none"
                            />


                            {/* Bohrung */}
                            <circle
                                cx={x}
                                cy={y}
                                r={
                                    selected
                                        ? diameter / 2 + 2
                                        : diameter / 2
                                }
                                fill={
                                    getSelectedFill(
                                        selected
                                    )
                                }
                                stroke={
                                    getSelectedStroke(
                                        selected
                                    )
                                }
                                strokeWidth="1"
                                className="cursor-pointer"
                                onClick={(event) => {

                                    event.stopPropagation();

                                    onSelect?.(
                                        operationId
                                    );
                                }}
                            />

                        </React.Fragment>
                    );
                }
            )}

        </g>
    );
}