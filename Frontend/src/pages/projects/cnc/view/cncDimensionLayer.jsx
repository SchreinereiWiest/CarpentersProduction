

import React from "react";


const getOperationX = ({
    operation,
    partWidth
}) => {

    if (
        Number.isFinite(
            Number(
                operation?.x
            )
        )
    ) {

        return Number(
            operation.x
        );

    }


    if (
        Number.isFinite(
            Number(
                operation?.position
            )
        )
    ) {

        return Number(
            operation.position
        );

    }


    if (
        Number.isFinite(
            Number(
                operation?.lengthOffset
            )
        )
    ) {

        const offset =
            Number(
                operation.lengthOffset
            );


        const reference =
            operation.lengthReference ??
            "left";


        if (
            reference === "right" ||
            reference === "bottom"
        ) {

            return (
                partWidth -
                offset
            );

        }


        return offset;

    }


    if (
        Number.isFinite(
            Number(
                operation?.startX
            )
        )
    ) {

        return Number(
            operation.startX
        );

    }

    if (
        Number.isFinite(
            Number(
                operation?.start
            )
        )
    ) {

        return Number(
            operation.start
        );

    }


    return null;

};


const getOperationY = (
    operation
) => {

    /*
     * Direkte Y-Position
     */

    if (
        Number.isFinite(
            Number(
                operation?.y
            )
        )
    ) {

        return Number(
            operation.y
        );

    }


    /*
     * BO / ähnliche Operationen
     */

    if (
        Number.isFinite(
            Number(
                operation?.depthPosition
            )
        )
    ) {

        return Number(
            operation.depthPosition
        );

    }

    if (
        Number.isFinite(
            Number(
                operation?.frontOffset
            )
        )
    ) {

        return Number(
            operation.frontOffset
        );

    }


    /*
     * VB / VBH:
     * erste Bohrung der Y-Reihe
     */

    if (
        Array.isArray(
            operation?.positions
        ) &&
        operation.positions.length > 0
    ) {

        const first =
            Number(
                operation.positions[0]
            );


        if (
            Number.isFinite(first)
        ) {

            return first;

        }

    }


    return null;

};


export default function CncDimensionLayer({
    part,
    operation
}) {

    if (
        !part ||
        !operation
    ) {

        return null;

    }


    const width =
        Number(
            part.L
        ) || 0;


    const height =
        Number(
            part.B
        ) || 0;


    const x =
        getOperationX({

            operation,

            partWidth:
                width

        });

    const x2 = operation.type === "LR" ? operation.end : null;

    console.log(x2 ? x2 : x);


    const y =
        getOperationY(
            operation
        );


    /*
     * Ohne X-Position keine X-Bemaßung.
     */

    const hasX = Number.isFinite(x);


    /*
     * Ohne Y-Position keine Y-Bemaßung.
     */

    const hasY =
        Number.isFinite(y);


    if (
        !hasX &&
        !hasY
    ) {

        return null;

    }


    const dimensionOffset =
        45;


    const tickSize =
        12;


    return (

        <g
            pointerEvents="none"
        >


            {/* =================================================
             * X-Maß von links
             * ================================================= */}

            {
                hasX && (

                    <g>

                        {/* Hilfslinie am linken Bezugspunkt */}

                        <line
                            x1={0}
                            y1={-dimensionOffset - 12}
                            x2={0}
                            y2={-dimensionOffset + 12}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Hilfslinie an der Operation */}

                        <line
                            x1={x}
                            y1={-dimensionOffset - 12}
                            x2={x}
                            y2={-dimensionOffset + 12}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Maßlinie */}

                        <line
                            x1={0}
                            y1={-dimensionOffset}
                            x2={x}
                            y2={-dimensionOffset}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Wert */}

                        <text
                            x={
                                x / 2
                            }
                            y={
                                -dimensionOffset - 12
                            }
                            fill="#fb923c"
                            fontSize="18"
                            textAnchor="middle"
                        >
                            {x} mm
                        </text>

                    </g>

                )
            }


            {/* =================================================
             * X-Maß von rechts
             * ================================================= */}

            {
                hasX && (

                    <g>

                        {/* Hilfslinie an der Operation */}

                        <line
                            x1={x2 ? x2 : x}
                            y1={-dimensionOffset - 12}
                            x2={x2 ? x2 : x}
                            y2={-dimensionOffset + 12}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Hilfslinie an der rechten Kante */}

                        <line
                            x1={width}
                            y1={-dimensionOffset - 12}
                            x2={width}
                            y2={-dimensionOffset + 12}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Maßlinie */}

                        <line
                            x1={x2 ? x2 : x}
                            y1={-dimensionOffset}
                            x2={width}
                            y2={-dimensionOffset}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Wert */}

                        <text
                            x={
                                (x2 ? x2 : x) +
                                (
                                    width - (x2 ? x2 : x)
                                ) / 2
                            }
                            y={
                                -dimensionOffset -
                                12
                            }
                            fill="#fb923c"
                            fontSize="18"
                            textAnchor="middle"
                        >
                            {(
                                width - (x2 ? x2 : x)
                            ).toFixed(1)} mm
                        </text>

                    </g>

                )
            }


            {/* =================================================
             * Y-Maß von oben links
             * ================================================= */}

            {
                hasY && (

                    <g>

                        {/* Vertikale Maßlinie */}

                        <line
                            x1={-dimensionOffset}
                            y1={0}
                            x2={-dimensionOffset}
                            y2={y}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* obere Begrenzung */}

                        <line
                            x1={
                                -dimensionOffset -
                                tickSize
                            }
                            y1={0}
                            x2={
                                -dimensionOffset +
                                tickSize
                            }
                            y2={0}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Operation */}

                        <line
                            x1={
                                -dimensionOffset -
                                tickSize
                            }
                            y1={y}
                            x2={
                                -dimensionOffset +
                                tickSize
                            }
                            y2={y}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                        />


                        {/* Wert */}

                        <text
                            x={
                                -dimensionOffset -
                                25
                            }
                            y={
                                y / 2
                            }
                            fill="#fb923c"
                            fontSize="18"
                            textAnchor="middle"
                            transform={`
                                rotate(
                                    -90
                                    ${-dimensionOffset - 25}
                                    ${y / 2}
                                )
                            `}
                        >
                            {y} mm
                        </text>

                    </g>

                )
            }

        </g>

    );

}