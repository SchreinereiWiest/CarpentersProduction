export default function CncPartsLayer({
    part,
    selected = true,
    onSelect
}) {

    if (!part) {
        return null;
    }

    const width =
        Number(part.L);

    const height =
        Number(part.B);


    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        return null;
    }


    return (
        <g>

            {/* Bauteil */}

            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={1}
                fill="var(--cnc-part-fill)"
                stroke={
                    selected
                        ? "var(--cnc-part-stroke-selected)"
                        : "var(--cnc-part-stroke)"
                }
                strokeWidth={2}
                onClick={(event) => {

                    event.stopPropagation();

                    onSelect?.(part);

                }}
            />


            {/* horizontale Mittellinie */}

            <line
                x1={0}
                y1={height / 2}
                x2={width}
                y2={height / 2}
                stroke="var(--cnc-part-guide)"
                strokeWidth={0.5}
                strokeDasharray="8 8"
                pointerEvents="none"
            />


            {/* vertikale Mittellinie */}

            <line
                x1={width / 2}
                y1={0}
                x2={width / 2}
                y2={height}
                stroke="var(--cnc-part-guide)"
                strokeWidth={0.5}
                strokeDasharray="8 8"
                pointerEvents="none"
            />

        </g>
    );
}
