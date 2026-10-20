export const rectangleFromPoints = (start, end) => {
  if (!start || !end) return null;
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
};

export const clampCanvasPan = (pan, zoom, canvasWidth, canvasHeight) => {
  const safeZoom = Math.max(1, Number(zoom) || 1);
  const maxX = Math.max(0, (canvasWidth - canvasWidth / safeZoom) / 2);
  const maxY = Math.max(0, (canvasHeight - canvasHeight / safeZoom) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, Number(pan?.x) || 0)),
    y: Math.min(maxY, Math.max(-maxY, Number(pan?.y) || 0))
  };
};

export const panForPinchAnchor = ({
  anchor,
  clientPoint,
  rect,
  zoom,
  canvasWidth,
  canvasHeight
}) => {
  const baseScale = Math.min(
    rect.width / canvasWidth,
    rect.height / canvasHeight
  );
  const scale = Math.max(baseScale * zoom, Number.EPSILON);
  const viewportCenter = {
    x: anchor.x - (clientPoint.x - (rect.left + rect.width / 2)) / scale,
    y: anchor.y - (clientPoint.y - (rect.top + rect.height / 2)) / scale
  };
  return clampCanvasPan(
    {
      x: viewportCenter.x - canvasWidth / 2,
      y: viewportCenter.y - canvasHeight / 2
    },
    zoom,
    canvasWidth,
    canvasHeight
  );
};

const validPoint = (point) =>
  Number.isFinite(point?.x) && Number.isFinite(point?.y);

export const createMeasurementScale = (first, second, referenceMm) => {
  if (!validPoint(first) || !validPoint(second)) return null;
  const rasterDistance = Math.hypot(second.x - first.x, second.y - first.y);
  const millimeters = Number(referenceMm);
  if (
    !Number.isFinite(rasterDistance) ||
    rasterDistance < 0.001 ||
    !Number.isFinite(millimeters) ||
    millimeters <= 0
  ) {
    return null;
  }
  return {
    millimetersPerUnit: millimeters / rasterDistance,
    referenceValueMm: millimeters,
    referencePoints: [first, second].map(({ x, y }) => ({ x, y }))
  };
};

export const measurementValueForPoints = (points, scale) => {
  const [first, second] = points ?? [];
  const millimetersPerUnit = Number(scale?.millimetersPerUnit);
  if (
    !validPoint(first) ||
    !validPoint(second) ||
    !Number.isFinite(millimetersPerUnit) ||
    millimetersPerUnit <= 0
  ) {
    return "";
  }
  const millimeters =
    Math.hypot(second.x - first.x, second.y - first.y) * millimetersPerUnit;
  return String(Math.round(millimeters));
};

export const lineLockThresholdForCanvas = ({
  thresholdCm,
  dxfScale,
  transformScale = 1
}) => {
  const threshold = Math.max(0, Number(thresholdCm) || 0);
  if (!Number.isFinite(dxfScale) || dxfScale <= 0) return threshold;

  // Aufmaß- und CNC-DXF-Dateien verwenden Millimeter. Zentimeter werden vor
  // der DXF-Normalisierung und einer optionalen PDF-Ausrichtung umgerechnet.
  return threshold * 10 * dxfScale * Math.abs(Number(transformScale) || 1);
};

export const lockLinePoint = (start, point, threshold) => {
  if (!validPoint(start) || !validPoint(point)) return point;

  // Ein explizit gefangener Rasterpunkt ist bereits die präziseste Vorgabe
  // und darf nicht durch die nachgelagerte Achsenfixierung verschoben werden.
  if (point.snapped) return point;

  const maximumDeviation = Number(threshold);
  if (!Number.isFinite(maximumDeviation) || maximumDeviation <= 0) return point;

  const horizontalDeviation = Math.abs(point.y - start.y);
  const verticalDeviation = Math.abs(point.x - start.x);
  const canLockHorizontal = horizontalDeviation <= maximumDeviation;
  const canLockVertical = verticalDeviation <= maximumDeviation;

  if (!canLockHorizontal && !canLockVertical) return point;

  if (canLockHorizontal && horizontalDeviation <= verticalDeviation) {
    return {
      ...point,
      y: start.y,
      snapped: false,
      lineLocked: "horizontal"
    };
  }

  return {
    ...point,
    x: start.x,
    snapped: false,
    lineLocked: "vertical"
  };
};

export const getPlacedObjectSnapPoints = (objects) =>
  objects.flatMap((object) => {
    if (object.kind === "point") {
      const point = object.points?.[0];
      return validPoint(point)
        ? [
            {
              x: point.x,
              y: point.y,
              source: "placed-point",
              sourceObjectId: object.id
            }
          ]
        : [];
    }

    if (object.kind !== "cabinet") return [];
    const rectangle = rectangleFromPoints(
      object.points?.[0],
      object.points?.[1]
    );
    if (!rectangle || rectangle.width === 0 || rectangle.height === 0)
      return [];
    return [
      { x: rectangle.x, y: rectangle.y },
      { x: rectangle.x + rectangle.width, y: rectangle.y },
      { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
      { x: rectangle.x, y: rectangle.y + rectangle.height }
    ].map((point, cornerIndex) => ({
      ...point,
      source: "cabinet-corner",
      sourceObjectId: object.id,
      cornerIndex
    }));
  });
