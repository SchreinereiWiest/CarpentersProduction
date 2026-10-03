import { useState } from "react";
import CncPartsLayer from "./view/cncPartsLayer";
import CncOperationsLayer from "./cncOperationLayer";

export default function CncViewport({
    part,
    selectedOperationId,
    onSelectOperation,
    onSelectPart
}) {

    const [
        selectedFace,
        setSelectedFace
    ] = useState("A");


    if (!part) {

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


    /*
     * ------------------------------------------------------------
     * Geometrie
     * ------------------------------------------------------------
     *
     * L = horizontal
     * B = vertikal
     */

    const width =
        Number(part.L) || 600;

    const height =
        Number(part.B) || 600;

    const padding = 100;


    /*
     * ------------------------------------------------------------
     * Anzahl Operationen pro Seite
     * ------------------------------------------------------------
     */

    const operations =
        Array.isArray(
            part.CNC?.operations
        )
            ? part.CNC.operations
            : [];


    const faceAOperations =
        operations.filter(
            operation =>
                (operation.face ?? "A") === "A"
        );


    const faceBOperations =
        operations.filter(
            operation =>
                (operation.face ?? "A") === "B"
        );


    return (
        <div className="relative h-full w-full">

            {/* =================================================
                Seitenumschaltung
                ================================================= */}

            <div className="
                absolute
                top-3
                left-3
                z-10
                flex
                gap-1
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                p-1
            ">

                <button
                    type="button"
                    onClick={() =>
                        setSelectedFace("A")
                    }
                    className={`
                        rounded px-3 py-1.5
                        text-xs font-medium
                        transition
                        ${
                            selectedFace === "A"
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:bg-gray-800"
                        }
                    `}
                >
                    Seite A
                    <span className="ml-1 text-gray-400">
                        ({faceAOperations.length})
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() =>
                        setSelectedFace("B")
                    }
                    className={`
                        rounded px-3 py-1.5
                        text-xs font-medium
                        transition
                        ${
                            selectedFace === "B"
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:bg-gray-800"
                        }
                    `}
                >
                    Seite B
                    <span className="ml-1 text-gray-400">
                        ({faceBOperations.length})
                    </span>
                </button>

            </div>


            {/* =================================================
                SVG
                ================================================= */}

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
                preserveAspectRatio="xMidYMid meet"
            >

                {/* =============================================
                    Grid
                    ============================================= */}

                <defs>

                    <pattern
                        id="cnc-grid"
                        width="50"
                        height="50"
                        patternUnits="userSpaceOnUse"
                    >

                        <path
                            d="M 50 0 L 0 0 0 50"
                            fill="none"
                            stroke="rgb(31 41 55)"
                            strokeWidth="0.5"
                        />

                    </pattern>

                </defs>


                <rect
                    x={-padding}
                    y={-padding}
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


                {/* =============================================
                    Bauteil
                    ============================================= */}

                <CncPartsLayer
                    part={part}
                    onSelect={onSelectPart}
                />


                {/* =============================================
                    CNC
                    ============================================= */}

                <CncOperationsLayer
                    part={part}
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

            </svg>

        </div>
    );
}