import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { findNearestFreeSpace, getStripLayout } from "@Engine/nesting/placement/manualStripPlacement.js";
import { createEmptyNestingPlate } from "@Engine/nesting/placement/nestingPlate.js";
import CncPartOverlay from "../cnc/shared/CncPartOverlay.jsx";

const pointIn = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
const INITIAL_VIEW_SCALE = 1.25;

function SvgPart({ item, strip, offsetX, cncSettings, onPointerDown }) {
  const { plate, x, y, width, height } = item;
  const left = strip.x + x + offsetX;
  const top = strip.y + y;
  const labelFits = width >= 180 && height >= 90;
  return <g transform={`translate(${left} ${top})`} onPointerDown={event => onPointerDown(event, strip, plate)} className="cursor-pointer">
    <rect data-nesting-part={plate.id} width={width} height={height} fill={plate.color || "#60a5fa"} />
    <CncPartOverlay plate={plate} width={width} height={height} cncSettings={cncSettings} />
    {labelFits && <g pointerEvents="none" fill="#07111f" textAnchor="middle"><text x={width / 2} y={height / 2 - 20} fontSize="52" fontWeight="700">PID {plate.original?.PID ?? plate.id}</text><text x={width / 2} y={height / 2 + 42} fontSize="38">{plate.original?.Objektname ?? "Bauteil"}</text></g>}
  </g>;
}

