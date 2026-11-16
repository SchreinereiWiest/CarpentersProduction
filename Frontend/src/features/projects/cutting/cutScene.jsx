import { useEffect, useMemo, useRef, useState } from "react";

import { hasEdge } from "@Engine/nesting/helper/helpers.js";
import CncPartOverlay from "../cnc/shared/CncPartOverlay.jsx";

const STRIP_SPACING = 240;
const VIEW_PADDING = 260;
const INITIAL_VIEW_SCALE = 1.25;
const EMPTY_STRIPS = [];

const partKey = (strip, plate, itemIndex) => `${strip.id}-${plate.id ?? itemIndex}-${itemIndex}`;

function getPartRotation(strip, layout, itemLayout) {
    const { plate, width } = itemLayout;
    const originalWidth = Number(plate.originalWidth ?? plate.width) || 0;
    const inferredPartRotation = width !== originalWidth ? 90 : 0;
    const baseRotation = Number(plate.nestingRotation ?? (
        strip.packingMode === "2d"
            ? inferredPartRotation
            : layout.layoutType === "horizontal" ? 90 : inferredPartRotation
    ));
    return (baseRotation + Number(layout.rotation ?? 0)) % 180;
}

function CutPart({ entry, itemLayout, itemIndex, cncSettings, isFinished, onPointerDown }) {
    const { strip, layout, originalIndex, x: stripX } = entry;
    const { plate, x, y, width, height } = itemLayout;
    const rotation = getPartRotation(strip, layout, itemLayout);
    const edgeBottom = hasEdge(rotation === 90 ? plate.EdgeL : plate.EdgeB);
    const edgeTop = hasEdge(rotation === 90 ? plate.EdgeR : plate.EdgeT);
    const edgeLeft = hasEdge(rotation === 90 ? plate.EdgeT : plate.EdgeL);
    const edgeRight = hasEdge(rotation === 90 ? plate.EdgeB : plate.EdgeR);
    const edgeSize = Math.max(4, Math.min(20, Math.min(width, height) * 0.08));
    const key = partKey(strip, plate, itemIndex);
    const labelFits = width >= 180 && height >= 90;
    const selection = {
        key,
        stripId: strip.id,
        stripOriginalIndex: originalIndex,
        plate,
        width,
        height
    };

    return (
        <g
            data-cut-part={key}
            transform={`translate(${stripX + x} ${y})`}
            className="cursor-pointer"
            onPointerDown={event => onPointerDown(event, selection)}
        >
            <rect width={width} height={height} fill={plate.color || "#60a5fa"} />
            <CncPartOverlay plate={plate} width={width} height={height} cncSettings={cncSettings} />

            {edgeBottom && <rect data-cut-edge="bottom" x="0" y={height - edgeSize} width={width} height={edgeSize} fill="#ef07f7" pointerEvents="none" />}
            {edgeTop && <rect data-cut-edge="top" x="0" y="0" width={width} height={edgeSize} fill="#ef07f7" pointerEvents="none" />}
            {edgeLeft && <rect data-cut-edge="left" x="0" y="0" width={edgeSize} height={height} fill="#ef07f7" pointerEvents="none" />}
            {edgeRight && <rect data-cut-edge="right" x={width - edgeSize} y="0" width={edgeSize} height={height} fill="#ef07f7" pointerEvents="none" />}

            {labelFits && (
                <g pointerEvents="none" fill="#07111f" textAnchor="middle">
                    <text x={width / 2} y={height / 2 - 20} fontSize="52" fontWeight="700">
                        PID {plate.original?.PID ?? plate.id}
                    </text>
                    <text x={width / 2} y={height / 2 + 42} fontSize="38">
                        {plate.original?.Objektname ?? `${height} × ${width}`}
                    </text>
                </g>
            )}
            {isFinished && (
                <text x={width - 16} y="34" textAnchor="end" fontSize="28" fontWeight="700" fill="#064e3b" pointerEvents="none">
                    FERTIG
                </text>
            )}
        </g>
    );
}

