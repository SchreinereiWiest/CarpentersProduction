import CncPartsLayer
    from "./view/cncPartsLayer.jsx";

import CncOperationsLayer
    from "./cncOperationLayer.jsx";

import CncDimensionLayer
    from "./view/cncDimensionLayer.jsx";
import CncCompensationLayer
    from "./view/cncCompensationLayer.jsx";


export default function CncViewport({
    part,
    selectedOperationId,
    onSelectOperation,
    onSelectPart,
    operations,
    selectedFace,
    selectedOperationIds,
    compensationPaths = [],
    onCanvasPoint,
    pointPicking = false
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
                    cnc-viewport
                    h-full
                    w-full
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
                onClick={event => {
                    if (!pointPicking || !onCanvasPoint) return;
                    const svg = event.currentTarget;
                    const point = svg.createSVGPoint();
                    point.x = event.clientX;
                    point.y = event.clientY;
                    const matrix = svg.getScreenCTM();
                    if (!matrix) return;
                    const local = point.matrixTransform(matrix.inverse());
                    onCanvasPoint({ x: Number(local.x.toFixed(3)), y: Number(local.y.toFixed(3)) });
                }}
                style={{ cursor: pointPicking ? "crosshair" : undefined }}
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
                            stroke="var(--cnc-editor-grid)"
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

                    fill="var(--cnc-editor-background)"

                />


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

                    allowCanvasClick={
                        pointPicking
                    }

                />


                {/* =================================================
                 * CNC Bearbeitungen
                 * ================================================= */}

                <CncOperationsLayer
                    part={
                        part
                    }

                    operations={
                        operations
                    }

                    selectedOperationId={
                        selectedOperationId
                    }

                    selectedOperationIds={
                        selectedOperationIds
                    }

                    onSelectOperation={
                        onSelectOperation
                    }

                    selectedFace={
                        selectedFace
                    }

                />

                <CncCompensationLayer
                    paths={compensationPaths}
                    selectedFace={selectedFace}
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
