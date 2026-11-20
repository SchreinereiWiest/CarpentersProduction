import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DimensionLayer } from "./messures.view.jsx";
import { FrontLayer } from "./front.view.jsx";
import { InteriorLayer } from "./interiorLayer.view.jsx";
import { CarcassLayer } from "./corpus.view.jsx";
import { flattenLeafFronts, getFrontGapContext } from "@Engine/cabinet/sektions/front/frontGaps.js";

const FALLBACK_CABINET = {
    id: "fallback-cabinet",
    name: "Korpus",
    width: 600,
    height: 2000,
    depth: 580,
    thickness: 19,
    sections: [],
    fronts: []
};
const PADDING = 140;

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const FrontGapBadge = ({ x, y, label, width = 58 }) => (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <rect x={-width / 2} y={-11} width={width} height={22} rx={5} fill="#17191b" stroke="#9f6a32" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={0} y={0} dominantBaseline="middle" textAnchor="middle" fill="#f1b464" fontSize={12}>{label}</text>
    </g>
);

const getCanvasBounds = (cabinets, placements) => {
    if (cabinets.length === 0) return { x: 0, y: -720, width: 600, height: 720 };
    const boxes = cabinets.map((cabinet, index) => {
        const placement = placements?.[cabinet.id] ?? { x: index * numberOr(cabinet.width, 600), y: 0 };
        const elevation = numberOr(placement.y);
        return {
            x: numberOr(placement.x),
            y: -(elevation + numberOr(cabinet.height, 720)),
            right: numberOr(placement.x) + numberOr(cabinet.width, 600),
            bottom: -elevation
        };
    });
    const x = Math.min(...boxes.map(box => box.x));
    const y = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.right));
    const bottom = Math.max(...boxes.map(box => box.bottom));
    return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
};