export default function CutScene({
    stack,
    onSelectPart,
    onBackgroundClick,
    selectedPartKey,
    finishedPartKeys = new Set(),
    cncSettings
}) {
    const viewportRef = useRef(null);
    const svgRef = useRef(null);
    const touchPointsRef = useRef(new Map());
    const pinchRef = useRef(null);
    const strips = stack?.strips ?? EMPTY_STRIPS;
    const scene = useMemo(() => {
        let nextX = 0;
        const entries = strips.map(entry => {
            const positioned = { ...entry, x: nextX };
            nextX += entry.layout.placedWidth + STRIP_SPACING;
            return positioned;
        });
        return {
            entries,
            width: Math.max(1, nextX - (entries.length ? STRIP_SPACING : 0)),
            height: Math.max(1, ...entries.map(entry => entry.layout.placedHeight))
        };
    }, [strips]);
    const initialViewBox = useMemo(() => {
        const baseWidth = scene.width + VIEW_PADDING * 2;
        const baseHeight = scene.height + VIEW_PADDING * 2;
        const width = baseWidth * INITIAL_VIEW_SCALE;
        const height = baseHeight * INITIAL_VIEW_SCALE;
        return {
            x: scene.width / 2 - width / 2,
            y: scene.height / 2 - height / 2,
            width,
            height
        };
    }, [scene.height, scene.width]);
    const [viewBox, setViewBox] = useState(initialViewBox);
    const [pan, setPan] = useState(null);
    const lockedCenterY = initialViewBox.y + initialViewBox.height / 2;

    useEffect(() => {
        setViewBox(initialViewBox);
        setPan(null);
        touchPointsRef.current.clear();
        pinchRef.current = null;
    }, [initialViewBox]);

    useEffect(() => {
        const viewport = viewportRef.current;
        const svg = svgRef.current;
        if (!viewport || !svg) return undefined;

        const zoomViewport = event => {
            event.preventDefault();
            event.stopPropagation();
            const matrix = svg.getScreenCTM();
            if (!matrix) return;
            const point = svg.createSVGPoint();
            point.x = event.clientX;
            point.y = event.clientY;
            const local = point.matrixTransform(matrix.inverse());
            const factor = event.deltaY > 0 ? 1.15 : 0.87;

            setViewBox(current => {
                const minimumWidth = Math.min(300, initialViewBox.width * 0.25);
                const width = Math.min(initialViewBox.width * 4, Math.max(minimumWidth, current.width * factor));
                const height = width * current.height / current.width;
                const ratioX = (local.x - current.x) / current.width;
                return {
                    x: local.x - ratioX * width,
                    y: lockedCenterY - height / 2,
                    width,
                    height
                };
            });
        };
        const containGesture = event => {
            event.preventDefault();
            event.stopPropagation();
        };

        viewport.addEventListener("wheel", zoomViewport, { passive: false });
        viewport.addEventListener("gesturestart", containGesture, { passive: false });
        viewport.addEventListener("gesturechange", containGesture, { passive: false });
        return () => {
            viewport.removeEventListener("wheel", zoomViewport);
            viewport.removeEventListener("gesturestart", containGesture);
            viewport.removeEventListener("gesturechange", containGesture);
        };
    }, [initialViewBox.width, lockedCenterY]);

    const svgPoint = event => {
        const svg = svgRef.current;
        if (!svg) return null;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const matrix = svg.getScreenCTM();
        return matrix ? point.matrixTransform(matrix.inverse()) : null;
    };

    const beginTouchGesture = event => {
        if (event.pointerType !== "touch") return false;
        touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        svgRef.current?.setPointerCapture?.(event.pointerId);
        if (touchPointsRef.current.size < 2) return false;

        const [first, second] = [...touchPointsRef.current.values()];
        const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const local = svgPoint({ clientX: center.x, clientY: center.y });
        const screenMatrix = svgRef.current?.getScreenCTM?.();
        const screenScaleX = screenMatrix ? Math.hypot(screenMatrix.a, screenMatrix.b) : 0;
        if (!local || distance <= 0) return true;

        pinchRef.current = {
            distance,
            centerClientX: center.x,
            worldX: local.x,
            ratioX: (local.x - viewBox.x) / viewBox.width,
            screenScaleX,
            viewBox: { ...viewBox }
        };
        setPan(null);
        return true;
    };

    const updateTouchGesture = event => {
        if (event.pointerType !== "touch") return false;
        touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pinch = pinchRef.current;
        if (!pinch || touchPointsRef.current.size < 2) return false;

        const [first, second] = [...touchPointsRef.current.values()];
        const centerX = (first.x + second.x) / 2;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const minimumWidth = Math.min(300, initialViewBox.width * 0.25);
        const width = Math.min(initialViewBox.width * 4, Math.max(minimumWidth, pinch.viewBox.width * pinch.distance / Math.max(1, distance)));
        const height = width * pinch.viewBox.height / pinch.viewBox.width;
        const renderedWidth = Math.max(1, pinch.viewBox.width * (pinch.screenScaleX || 1));
        const horizontalShift = (centerX - pinch.centerClientX) * width / renderedWidth;
        setViewBox({
            x: pinch.worldX - pinch.ratioX * width - horizontalShift,
            y: lockedCenterY - height / 2,
            width,
            height
        });
        return true;
    };

    const endTouchGesture = event => {
        if (event.pointerType !== "touch") return false;
        const wasPinching = Boolean(pinchRef.current);
        touchPointsRef.current.delete(event.pointerId);
        if (touchPointsRef.current.size < 2) pinchRef.current = null;
        return wasPinching;
    };

    const startPan = (event, selection = null) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.stopPropagation();
        if (beginTouchGesture(event)) return;
        setPan({
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            viewBox,
            selection,
            moved: false
        });
        svgRef.current?.setPointerCapture?.(event.pointerId);
    };

    const move = event => {
        if (updateTouchGesture(event)) return;
        if (!pan || pan.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - pan.clientX;
        const deltaY = event.clientY - pan.clientY;
        const screenMatrix = svgRef.current?.getScreenCTM?.();
        const screenScaleX = screenMatrix ? Math.hypot(screenMatrix.a, screenMatrix.b) : 0;
        const fallbackScaleX = Math.max(1, svgRef.current?.clientWidth ?? 1) / Math.max(1, pan.viewBox.width);
        const dx = deltaX / Math.max(Number.EPSILON, screenScaleX || fallbackScaleX);
        setViewBox(current => ({ ...current, x: pan.viewBox.x - dx, y: pan.viewBox.y }));
        if (!pan.moved && Math.hypot(deltaX, deltaY) > 4) {
            setPan(current => current ? { ...current, moved: true } : current);
        }
    };

    const end = event => {
        const wasPinching = endTouchGesture(event);
        if (event.type !== "pointercancel" && !wasPinching && pan?.pointerId === event.pointerId && !pan.moved) {
            if (pan.selection) onSelectPart?.(pan.selection);
            else onBackgroundClick?.();
        }
        setPan(null);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

    const zoomCentered = factor => setViewBox(current => {
        const minimumWidth = Math.min(300, initialViewBox.width * 0.25);
        const width = Math.min(initialViewBox.width * 4, Math.max(minimumWidth, current.width * factor));
        const height = width * current.height / current.width;
        const centerX = current.x + current.width / 2;
        return { x: centerX - width / 2, y: lockedCenterY - height / 2, width, height };
    });

    return (
        <div
            ref={viewportRef}
            className="relative h-full w-full touch-none overflow-hidden overscroll-contain bg-slate-950"
            style={{ touchAction: "none" }}
        >
            <svg
                ref={svgRef}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full touch-none select-none"
                onPointerDown={event => startPan(event)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                role="img"
                aria-label="SVG-Zuschnittansicht mit Kanten und CNC-Bearbeitungen"
            >
                <defs>
                    <pattern id="cut-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e293b" strokeWidth="2" />
                    </pattern>
                </defs>
                <rect x={initialViewBox.x - initialViewBox.width * 4} y={initialViewBox.y - initialViewBox.height * 4} width={initialViewBox.width * 9} height={initialViewBox.height * 9} fill="#020617" />
                <rect x={initialViewBox.x - initialViewBox.width * 4} y={initialViewBox.y - initialViewBox.height * 4} width={initialViewBox.width * 9} height={initialViewBox.height * 9} fill="url(#cut-grid)" />

                {scene.entries.map(entry => {
                    const selected = entry.layout.items.some((item, index) => partKey(entry.strip, item.plate, index) === selectedPartKey);
                    return (
                        <g key={`${entry.strip.id ?? entry.originalIndex}-${entry.originalIndex}`} data-cut-strip="true">
                            <rect
                                data-cut-strip-background={entry.strip.id}
                                x={entry.x}
                                y="0"
                                width={entry.layout.placedWidth}
                                height={entry.layout.placedHeight}
                                fill={selected ? "#facc15" : "#16a34a"}
                            />
                            {entry.layout.items.map((itemLayout, itemIndex) => (
                                <CutPart
                                    key={`${itemLayout.plate.id ?? itemIndex}-${itemIndex}`}
                                    entry={entry}
                                    itemLayout={itemLayout}
                                    itemIndex={itemIndex}
                                    cncSettings={cncSettings}
                                    isFinished={finishedPartKeys.has(partKey(entry.strip, itemLayout.plate, itemIndex))}
                                    onPointerDown={startPan}
                                />
                            ))}
                        </g>
                    );
                })}
            </svg>

            <div className="absolute bottom-4 left-4 flex gap-1 rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-xl">
                <button type="button" onClick={() => zoomCentered(0.85)} className="rounded px-3 py-2 text-white hover:bg-slate-700" aria-label="Vergrößern">+</button>
                <button type="button" onClick={() => zoomCentered(1.15)} className="rounded px-3 py-2 text-white hover:bg-slate-700" aria-label="Verkleinern">−</button>
                <button type="button" onClick={() => setViewBox(initialViewBox)} className="rounded px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">Einpassen</button>
            </div>
        </div>
    );
}
