import { useEffect, useMemo, useRef, useState } from "react";
import AufmasIcon from "../common/AufmasIcon.jsx";
import {
  applyDxfTransform,
  createDxfTransform,
  dxfTransformToSvg,
  IDENTITY_DXF_TRANSFORM
} from "../../domain/alignment.js";
import { derivePdfSnapPoints } from "../../import/pdfSnap.js";
import {
  clampCanvasPan,
  getPlacedObjectSnapPoints,
  panForPinchAnchor,
  rectangleFromPoints
} from "../../domain/geometry.js";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createEditorObjectId,
  FALLBACK_SEGMENTS,
  uniqueSegmentPoints
} from "./editorConfig.js";
import MeasurementGraphic from "./MeasurementGraphic.jsx";

export default function AufmasEditor({
  view,
  objects,
  selectedId,
  onSelect,
  activeTool,
  onCreate,
  display,
  dxf,
  planPage,
  onImportPdf,
  onImportDxf,
  onUpdateView,
  importing,
  readOnly = false
}) {
  const svgRef = useRef(null);
  const panDragRef = useRef(null);
  const primaryPointerRef = useRef(null);
  const touchPointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const [draft, setDraft] = useState([]);
  const [pointer, setPointer] = useState(null);
  const [hoverSnap, setHoverSnap] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [panning, setPanning] = useState(false);
  const [calibration, setCalibration] = useState(null);
  const [derivingPdf, setDerivingPdf] = useState(false);
  const [pdfDerivationMessage, setPdfDerivationMessage] = useState("");

  const hasPlan = Boolean(planPage?.dataUrl);
  const hasDxf = Boolean(dxf?.shapes?.length);
  const drawingShapes = hasDxf ? dxf.shapes : !hasPlan ? FALLBACK_SEGMENTS : [];
  const dxfTransform = hasDxf
    ? (view.dxfTransform ?? IDENTITY_DXF_TRANSFORM)
    : IDENTITY_DXF_TRANSFORM;
  const fallbackSnapPoints =
    !hasDxf && !hasPlan ? uniqueSegmentPoints(FALLBACK_SEGMENTS) : [];
  const dxfSnapPoints = useMemo(
    () =>
      hasDxf
        ? dxf.snapPoints.map((point) => applyDxfTransform(point, dxfTransform))
        : [],
    [dxf.snapPoints, dxfTransform, hasDxf]
  );
  const pdfSnapPoints = view.pdfSnapPoints ?? [];
  const placedObjectSnapPoints = useMemo(
    () => getPlacedObjectSnapPoints(objects),
    [objects]
  );
  const snapPoints = useMemo(
    () => [
      ...dxfSnapPoints,
      ...pdfSnapPoints,
      ...fallbackSnapPoints,
      ...placedObjectSnapPoints
    ],
    [dxfSnapPoints, fallbackSnapPoints, pdfSnapPoints, placedObjectSnapPoints]
  );
  const transformedReferencePoints = useMemo(
    () =>
      (dxf.referencePoints ?? []).map((point, index) => ({
        ...applyDxfTransform(point, dxfTransform),
        sourceIndex: index
      })),
    [dxf.referencePoints, dxfTransform]
  );
  const visibleWidth = CANVAS_WIDTH / zoom;
  const visibleHeight = CANVAS_HEIGHT / zoom;
  const viewBox = `${(CANVAS_WIDTH - visibleWidth) / 2 + pan.x} ${(CANVAS_HEIGHT - visibleHeight) / 2 + pan.y} ${visibleWidth} ${visibleHeight}`;
  const drawingPath = useMemo(
    () =>
      drawingShapes
        .map((shape) => {
          if (shape.type === "circle") {
            return `M ${shape.cx + shape.radius} ${shape.cy} a ${shape.radius} ${shape.radius} 0 1 0 ${-2 * shape.radius} 0 a ${shape.radius} ${shape.radius} 0 1 0 ${2 * shape.radius} 0`;
          }
          return `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`;
        })
        .join(" "),
    [drawingShapes]
  );
  const dxfSnapPointPath = useMemo(
    () =>
      dxfSnapPoints
        .map(
          (point) =>
            `M ${point.x - 4} ${point.y} a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`
        )
        .join(" "),
    [dxfSnapPoints]
  );
  const pdfSnapPointPath = useMemo(
    () =>
      [...pdfSnapPoints, ...fallbackSnapPoints]
        .map(
          (point) =>
            `M ${point.x - 4} ${point.y} a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`
        )
        .join(" "),
    [fallbackSnapPoints, pdfSnapPoints]
  );
  const placedPointPath = useMemo(
    () =>
      placedObjectSnapPoints
        .map(
          (point) =>
            `M ${point.x - 5} ${point.y} a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0`
        )
        .join(" "),
    [placedObjectSnapPoints]
  );
  const referencePointPath = useMemo(
    () =>
      transformedReferencePoints
        .map(
          (point) =>
            `M ${point.x - 3} ${point.y} a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`
        )
        .join(" "),
    [transformedReferencePoints]
  );
  const dxfSvgTransform = useMemo(
    () => dxfTransformToSvg(dxfTransform),
    [dxfTransform]
  );

  useEffect(() => {
    setDraft([]);
    setPointer(null);
    setHoverSnap(null);
    setCalibration(null);
    setPdfDerivationMessage("");
  }, [activeTool, readOnly, view.id]);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setPanMode(false);
    setPanning(false);
    panDragRef.current = null;
    primaryPointerRef.current = null;
    touchPointersRef.current.clear();
    pinchRef.current = null;
  }, [view.id]);

  useEffect(() => {
    setPan((current) =>
      clampCanvasPan(current, zoom, CANVAS_WIDTH, CANVAS_HEIGHT)
    );
    if (zoom <= 1) setPanMode(false);
  }, [zoom]);

  useEffect(() => {
    const canvas = svgRef.current;
    if (!canvas) return undefined;
    const preventPageScrollAndZoom = (event) => {
      event.preventDefault();
      event.stopPropagation();
      setZoom((current) =>
        Math.min(3, Math.max(1, current + (event.deltaY < 0 ? 0.15 : -0.15)))
      );
    };
    canvas.addEventListener("wheel", preventPageScrollAndZoom, {
      passive: false
    });
    return () => canvas.removeEventListener("wheel", preventPageScrollAndZoom);
  }, []);

  useEffect(() => {
    if (!calibration) return undefined;
    const cancel = (event) => {
      if (event.key === "Escape") setCalibration(null);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [calibration]);

  const rawCanvasPoint = (event) => {
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const canvasPoint = svgPoint.matrixTransform(
      svgRef.current.getScreenCTM().inverse()
    );
    return { x: canvasPoint.x, y: canvasPoint.y };
  };

  const screenCanvasPoint = (clientX, clientY) => {
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const canvasPoint = svgPoint.matrixTransform(
      svgRef.current.getScreenCTM().inverse()
    );
    return { x: canvasPoint.x, y: canvasPoint.y };
  };

  const canvasPoint = (event) => {
    const { x, y } = rawCanvasPoint(event);
    const closest =
      display.snapPoints &&
      snapPoints.reduce(
        (best, candidate) => {
          const distance = Math.hypot(candidate.x - x, candidate.y - y);
          return distance < best.distance
            ? { point: candidate, distance }
            : best;
        },
        { point: null, distance: Number.POSITIVE_INFINITY }
      );
    const snapDistance = 24 / zoom;
    return closest?.distance <= snapDistance
      ? { ...closest.point, snapped: true }
      : { x, y, snapped: false };
  };

  const createObject = (points) => {
    const base = {
      id: createEditorObjectId(),
      viewId: view.id,
      kind: activeTool,
      points: points.map(({ x, y }) => ({ x, y })),
      status: "pending",
      notes: "",
      variableName: ""
    };
    if (activeTool === "angle") {
      const [vertex, first, second] = points;
      const firstAngle = Math.atan2(first.y - vertex.y, first.x - vertex.x);
      const secondAngle = Math.atan2(second.y - vertex.y, second.x - vertex.x);
      let degrees = Math.abs(((secondAngle - firstAngle) * 180) / Math.PI);
      if (degrees > 180) degrees = 360 - degrees;
      onCreate({
        ...base,
        type: "Winkel",
        label: "Winkel",
        value: degrees.toFixed(1),
        unit: "°"
      });
    } else if (activeTool === "point") {
      onCreate({
        ...base,
        type: "Installation",
        label: "Neuer Punkt",
        value: "",
        unit: ""
      });
    } else if (activeTool === "cabinet") {
      onCreate({
        ...base,
        type: "Korpusverknüpfung",
        label: "Korpus auswählen",
        cabinetId: "",
        value: "",
        unit: ""
      });
    } else {
      onCreate({
        ...base,
        type: "Raumbreite",
        label: "Neue Messung",
        value: "",
        unit: "mm"
      });
    }
  };

  const beginPan = (event) => {
    const matrix = svgRef.current.getScreenCTM();
    panDragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
      unitsPerPixelX: 1 / Math.max(Math.abs(matrix?.a ?? 1), Number.EPSILON),
      unitsPerPixelY: 1 / Math.max(Math.abs(matrix?.d ?? 1), Number.EPSILON)
    };
    svgRef.current.setPointerCapture?.(event.pointerId);
    setPanning(true);
    setPointer(null);
    setHoverSnap(null);
  };

  const performEditorAction = (event) => {
    if (calibration) {
      const clicked = rawCanvasPoint(event);
      if (calibration.step === 0 || calibration.step === 2) {
        setCalibration((current) => ({
          ...current,
          step: current.step + 1,
          pdfPoints: [...current.pdfPoints, clicked],
          error: ""
        }));
        return;
      }

      const closest = transformedReferencePoints.reduce(
        (best, candidate) => {
          const distance = Math.hypot(
            candidate.x - clicked.x,
            candidate.y - clicked.y
          );
          return distance < best.distance
            ? { point: candidate, distance }
            : best;
        },
        { point: null, distance: Number.POSITIVE_INFINITY }
      );
      if (!closest.point || closest.distance > 40 / zoom) {
        setCalibration((current) => ({
          ...current,
          error: "Bitte näher an einen markierten DXF-Endpunkt klicken."
        }));
        return;
      }
      const sourcePoint = dxf.referencePoints[closest.point.sourceIndex];
      if (calibration.step === 1) {
        setCalibration((current) => ({
          ...current,
          step: 2,
          dxfPoints: [sourcePoint],
          error: ""
        }));
        return;
      }

      const transform = createDxfTransform(
        calibration.pdfPoints[0],
        calibration.pdfPoints[1],
        calibration.dxfPoints[0],
        sourcePoint
      );
      if (!transform) {
        setCalibration((current) => ({
          ...current,
          error: "Die beiden Referenzpunkte müssen auseinanderliegen."
        }));
        return;
      }
      onUpdateView({ dxfTransform: transform });
      setCalibration(null);
      return;
    }
    if (!activeTool) return;
    const nextPoint = canvasPoint(event);
    const required =
      activeTool === "angle"
        ? 3
        : ["measurement", "cabinet"].includes(activeTool)
          ? 2
          : 1;
    const nextDraft = [...draft, nextPoint];
    if (nextDraft.length >= required) {
      createObject(nextDraft);
      setDraft([]);
    } else {
      setDraft(nextDraft);
    }
  };

  const startPinch = () => {
    const touches = [...touchPointersRef.current.values()].slice(0, 2);
    if (touches.length < 2) return;
    touches.forEach((touch) => {
      touch.gesture = true;
    });
    const midpoint = {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
    pinchRef.current = {
      startDistance: Math.max(
        1,
        Math.hypot(
          touches[1].clientX - touches[0].clientX,
          touches[1].clientY - touches[0].clientY
        )
      ),
      startZoom: zoom,
      anchor: screenCanvasPoint(midpoint.x, midpoint.y),
      rect: svgRef.current.getBoundingClientRect()
    };
    panDragRef.current = null;
    setPanning(true);
    setPointer(null);
    setHoverSnap(null);
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      const objectElement = event.target.closest?.("[data-aufmas-object-id]");
      touchPointersRef.current.set(event.pointerId, {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        gesture: false,
        objectId: objectElement?.getAttribute("data-aufmas-object-id") ?? null
      });
      svgRef.current.setPointerCapture?.(event.pointerId);
      if (touchPointersRef.current.size >= 2) {
        startPinch();
      } else if ((panMode || (!activeTool && !calibration)) && zoom > 1) {
        beginPan(event);
      }
      return;
    }
    if ((panMode || event.button === 1) && zoom > 1) {
      event.preventDefault();
      beginPan(event);
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    const matrix = svgRef.current.getScreenCTM();
    const objectElement = event.target.closest?.("[data-aufmas-object-id]");
    primaryPointerRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
      moved: false,
      objectId: objectElement?.getAttribute("data-aufmas-object-id") ?? null,
      unitsPerPixelX: 1 / Math.max(Math.abs(matrix?.a ?? 1), Number.EPSILON),
      unitsPerPixelY: 1 / Math.max(Math.abs(matrix?.d ?? 1), Number.EPSILON)
    };
    svgRef.current.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") {
      const touch = touchPointersRef.current.get(event.pointerId);
      if (!touch) return;
      touch.clientX = event.clientX;
      touch.clientY = event.clientY;
      if (
        Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) >
        8
      )
        touch.moved = true;

      if (touchPointersRef.current.size >= 2) {
        event.preventDefault();
        if (!pinchRef.current) startPinch();
        const touches = [...touchPointersRef.current.values()].slice(0, 2);
        const distance = Math.max(
          1,
          Math.hypot(
            touches[1].clientX - touches[0].clientX,
            touches[1].clientY - touches[0].clientY
          )
        );
        const midpoint = {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        };
        const gesture = pinchRef.current;
        const nextZoom = Math.min(
          3,
          Math.max(1, (gesture.startZoom * distance) / gesture.startDistance)
        );
        setZoom(nextZoom);
        setPan(
          panForPinchAnchor({
            anchor: gesture.anchor,
            clientPoint: midpoint,
            rect: gesture.rect,
            zoom: nextZoom,
            canvasWidth: CANVAS_WIDTH,
            canvasHeight: CANVAS_HEIGHT
          })
        );
        return;
      }
    }
    const panDrag = panDragRef.current;
    if (panDrag?.pointerId === event.pointerId) {
      const nextPan = {
        x:
          panDrag.pan.x -
          (event.clientX - panDrag.clientX) * panDrag.unitsPerPixelX,
        y:
          panDrag.pan.y -
          (event.clientY - panDrag.clientY) * panDrag.unitsPerPixelY
      };
      setPan(clampCanvasPan(nextPan, zoom, CANVAS_WIDTH, CANVAS_HEIGHT));
      return;
    }
    if (event.pointerType === "touch") return;
    const primaryPointer = primaryPointerRef.current;
    if (primaryPointer?.pointerId === event.pointerId) {
      const deltaX = event.clientX - primaryPointer.clientX;
      const deltaY = event.clientY - primaryPointer.clientY;
      if (Math.hypot(deltaX, deltaY) > 5) primaryPointer.moved = true;
      if (primaryPointer.moved && zoom > 1) {
        setPanning(true);
        setPointer(null);
        setHoverSnap(null);
        setPan(
          clampCanvasPan(
            {
              x: primaryPointer.pan.x - deltaX * primaryPointer.unitsPerPixelX,
              y: primaryPointer.pan.y - deltaY * primaryPointer.unitsPerPixelY
            },
            zoom,
            CANVAS_WIDTH,
            CANVAS_HEIGHT
          )
        );
      }
      return;
    }
    if (calibration) {
      const nextPoint = rawCanvasPoint(event);
      setPointer(nextPoint);
      if (calibration.step === 1 || calibration.step === 3) {
        const closest = transformedReferencePoints.reduce(
          (best, candidate) => {
            const distance = Math.hypot(
              candidate.x - nextPoint.x,
              candidate.y - nextPoint.y
            );
            return distance < best.distance
              ? { point: candidate, distance }
              : best;
          },
          { point: null, distance: Number.POSITIVE_INFINITY }
        );
        setHoverSnap(closest.distance <= 40 / zoom ? closest.point : null);
      } else {
        setHoverSnap(null);
      }
      return;
    }
    const nextPoint = canvasPoint(event);
    setPointer(nextPoint);
    setHoverSnap(nextPoint.snapped ? nextPoint : null);
  };

  const endPan = (event) => {
    if (panDragRef.current?.pointerId !== event.pointerId) return;
    svgRef.current?.releasePointerCapture?.(event.pointerId);
    panDragRef.current = null;
    setPanning(false);
  };

  const handlePointerEnd = (event) => {
    if (event.pointerType !== "touch") {
      const primaryPointer = primaryPointerRef.current;
      if (primaryPointer?.pointerId === event.pointerId) {
        const cancelled = event.type === "pointercancel";
        primaryPointerRef.current = null;
        svgRef.current?.releasePointerCapture?.(event.pointerId);
        setPanning(false);
        if (cancelled || primaryPointer.moved) return;
        if (activeTool || calibration) performEditorAction(event);
        else if (primaryPointer.objectId) onSelect(primaryPointer.objectId);
        return;
      }
      endPan(event);
      return;
    }
    const touch = touchPointersRef.current.get(event.pointerId);
    const cancelled = event.type === "pointercancel";
    const wasPinching = Boolean(pinchRef.current) || touch?.gesture;
    touchPointersRef.current.delete(event.pointerId);
    svgRef.current?.releasePointerCapture?.(event.pointerId);

    if (touchPointersRef.current.size < 2) pinchRef.current = null;
    if (touchPointersRef.current.size === 0) {
      panDragRef.current = null;
      setPanning(false);
    }

    if (!touch || cancelled || wasPinching || touch.moved || panMode) return;
    if (activeTool || calibration) {
      performEditorAction(event);
    } else if (touch.objectId) {
      onSelect(touch.objectId);
    }
  };

  const previewPoints = useMemo(
    () => (pointer ? [...draft, pointer] : draft),
    [draft, pointer]
  );
  const calibrationPrompt =
    calibration &&
    [
      "PDF: ersten Referenzpunkt wählen",
      "DXF: denselben Referenzpunkt wählen",
      "PDF: zweiten Referenzpunkt wählen",
      "DXF: denselben Referenzpunkt wählen"
    ][calibration.step];
  const calibrationDxfStep =
    calibration && (calibration.step === 1 || calibration.step === 3);

  const deriveFromPdf = async () => {
    if (!planPage || derivingPdf) return;
    setDerivingPdf(true);
    setPdfDerivationMessage("");
    try {
      await new Promise((resolve) =>
        window.requestAnimationFrame(() => resolve())
      );
      const result = await derivePdfSnapPoints(planPage);
      onUpdateView({
        pdfSnapPoints: result.points,
        pdfSnapStats: result.stats
      });
      setPdfDerivationMessage(`${result.points.length} PDF-Fangpunkte erkannt`);
    } catch (error) {
      console.error("PDF-Fangpunkte konnten nicht abgeleitet werden", error);
      setPdfDerivationMessage("PDF-Ableitung fehlgeschlagen");
    } finally {
      setDerivingPdf(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f161d]">
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#2b3844] bg-[#17212a] px-4 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5fa98f] shadow-[0_0_0_4px_rgba(95,169,143,.12)]" />
            <h2 className="truncate text-sm font-semibold text-[#e5edf3]">
              {view.label}
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[#728391]">
            {hasDxf ? `${dxf.snapPoints.length} DXF` : "Kein DXF"} ·{" "}
            {pdfSnapPoints.length} PDF-Fangpunkte
            {pdfDerivationMessage && (
              <span className="ml-2 text-[#9ab4c5]">
                {pdfDerivationMessage}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!readOnly && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#344451] bg-[#1d2933] px-3 py-2 text-xs font-medium text-[#b9c7d1] hover:border-[#506779] hover:text-white">
                <AufmasIcon name="plan" className="size-4" /> PDF
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(event) =>
                    event.target.files?.[0] &&
                    onImportPdf(event.target.files[0])
                  }
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#344451] bg-[#1d2933] px-3 py-2 text-xs font-medium text-[#b9c7d1] hover:border-[#506779] hover:text-white">
                <AufmasIcon name="layers" className="size-4" /> DXF
                <input
                  type="file"
                  accept=".dxf,application/dxf,image/vnd.dxf"
                  className="sr-only"
                  onChange={(event) =>
                    event.target.files?.[0] &&
                    onImportDxf(event.target.files[0])
                  }
                />
              </label>
              <button
                type="button"
                disabled={!hasPlan || !hasDxf}
                onClick={() => {
                  setDraft([]);
                  setPointer(null);
                  setHoverSnap(null);
                  setCalibration({
                    step: 0,
                    pdfPoints: [],
                    dxfPoints: [],
                    error: ""
                  });
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-35 ${calibration ? "border-[#6ea8cd] bg-[#27485d] text-white" : "border-[#344451] bg-[#1d2933] text-[#b9c7d1] hover:border-[#506779] hover:text-white"}`}
                title="PDF und DXF über zwei gemeinsame Referenzpunkte ausrichten"
              >
                <AufmasIcon name="align" className="size-4" /> DXF matchen
              </button>
              {view.dxfTransform && (
                <button
                  type="button"
                  onClick={() => onUpdateView({ dxfTransform: null })}
                  className="rounded-lg border border-[#344451] bg-[#1d2933] p-2 text-[#899aa7] hover:border-[#704b49] hover:text-[#e8a09b]"
                  title="DXF-Ausrichtung zurücksetzen"
                >
                  <AufmasIcon name="close" className="size-4" />
                </button>
              )}
              <button
                type="button"
                disabled={!hasPlan || derivingPdf}
                onClick={deriveFromPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-[#5b5040] bg-[#29241d] px-3 py-2 text-xs font-medium text-[#d8bd8e] hover:border-[#8a7049] hover:text-[#f1d5a3] disabled:cursor-not-allowed disabled:opacity-35"
                title="Geometrische Fangpunkte direkt aus dem PDF-Raster ableiten"
              >
                <AufmasIcon name="point" className="size-4" />{" "}
                {derivingPdf ? "PDF wird analysiert …" : "PDF ableiten"}
              </button>
              {pdfSnapPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateView({ pdfSnapPoints: [], pdfSnapStats: null })
                  }
                  className="rounded-lg border border-[#5b5040] bg-[#29241d] p-2 text-[#a78d68] hover:border-[#704b49] hover:text-[#e8a09b]"
                  title="Abgeleitete PDF-Fangpunkte entfernen"
                >
                  <AufmasIcon name="close" className="size-4" />
                </button>
              )}
            </>
          )}
          <div className="flex items-center rounded-lg border border-[#344451] bg-[#121b22] p-0.5">
            <button
              type="button"
              disabled={zoom <= 1}
              onClick={() => setPanMode((current) => !current)}
              className={`rounded-md p-1.5 disabled:cursor-not-allowed disabled:opacity-30 ${panMode ? "bg-[#31536b] text-[#9bd5f7]" : "text-[#91a1af] hover:bg-[#273541] hover:text-white"}`}
              aria-label="Ansicht verschieben"
              title="Pan-Modus – alternativ mit Linksklick ziehen oder mittlere Maustaste verwenden"
            >
              <AufmasIcon name="pan" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(1, current - 0.25))}
              className="rounded-md p-1.5 text-[#91a1af] hover:bg-[#273541] hover:text-white"
              aria-label="Verkleinern"
            >
              <AufmasIcon name="zoomOut" className="size-4" />
            </button>
            <span className="w-11 text-center text-[10px] tabular-nums text-[#8ea0af]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
              className="rounded-md p-1.5 text-[#91a1af] hover:bg-[#273541] hover:text-white"
              aria-label="Vergrößern"
            >
              <AufmasIcon name="zoomIn" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="rounded-md p-1.5 text-[#91a1af] hover:bg-[#273541] hover:text-white"
              aria-label="Ansicht einpassen"
            >
              <AufmasIcon name="fit" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0d141a] p-3">
        {(importing || derivingPdf) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e161d]/80 text-sm text-[#c8d5df] backdrop-blur-sm">
            {derivingPdf
              ? "PDF-Geometrie wird analysiert …"
              : "Plan wird aufbereitet …"}
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className={`h-full w-full touch-none overscroll-contain rounded-sm border border-[#273540] bg-[#151e26] ${panning ? "cursor-grabbing" : panMode ? "cursor-grab" : activeTool ? "cursor-crosshair" : "cursor-default"}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={() => {
            if (!panDragRef.current) {
              setPointer(null);
              setHoverSnap(null);
            }
          }}
          onAuxClick={(event) => event.preventDefault()}
        >
          <defs>
            <pattern
              id="minor-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M20 0H0V20"
                fill="none"
                stroke="#253540"
                strokeWidth="0.65"
              />
            </pattern>
            <pattern
              id="major-grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="100" height="100" fill="url(#minor-grid)" />
              <path
                d="M100 0H0V100"
                fill="none"
                stroke="#304451"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#141d24" />
          <rect
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="url(#major-grid)"
            opacity=".58"
          />
          {display.plan && planPage?.dataUrl && (
            <image
              href={planPage.dataUrl}
              x="54"
              y="54"
              width="892"
              height="542"
              preserveAspectRatio="xMidYMid meet"
              opacity={calibrationDxfStep ? 0.18 : 0.74}
            />
          )}
          {display.dxf && drawingPath && (
            <g
              transform={hasDxf ? dxfSvgTransform : undefined}
              opacity={calibration && !calibrationDxfStep ? 0.16 : 1}
            >
              <path
                d={drawingPath}
                fill="none"
                stroke={hasDxf ? "#7f9aae" : "#50697a"}
                strokeWidth={hasDxf ? 1.7 : 2}
                opacity={hasDxf ? 0.88 : 0.68}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
          {!hasPlan && !hasDxf && (
            <g pointerEvents="none">
              <text
                x="500"
                y="42"
                textAnchor="middle"
                fill="#617686"
                fontSize="13"
                letterSpacing="2"
              >
                SCHEMATISCHE ARBEITSFLÄCHE
              </text>
              <text
                x="500"
                y="615"
                textAnchor="middle"
                fill="#556978"
                fontSize="12"
              >
                PDF und DXF oben rechts importieren
              </text>
            </g>
          )}
          {display.snapPoints && dxfSnapPointPath && (
            <path
              d={dxfSnapPointPath}
              fill="#92b8d0"
              opacity={hoverSnap ? 0.52 : 0.66}
              pointerEvents="none"
            />
          )}
          {display.snapPoints && pdfSnapPointPath && (
            <path
              d={pdfSnapPointPath}
              fill="#dfae65"
              opacity={hoverSnap ? 0.55 : 0.78}
              pointerEvents="none"
            />
          )}
          {display.snapPoints && placedPointPath && (
            <path
              d={placedPointPath}
              fill="none"
              stroke="#73d5bc"
              strokeWidth="2"
              opacity=".9"
              pointerEvents="none"
            />
          )}
          {calibrationDxfStep && referencePointPath && (
            <path
              d={referencePointPath}
              fill="#74c0ee"
              opacity=".72"
              pointerEvents="none"
            />
          )}
          {display.snapPoints && hoverSnap && (
            <g pointerEvents="none">
              <circle
                cx={hoverSnap.x}
                cy={hoverSnap.y}
                r="10"
                fill="#66b9ee"
                opacity=".95"
              />
              <circle
                cx={hoverSnap.x}
                cy={hoverSnap.y}
                r="17"
                fill="none"
                stroke="#66b9ee"
                strokeWidth="1.5"
                opacity=".7"
              />
            </g>
          )}
          {display.objects &&
            objects
              .filter((object) => object.kind === "cabinet")
              .map((object) => (
                <MeasurementGraphic
                  key={object.id}
                  object={object}
                  selected={object.id === selectedId}
                  onSelect={onSelect}
                  interactive={!activeTool && !panMode}
                  showObjectLabels={display.objectLabels}
                />
              ))}
          {display.objects &&
            objects
              .filter((object) => object.kind !== "cabinet")
              .map((object) => (
                <MeasurementGraphic
                  key={object.id}
                  object={object}
                  selected={object.id === selectedId}
                  onSelect={onSelect}
                  interactive={!activeTool && !panMode}
                  showObjectLabels={display.objectLabels}
                />
              ))}
          {activeTool === "cabinet" &&
            previewPoints.length > 1 &&
            rectangleFromPoints(previewPoints[0], previewPoints[1]) &&
            (() => {
              const rectangle = rectangleFromPoints(
                previewPoints[0],
                previewPoints[1]
              );
              return (
                <rect
                  x={rectangle.x}
                  y={rectangle.y}
                  width={rectangle.width}
                  height={rectangle.height}
                  fill="#68b7eb"
                  fillOpacity=".08"
                  stroke="#68b7eb"
                  strokeWidth="2"
                  strokeDasharray="8 7"
                  pointerEvents="none"
                />
              );
            })()}
          {activeTool !== "cabinet" && previewPoints.length > 1 && (
            <polyline
              points={previewPoints
                .map((point) => `${point.x},${point.y}`)
                .join(" ")}
              fill="none"
              stroke="#68b7eb"
              strokeWidth="2"
              strokeDasharray="8 7"
              pointerEvents="none"
            />
          )}
          {draft.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="7"
              fill="#68b7eb"
              stroke="#d9f1ff"
              strokeWidth="2"
              pointerEvents="none"
            />
          ))}
          {calibration?.pdfPoints.map((point, index) => (
            <g key={`pdf-${index}`} pointerEvents="none">
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill="#e3ad60"
                stroke="#fff0cf"
                strokeWidth="2"
              />
              <text
                x={point.x + 14}
                y={point.y - 12}
                fill="#f4c77f"
                fontSize="13"
                fontWeight="700"
              >
                PDF {index + 1}
              </text>
            </g>
          ))}
          {calibration?.dxfPoints.map((point, index) => {
            const mapped = applyDxfTransform(point, dxfTransform);
            return (
              <g key={`dxf-${index}`} pointerEvents="none">
                <circle
                  cx={mapped.x}
                  cy={mapped.y}
                  r="10"
                  fill="#61afe0"
                  stroke="#d6f0ff"
                  strokeWidth="2"
                />
                <text
                  x={mapped.x + 14}
                  y={mapped.y + 22}
                  fill="#8ed2fa"
                  fontSize="13"
                  fontWeight="700"
                >
                  DXF {index + 1}
                </text>
              </g>
            );
          })}
        </svg>
        {calibration && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 min-w-72 -translate-x-1/2 rounded-xl border border-[#55768d] bg-[#162631]/95 px-4 py-3 text-center text-xs text-[#d8e8f2] shadow-xl">
            <p className="font-semibold">{calibrationPrompt}</p>
            <p className="mt-1 text-[10px] text-[#86a0b1]">
              {calibrationDxfStep
                ? "Blaue DXF-Endpunkte sind auswählbar."
                : "Punkt exakt auf der PDF-Zeichnung setzen."}{" "}
              · ESC zum Abbrechen
            </p>
            {calibration.error && (
              <p className="mt-1.5 text-[10px] text-[#f0a39e]">
                {calibration.error}
              </p>
            )}
          </div>
        )}
        {panMode && zoom > 1 && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-[#456579] bg-[#162631]/95 px-4 py-2 text-xs text-[#c9dce8] shadow-xl">
            Ansicht ziehen · Verschiebung ist auf den Zeichenbereich begrenzt
          </div>
        )}
        {activeTool && !calibration && !panMode && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-[#3f5363] bg-[#16212a]/95 px-4 py-2 text-xs text-[#c2d0da] shadow-xl">
            {activeTool === "measurement" &&
              (draft.length ? "Zweiten Punkt wählen" : "Ersten Punkt wählen")}
            {activeTool === "angle" &&
              [
                "Scheitelpunkt wählen",
                "Ersten Schenkel wählen",
                "Zweiten Schenkel wählen"
              ][draft.length]}
            {activeTool === "point" && "Position der Installation wählen"}
            {activeTool === "cabinet" &&
              (draft.length
                ? "Gegenüberliegende Ecke wählen"
                : "Erste Ecke des Korpusbereichs wählen")}
            <span className="ml-2 text-[#6eb4f1]">
              Klick/Tippen: Werkzeug · Ziehen: Pan · 2 Finger: Zoom/Pan · ESC:
              Abbrechen
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