export default function NestingScene({ result, setActiveStrip, activeStrip, onSelectPart, settings, cncSettings, onRemoveStrip, onPlaceStrip, onInvalidPlacement }) {
  const viewportRef = useRef(null);
  const svgRef = useRef(null);
  const touchPointsRef = useRef(new Map());
  const pinchRef = useRef(null);
  const initialFitAppliedRef = useRef(false);
  const [drag, setDrag] = useState(null);
  const sheetOffset = settings.sheetOffset ?? 3000;
  const margin = Number(settings.margin) || 0;
  const emptyStrips = result?.emptyStrips ?? [];

  const pool = useMemo(() => {
    if (!result) return { strips: [], baseY: -300, minY: -500, maxX: 1000 };
    const layouts = emptyStrips.map(strip => ({ strip, layout: getStripLayout(strip, settings) }));
    const maxWidth = Math.max(settings.defaultSheet?.width ?? 2800, ...result.nestingPlates.map(plate => plate.placedWidth ?? plate.width ?? 0));
    const rowWidth = Math.max(maxWidth * 2, sheetOffset * 2);
    const maxHeight = Math.max(0, ...layouts.map(item => item.layout.placedHeight));
    const baseY = -maxHeight - 300;
    let x = 0;
    let y = baseY;
    let rowHeight = 0;
    const strips = layouts.map(({ strip, layout }) => {
      if (x > 0 && x + layout.placedWidth > rowWidth) { x = 0; y -= rowHeight + 160; rowHeight = 0; }
      const display = { ...strip, x, y, sheet: 0, placedWidth: layout.placedWidth, placedHeight: layout.placedHeight };
      x += layout.placedWidth + 160;
      rowHeight = Math.max(rowHeight, layout.placedHeight);
      return { strip: display, layout };
    });
    const maxPoolX = Math.max(maxWidth, ...strips.map(item => item.strip.x + item.strip.placedWidth));
    return { strips, baseY, minY: Math.min(baseY, ...strips.map(item => item.strip.y)) - 220, maxX: maxPoolX };
  }, [emptyStrips, result, settings, sheetOffset]);

  const initialViewBox = useMemo(() => {
    if (!result) return { x: 0, y: 0, width: 1000, height: 700 };
    const minX = -margin;
    const maxX = Math.max(pool.maxX, settings.defaultSheet?.width ?? 2800, ...result.nestingPlates.map(plate => plate.id * sheetOffset + plate.placedWidth));
    const minY = Math.min(pool.minY, -margin);
    const maxY = Math.max(settings.defaultSheet?.height ?? 2070, ...result.nestingPlates.map(plate => plate.placedHeight));
    const padding = 260;
    const baseWidth = maxX - minX + padding * 2;
    const baseHeight = maxY - minY + padding * 2;
    const width = baseWidth * INITIAL_VIEW_SCALE;
    const height = baseHeight * INITIAL_VIEW_SCALE;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height
    };
  }, [margin, pool.maxX, pool.minY, result, settings.defaultSheet, sheetOffset]);
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [pan, setPan] = useState(null);
  const lockedCenterY = initialViewBox.y + initialViewBox.height / 2;

  useLayoutEffect(() => {
    if (!result || initialFitAppliedRef.current) return;
    setViewBox(initialViewBox);
    initialFitAppliedRef.current = true;
  }, [initialViewBox, result]);

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
        const width = Math.min(initialViewBox.width * 4, Math.max(300, current.width * factor));
        const height = width * current.height / current.width;
        const px = (local.x - current.x) / current.width;
        return { x: local.x - px * width, y: lockedCenterY - height / 2, width, height };
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

  if (!result) return null;

  const svgPoint = event => {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : null;
  };
  const plateRect = plate => ({ x: plate.id * sheetOffset - margin, y: -margin, width: plate.placedWidth, height: plate.placedHeight });
  const isOutside = point => !result.nestingPlates.some(plate => pointIn(point, plateRect(plate)));
  const targetAt = point => {
    const existing = result.nestingPlates.find(plate => pointIn(point, plateRect(plate)));
    if (existing) return { nestingPlate: existing, isNew: false };
    const last = [...result.nestingPlates].sort((a, b) => b.id - a.id)[0];
    const lastRect = last ? plateRect(last) : null;
    if (!last || point.x <= lastRect.x + lastRect.width || point.y < -margin || point.y > -margin + last.placedHeight) return null;
    const id = Math.max(...result.nestingPlates.map(plate => plate.id)) + 1;
    return { nestingPlate: createEmptyNestingPlate(settings.defaultSheet, settings, id), isNew: true };
  };
  const snapPool = (strip, desired, pointer, force = false) => {
    const target = targetAt(pointer);
    if (!target) return null;
    const offset = target.nestingPlate.id * sheetOffset;
    const nearest = findNearestFreeSpace(target.nestingPlate, strip, { x: desired.x - offset, y: desired.y }, settings.cutGap);
    if (!nearest) return null;
    if (!force && nearest.distanceSquared > (settings.snapDistance ?? 120) ** 2) return { ...target, position: desired };
    return { ...target, position: { x: nearest.x + offset, y: nearest.y } };
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
    if (!local || distance <= 0) return true;

    pinchRef.current = {
      distance,
      centerClientX: center.x,
      worldX: local.x,
      ratioX: (local.x - viewBox.x) / viewBox.width,
      viewBox: { ...viewBox }
    };
    setDrag(null);
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
    const width = Math.min(initialViewBox.width * 4, Math.max(300, pinch.viewBox.width * pinch.distance / Math.max(1, distance)));
    const height = width * pinch.viewBox.height / pinch.viewBox.width;
    const horizontalShift = (centerX - pinch.centerClientX) * width / Math.max(1, svgRef.current?.clientWidth ?? 1);
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

  const startStripDrag = (event, strip, plate = null, isPool = false) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.stopPropagation();
    if (beginTouchGesture(event)) return;
    const point = svgPoint(event);
    if (!point) return;
    setActiveStrip(strip);
    if (plate) onSelectPart?.({ plate, strip });
    setDrag({ strip, isPool, start: point, delta: { x: 0, y: 0 } });
    svgRef.current?.setPointerCapture?.(event.pointerId);
  };
  const move = event => {
    if (updateTouchGesture(event)) return;
    if (drag) {
      const point = svgPoint(event);
      if (!point) return;
      const raw = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      if (drag.isPool) {
        const desired = { x: drag.strip.x + raw.x, y: drag.strip.y + raw.y };
        const snapped = snapPool(drag.strip, desired, point)?.position ?? desired;
        setDrag(current => ({ ...current, pointer: point, delta: { x: snapped.x - drag.strip.x, y: snapped.y - drag.strip.y }, raw }));
      } else setDrag(current => ({ ...current, pointer: point, delta: raw, raw }));
      return;
    }
    if (pan) {
      const screenMatrix = svgRef.current?.getScreenCTM?.();
      const screenScaleX = screenMatrix ? Math.hypot(screenMatrix.a, screenMatrix.b) : 0;
      const fallbackScaleX = Math.max(1, svgRef.current?.clientWidth ?? 1) / Math.max(1, pan.viewBox.width);
      const dx = (event.clientX - pan.clientX) / Math.max(Number.EPSILON, screenScaleX || fallbackScaleX);
      setViewBox(current => ({ ...current, x: pan.viewBox.x - dx, y: pan.viewBox.y }));
    }
  };
  const end = event => {
    if (endTouchGesture(event)) {
      setDrag(null);
      setPan(null);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (drag) {
      const point = svgPoint(event) ?? drag.pointer;
      if (drag.isPool && point) {
        const raw = drag.raw ?? drag.delta;
        const target = snapPool(drag.strip, { x: drag.strip.x + raw.x, y: drag.strip.y + raw.y }, point, true);
        if (!target) onInvalidPlacement?.();
        else { const offset = target.nestingPlate.id * sheetOffset; onPlaceStrip?.(drag.strip.id, { sheet: target.nestingPlate.id, x: target.position.x - offset, y: target.position.y, createNewPlate: target.isNew }); }
      } else if (point && isOutside(point)) onRemoveStrip?.(drag.strip);
      setDrag(null);
    }
    setPan(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const startPan = event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (beginTouchGesture(event)) return;
    if (event.target.closest?.("[data-nesting-strip]")) return;
    setPan({ clientX: event.clientX, clientY: event.clientY, viewBox });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const stripTransform = (strip, isPool) => !drag || String(drag.strip.id) !== String(strip.id) || Boolean(drag.isPool) !== Boolean(isPool) ? "" : `translate(${drag.delta.x} ${drag.delta.y})`;
  const zoomCentered = factor => setViewBox(current => {
    const width = Math.min(initialViewBox.width * 4, Math.max(300, current.width * factor));
    const height = width * current.height / current.width;
    const centerX = current.x + current.width / 2;
    return { x: centerX - width / 2, y: lockedCenterY - height / 2, width, height };
  });
  const renderStrip = (strip, layout, isPool = false) => {
    const offsetX = isPool ? 0 : strip.sheet * sheetOffset;
    const selected = String(activeStrip?.id ?? "") === String(strip.id);
    return <g key={`${isPool ? "pool" : strip.sheet}-${strip.id}`} data-nesting-strip="true" transform={stripTransform(strip, isPool)}>
      <rect data-nesting-strip-background={strip.id} x={strip.x + offsetX} y={strip.y} width={strip.placedWidth} height={strip.placedHeight} fill={selected ? "#facc15" : "#16a34a"} onPointerDown={event => startStripDrag(event, strip, null, isPool)} />
      {layout.items.map((item, index) => <SvgPart key={item.plate.id ?? index} item={item} strip={strip} offsetX={offsetX} cncSettings={cncSettings} onPointerDown={(event, _strip, plate) => startStripDrag(event, strip, plate, isPool)} />)}
    </g>;
  };

  return <div ref={viewportRef} className="relative h-full w-full touch-none overflow-hidden overscroll-contain bg-slate-950" style={{ touchAction: "none" }}>
    <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full touch-none select-none" onPointerDown={startPan} onPointerMove={move} onPointerUp={end} onPointerCancel={end} role="img" aria-label="SVG-Nesting mit CNC-Bearbeitungen">
      <defs><pattern id="nesting-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e293b" strokeWidth="2" /></pattern></defs>
      <rect x={initialViewBox.x - initialViewBox.width * 4} y={initialViewBox.y - initialViewBox.height * 4} width={initialViewBox.width * 9} height={initialViewBox.height * 9} fill="#020617" />
      <rect x={initialViewBox.x - initialViewBox.width * 4} y={initialViewBox.y - initialViewBox.height * 4} width={initialViewBox.width * 9} height={initialViewBox.height * 9} fill="url(#nesting-grid)" />
      {result.nestingPlates.map(sheet => <g key={`sheet-${sheet.id}`}><rect {...plateRect(sheet)} fill="#7f1d1d" stroke="#b91c1c" strokeWidth="5" vectorEffect="non-scaling-stroke" /><text x={plateRect(sheet).x + 40} y={plateRect(sheet).y + 80} fill="#fecaca" fontSize="62">Platte {sheet.id + 1}</text>{(sheet.freeSpaces ?? []).map((space, index) => <rect data-unused-space="true" key={index} x={space.x + sheet.id * sheetOffset} y={space.y} width={space.width} height={space.height} fill="#ef4444" opacity="0.62" />)}</g>)}
      {result.strips.map(strip => renderStrip(strip, getStripLayout(strip, settings)))}
      <text x="0" y={pool.baseY - 120} fill="#cbd5e1" fontSize="76" fontWeight="600">{settings.nestingMode === "2d" ? "Bauteil-Pool" : "Strip-Pool"}</text>
      {pool.strips.map(({ strip, layout }) => renderStrip(strip, layout, true))}
    </svg>
    <div className="absolute bottom-4 left-4 flex gap-1 rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-xl"><button type="button" onClick={() => zoomCentered(0.85)} className="rounded px-3 py-2 text-white hover:bg-slate-700" aria-label="Vergrößern">+</button><button type="button" onClick={() => zoomCentered(1.15)} className="rounded px-3 py-2 text-white hover:bg-slate-700" aria-label="Verkleinern">−</button><button type="button" onClick={() => setViewBox(initialViewBox)} className="rounded px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">Einpassen</button></div>
  </div>;
}
