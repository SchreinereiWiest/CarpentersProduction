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