export default function CabinetViewport({
    cabinet,
    cabinets,
    placements = {},
    activeCabinetId,
    selectedCabinetIds = [],
    cncConfig,
    mode = "interior",
    onSelect,
    onActivateCabinet,
    selectedElement,
    guides = [],
    selectedGuideId,
    activeGuideTool,
    onAddGuide,
    onSelectGuide,
    onUpdateGuide,
    showGrid = false
}) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const sourceCabinets = useMemo(() => {
        if (Array.isArray(cabinets)) return cabinets;
        return [cabinet ?? FALLBACK_CABINET];
    }, [cabinet, cabinets]);
    const canvasBounds = useMemo(
        () => getCanvasBounds(sourceCabinets, placements),
        [placements, sourceCabinets]
    );
    const [viewBox, setViewBox] = useState(() => ({
        x: canvasBounds.x - PADDING,
        y: canvasBounds.y - PADDING,
        width: canvasBounds.width + PADDING * 2,
        height: canvasBounds.height + PADDING * 2
    }));
    const [spacePressed, setSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panState = useRef({ active: false });
    const guideDrag = useRef(null);

    const fitCabinets = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        let width = canvasBounds.width + PADDING * 2;
        let height = canvasBounds.height + PADDING * 2;
        const viewportRatio = rect.width / rect.height;
        if (width / height < viewportRatio) width = height * viewportRatio;
        else height = width / viewportRatio;
        setViewBox({
            x: canvasBounds.x + canvasBounds.width / 2 - width / 2,
            y: canvasBounds.y + canvasBounds.height / 2 - height / 2,
            width,
            height
        });
    }, [canvasBounds]);

    useEffect(() => { fitCabinets(); }, [fitCabinets]);
    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(fitCabinets);
        observer.observe(container);
        return () => observer.disconnect();
    }, [fitCabinets]);

    useEffect(() => {
        const down = event => {
            if (event.code !== "Space" || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) return;
            event.preventDefault();
            setSpacePressed(true);
        };
        const up = event => {
            if (event.code !== "Space") return;
            setSpacePressed(false);
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    const clientToWorld = useCallback((clientX, clientY) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return null;
        return {
            x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
            y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height
        };
    }, [viewBox]);

    const handleWheel = useCallback(event => {
        event.preventDefault();
        const point = clientToWorld(event.clientX, event.clientY);
        if (!point) return;
        const factor = event.deltaY < 0 ? 0.85 : 1.15;
        const width = Math.max(80, Math.min(30000, viewBox.width * factor));
        const height = viewBox.height * (width / viewBox.width);
        const ratioX = (point.x - viewBox.x) / viewBox.width;
        const ratioY = (point.y - viewBox.y) / viewBox.height;
        setViewBox({
            x: point.x - ratioX * width,
            y: point.y - ratioY * height,
            width,
            height
        });
    }, [clientToWorld, viewBox]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;
        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const handlePointerDown = event => {
        const shouldPan = event.button === 1 || (event.button === 0 && spacePressed);
        if (!shouldPan) return;
        event.preventDefault();
        panState.current = {
            active: true,
            x: event.clientX,
            y: event.clientY,
            viewX: viewBox.x,
            viewY: viewBox.y
        };
        setIsPanning(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = event => {
        if (guideDrag.current) {
            const point = clientToWorld(event.clientX, event.clientY);
            if (point) {
                const position = guideDrag.current.orientation === "horizontal" ? -point.y : point.x;
                onUpdateGuide?.(guideDrag.current.id, { position, expression: String(Math.round(position * 10) / 10) });
            }
            return;
        }
        if (!panState.current.active) return;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (event.clientX - panState.current.x) * viewBox.width / rect.width;
        const dy = (event.clientY - panState.current.y) * viewBox.height / rect.height;
        setViewBox(current => ({
            ...current,
            x: panState.current.viewX - dx,
            y: panState.current.viewY - dy
        }));
    };

    const handlePointerUp = event => {
        panState.current.active = false;
        setIsPanning(false);
        guideDrag.current = null;
        try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
    };

    const visibleGuides = guides.filter(guide => {
        if (mode === "combined") return true;
        return guide.layer === "dual" || guide.layer === (mode === "front" ? "front" : "interior");
    });
    const frontGapLabels = useMemo(() => {
        if (mode !== "front" && mode !== "combined") return [];
        return sourceCabinets.flatMap((current, index) => {
            const placement = placements[current.id] ?? { x: index * numberOr(current.width, 600), y: 0 };
            const cabinetX = numberOr(placement.x);
            const elevation = numberOr(placement.y);
            const cabinetTop = -(elevation + numberOr(current.height));
            return flattenLeafFronts(current.fronts ?? []).map(front => {
                const context = getFrontGapContext(current.fronts, front.id, current);
                const x = cabinetX + numberOr(front.x);
                const y = cabinetTop + numberOr(front.y);
                const width = numberOr(front.width);
                const height = numberOr(front.height);
                return {
                    id: `${current.id}:${front.id}`,
                    left: { x: x + 34, y: y + height / 2, label: `L ${numberOr(context?.gaps.left)} mm` },
                    right: { x: x + width - 34, y: y + height / 2, label: `R ${numberOr(context?.gaps.right)} mm` },
                    top: { x: x + width / 2, y: y + 18, label: `O ${numberOr(context?.gaps.top)} mm` },
                    bottom: { x: x + width / 2, y: y + height - 18, label: `U ${numberOr(context?.gaps.bottom)} mm` }
                };
            });
        });
    }, [mode, placements, sourceCabinets]);
    const cursor = activeGuideTool ? "crosshair" : isPanning ? "grabbing" : spacePressed ? "grab" : "default";

    return (
        <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#111315]">
            <button
                type="button"
                onClick={fitCabinets}
                className="absolute bottom-3 right-3 z-20 rounded-md border border-white/10 bg-[#1d2023]/95 px-3 py-2 text-xs text-gray-300 shadow-lg hover:border-amber-500/50 hover:text-white"
            >
                Alle einpassen
            </button>
            <svg
                ref={svgRef}
                className="h-full w-full"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ cursor, touchAction: "none", userSelect: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={event => event.preventDefault()}
                onClick={event => {
                    if (activeGuideTool) {
                        const point = clientToWorld(event.clientX, event.clientY);
                        if (point) onAddGuide?.({
                            orientation: activeGuideTool.orientation,
                            position: activeGuideTool.orientation === "horizontal" ? -point.y : point.x,
                            layer: activeGuideTool.layer
                        });
                        return;
                    }
                    onSelect?.(null);
                    onSelectGuide?.(null);
                }}
            >
                <defs>
                    <pattern id="cabinet-page-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#25292d" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.width + 2000} height={viewBox.height + 2000} fill="#111315" />
                {showGrid && <rect x={viewBox.x - 1000} y={viewBox.y - 1000} width={viewBox.width + 2000} height={viewBox.height + 2000} fill="url(#cabinet-page-grid)" />}
                <line x1={viewBox.x} y1={0} x2={viewBox.x + viewBox.width} y2={0} stroke="#50555a" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

                {sourceCabinets.map((currentCabinet, index) => {
                    const placement = placements[currentCabinet.id] ?? {
                        x: index * numberOr(currentCabinet.width, 600),
                        y: 0
                    };
                    const active = currentCabinet.id === (activeCabinetId ?? cabinet?.id);
                    const multiSelected = selectedCabinetIds.includes(currentCabinet.id);
                    const materialColor = active ? "#a96932" : multiSelected ? "#496f78" : "#4B5563";
                    const interiorColor = active ? "#4a2f20" : multiSelected ? "#233b42" : "#1F2937";
                    const localSelected = selectedElement?.cabinetId === currentCabinet.id ? selectedElement : null;
                    const selectFromCabinet = element => {
                        onActivateCabinet?.(currentCabinet.id);
                        onSelect?.(element ? { ...element, cabinetId: currentCabinet.id } : null);
                    };
                    return (
                        <g
                            key={currentCabinet.id}
                            transform={`translate(${numberOr(placement.x)} ${-(numberOr(placement.y) + numberOr(currentCabinet.height))})`}
                            onClick={event => {
                                if (activeGuideTool) return;
                                if (event.target === event.currentTarget || event.target?.dataset?.elementType === "carcass") {
                                    event.stopPropagation();
                                    selectFromCabinet(null);
                                }
                            }}
                        >
                            <g pointerEvents={activeGuideTool ? "none" : "auto"}>
                                <CarcassLayer cabinet={currentCabinet} materialColor={materialColor} interiorColor={interiorColor} />
                                {(mode === "interior" || mode === "combined") && (
                                    <InteriorLayer
                                        cabinet={currentCabinet}
                                        cncConfig={cncConfig}
                                        selectedElement={localSelected}
                                        onSelect={selectFromCabinet}
                                        materialColor={materialColor}
                                    />
                                )}
                                {(mode === "front" || mode === "combined") && (
                                    <FrontLayer
                                        cabinet={currentCabinet}
                                        cncConfig={cncConfig}
                                        selectedElement={localSelected}
                                        onSelect={selectFromCabinet}
                                        opacity={mode === "combined" ? 0.38 : active ? 0.84 : 1}
                                        showBackground={mode !== "combined"}
                                        backgroundColor={active || multiSelected ? materialColor : "#171717"}
                                        showMachining={mode === "combined"}
                                        machiningOpacity={0.7}
                                    />
                                )}
                            </g>
                            {active && <DimensionLayer cabinet={currentCabinet} />}
                            <g transform={`translate(${numberOr(currentCabinet.width) / 2} -52)`} pointerEvents="none">
                                <rect x={-70} y={0} width={140} height={38} rx={8} fill="#191c1f" stroke={active ? "#d98a37" : "#51565c"} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                                <text x={0} y={20} textAnchor="middle" dominantBaseline="middle" fill={active ? "#f6bd78" : "#d1d5db"} fontSize={18}>{currentCabinet.name}</text>
                            </g>
                        </g>
                    );
                })}

                {frontGapLabels.map(labels => (
                    <g key={`front-gaps:${labels.id}`}>
                        <FrontGapBadge {...labels.left} />
                        <FrontGapBadge {...labels.right} />
                        <FrontGapBadge {...labels.top} />
                        <FrontGapBadge {...labels.bottom} />
                    </g>
                ))}

                {visibleGuides.map(guide => {
                    const selected = guide.id === selectedGuideId;
                    const color = guide.hidden ? "#7b8087" : guide.layer === "front" ? "#e9a24b" : guide.layer === "dual" ? "#b48bea" : "#67b7c7";
                    const horizontal = guide.orientation === "horizontal";
                    const displayPosition = horizontal ? -numberOr(guide.position) : numberOr(guide.position);
                    return (
                        <g
                            key={guide.id}
                            opacity={guide.hidden ? 0.38 : 1}
                            onPointerDown={event => {
                                event.stopPropagation();
                                guideDrag.current = guide;
                                onSelectGuide?.(guide.id);
                                event.currentTarget.setPointerCapture?.(event.pointerId);
                            }}
                            onClick={event => event.stopPropagation()}
                            style={{ cursor: horizontal ? "ns-resize" : "ew-resize" }}
                        >
                            <line
                                x1={horizontal ? viewBox.x : displayPosition}
                                y1={horizontal ? displayPosition : viewBox.y}
                                x2={horizontal ? viewBox.x + viewBox.width : displayPosition}
                                y2={horizontal ? displayPosition : viewBox.y + viewBox.height}
                                stroke="transparent"
                                strokeWidth={14}
                                vectorEffect="non-scaling-stroke"
                            />
                            <line
                                x1={horizontal ? viewBox.x : displayPosition}
                                y1={horizontal ? displayPosition : viewBox.y}
                                x2={horizontal ? viewBox.x + viewBox.width : displayPosition}
                                y2={horizontal ? displayPosition : viewBox.y + viewBox.height}
                                stroke={color}
                                strokeWidth={selected ? 3 : 1.5}
                                strokeDasharray={guide.layer === "front" ? "10 6" : guide.layer === "dual" ? "12 4 3 4" : "4 5"}
                                vectorEffect="non-scaling-stroke"
                            />
                            <text
                                x={horizontal ? viewBox.x + 18 : displayPosition + 12}
                                y={horizontal ? displayPosition - 10 : viewBox.y + 28}
                                fill={color}
                                fontSize={15}
                                fontWeight={selected ? 700 : 500}
                            >
                                {guide.name} · {Math.round(numberOr(guide.position) * 10) / 10} mm
                            </text>
                        </g>
                    );
                })}

                {activeGuideTool && (
                    <rect
                        x={viewBox.x}
                        y={viewBox.y}
                        width={viewBox.width}
                        height={viewBox.height}
                        fill="transparent"
                    />
                )}
            </svg>
        </div>
    );
}
