import React, {
    useState
} from "react";

import CncPartsLayer
    from "./view/cncPartsLayer";

import CncOperationsLayer
    from "./cncOperationLayer";

import CncDimensionLayer
    from "./view/cncDimensionLayer";


export default function CncViewport({
    part,
    selectedOperationId,
    onSelectOperation,
    onSelectPart,
    operations,
    selectedFace
}) {


    if (
        !part
    ) {

        return (
            <div className="
                h-full
                w-full
                flex
                items-center
                justify-center
                text-gray-500
            ">

                Kein Bauteil ausgewählt

            </div>
        );

    }


    const width =
        Number(
            part.L
        ) || 600;


    const height =
        Number(
            part.B
        ) || 600;


    /*
     * Etwas mehr Platz, damit die
     * Maßlinien nicht abgeschnitten werden.
     */

    const padding =
        100;





    /*
     * =====================================================
     * Ausgewählte Operation ermitteln
     * =====================================================
     */

    const selectedOperation =
        operations.find(
            (
                operation,
                index
            ) => {

                const operationId =
                    operation.id ??
                    `operation-${index}`;


                return (
                    String(
                        operationId
                    ) ===
                    String(
                        selectedOperationId
                    )
                );

            }
        ) ?? null;


    return (

        <div className="
            relative
            h-full
            w-full
        ">





            {/* =================================================
             * SVG
             * ================================================= */}

            <svg

                className="
                    h-full
                    w-full
                    bg-gray-950
                "

                viewBox={`
                    ${-padding}
                    ${-padding}
                    ${width + padding * 2}
                    ${height + padding * 2}
                `}

                preserveAspectRatio="
                    xMidYMid meet
                "
            >


                {/* =================================================
                 * Raster
                 * ================================================= */}

                <defs>

                    <pattern
                        id="cnc-grid"
                        width="50"
                        height="50"
                        patternUnits="userSpaceOnUse"
                    >

                        <path
                            d="
                                M 50 0
                                L 0 0
                                0 50
                            "
                            fill="none"
                            stroke="rgb(31 41 55)"
                            strokeWidth="0.5"
                        />

                    </pattern>

                </defs>


                <rect

                    x={
                        -padding
                    }

                    y={
                        -padding
                    }

                    width={
                        width +
                        padding * 2
                    }

                    height={
                        height +
                        padding * 2
                    }

                    fill="url(#cnc-grid)"

                />


                {/* =================================================
                 * Bauteil
                 * ================================================= */}

                <CncPartsLayer
                    part={
                        part
                    }

                    onSelect={
                        onSelectPart
                    }

                />


                {/* =================================================
                 * CNC Bearbeitungen
                 * ================================================= */}

                <CncOperationsLayer
                    part={
                        part
                    }

                    selectedOperationId={
                        selectedOperationId
                    }

                    onSelectOperation={
                        onSelectOperation
                    }

                    selectedFace={
                        selectedFace
                    }

                />


                {/* =================================================
                 * Maßlinien der ausgewählten Bearbeitung
                 *
                 * Ganz zum Schluss zeichnen, damit sie
                 * immer sichtbar bleiben.
                 * ================================================= */}

                <CncDimensionLayer

                    part={
                        part
                    }

                    operation={
                        selectedOperation
                    }

                />

            </svg>

        </div>

    );

}