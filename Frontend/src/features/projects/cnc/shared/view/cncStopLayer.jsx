export default function CncStopLayer({ partWidth, header }) {
    if (!header) return null;
    const right = header.anchorCorner === "top-right";
    const x = right ? partWidth : 0;
    const direction = right ? 1 : -1;

    return (
        <g pointerEvents="none" aria-label={`Anschlag ${header.stopLabel}`}>
            <circle cx={x} cy={-11} r="4.5" fill="var(--cnc-operation-selected)" stroke="var(--cnc-operation-selected-stroke)" strokeWidth="1.5" />
            <circle cx={x + direction * 11} cy={0} r="4.5" fill="var(--cnc-operation-selected)" stroke="var(--cnc-operation-selected-stroke)" strokeWidth="1.5" />
            <text x={x + direction * 18} y={-15} textAnchor={right ? "end" : "start"} fill="var(--cnc-dimension-text)" fontSize="12" fontWeight="600">
                {header.stopLabel}
            </text>
        </g>
    );
}
