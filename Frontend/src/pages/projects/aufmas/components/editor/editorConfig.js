export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 650;

export const FALLBACK_SEGMENTS = [
  { type: "line", x1: 94, y1: 548, x2: 906, y2: 548 },
  { type: "line", x1: 94, y1: 548, x2: 94, y2: 90 },
  { type: "line", x1: 906, y1: 548, x2: 906, y2: 90 },
  { type: "line", x1: 94, y1: 90, x2: 906, y2: 90 },
  { type: "line", x1: 655, y1: 548, x2: 655, y2: 275 },
  { type: "line", x1: 655, y1: 275, x2: 810, y2: 275 },
  { type: "line", x1: 810, y1: 275, x2: 810, y2: 548 },
  { type: "line", x1: 210, y1: 350, x2: 390, y2: 350 },
  { type: "line", x1: 210, y1: 350, x2: 210, y2: 180 },
  { type: "line", x1: 390, y1: 350, x2: 390, y2: 180 },
  { type: "line", x1: 210, y1: 180, x2: 390, y2: 180 }
];

export const uniqueSegmentPoints = (segments) => {
  const points = [];
  segments.forEach((segment) => {
    [
      { x: segment.x1, y: segment.y1 },
      { x: segment.x2, y: segment.y2 }
    ].forEach((point) => {
      if (
        !points.some(
          (existing) => existing.x === point.x && existing.y === point.y
        )
      )
        points.push(point);
    });
  });
  return points;
};

export const createEditorObjectId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
