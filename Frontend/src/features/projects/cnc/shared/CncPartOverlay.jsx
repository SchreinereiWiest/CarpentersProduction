import { useMemo } from "react";

import { translatePartForCncViewer } from "@Engine/postprocessor/index.js";
import CncOperationsLayer from "./cncOperationLayer.jsx";

export default function CncPartOverlay({ plate, width, height, cncSettings }) {
    const sourcePart = plate?.original;
    const resolvedPart = useMemo(() => {
        if (!sourcePart) return null;
        const active = cncSettings?.postprocessors?.find(item => item.id === cncSettings.activePostprocessorId)
            ?? cncSettings?.postprocessors?.find(item => item.enabled !== false);
        if (!active) return sourcePart;

        try {
            const result = translatePartForCncViewer(active, {
                part: sourcePart,
                assignments: cncSettings?.cncDefault?.machiningAssignments
            });
            return {
                ...sourcePart,
                CNC: { ...(sourcePart.CNC ?? {}), operations: result.operations ?? [] }
            };
        } catch {
            return sourcePart;
        }
    }, [cncSettings, sourcePart]);

    const operations = resolvedPart?.CNC?.operations ?? [];
    if (!resolvedPart || !operations.length) return null;

    const sourceWidth = Math.max(1, Number(resolvedPart.L) || Number(plate.originalHeight) || height);
    const sourceHeight = Math.max(1, Number(resolvedPart.B) || Number(plate.originalWidth) || width);
    const directDifference = Math.abs(width - sourceWidth) + Math.abs(height - sourceHeight);
    const rotatedDifference = Math.abs(width - sourceHeight) + Math.abs(height - sourceWidth);
    const transform = directDifference <= rotatedDifference
        ? `scale(${width / sourceWidth} ${height / sourceHeight})`
        : `translate(${width} 0) rotate(90) scale(${height / sourceWidth} ${width / sourceHeight})`;

    return (
        <g data-cnc-part-overlay="true" transform={transform} pointerEvents="none">
            <g style={{ "--cnc-operation-fill": "#0f172a", "--cnc-operation-stroke": "#f8fafc", "--cnc-operation-path": "#0f172a" }}>
                <CncOperationsLayer part={resolvedPart} operations={operations} selectedFace="A" />
            </g>
            <g opacity="0.7" style={{ "--cnc-operation-fill": "#7e22ce", "--cnc-operation-stroke": "#f5d0fe", "--cnc-operation-path": "#7e22ce" }}>
                <CncOperationsLayer part={resolvedPart} operations={operations.filter(operation => operation.face === "B")} selectedFace="B" />
            </g>
        </g>
    );
}
