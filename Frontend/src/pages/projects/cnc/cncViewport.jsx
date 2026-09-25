import CncPartsLayer from "./view/cncPartsLayer";
import CncOperationsLayer from "./cncOperationLayer";

export default function CncViewport({
    part,
    selectedOperationId,
    onSelectOperation,
    onSelectPart
}) {

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

    // --------------------------------------------
    // Darstellung:
    //
    // L = horizontal
    // B = vertikal
    // --------------------------------------------

    const width =
        Number(part.L) || 600;

    const height =
        Number(part.B) || 600;

    const padding = 100;


    return (
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

            {/* ========================================= */}
            {/* Grid */}
            {/* ========================================= */}

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


            {/* ========================================= */}
            {/* Bauteil */}
            {/* ========================================= */}

            <CncPartsLayer
                part={part}
                onSelect={onSelectPart}
            />


            {/* ========================================= */}
            {/* CNC Bearbeitungen */}
            {/* ========================================= */}

            <CncOperationsLayer
                part={part}
                selectedOperationId={
                    selectedOperationId
                }
                onSelectOperation={
                    onSelectOperation
                }
            />

        </svg>
    );
}