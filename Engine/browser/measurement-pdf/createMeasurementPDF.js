const PAGE = Object.freeze({ widthMm: 297, heightMm: 210 });
const CANVAS = Object.freeze({ width: 1000, height: 650 });
const DRAWING_FRAME = Object.freeze({ x: 14, y: 28, width: 269, height: 169 });
const FORM_FIELD = Object.freeze({ widthMm: 32, heightMm: 10 });
const FALLBACK_SEGMENTS = Object.freeze([
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
]);

const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

// `crypto.randomUUID()` is restricted to secure browser contexts. The app is
// also used from local HTTP addresses, while `crypto.getRandomValues()` remains
// available there. Always format the fallback as a real UUID because these IDs
// are persisted in PostgreSQL UUID columns and validated by the backend.
const createId = () => {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};

const printableViews = (views) =>
  (Array.isArray(views) ? views : []).filter(
    (view) => view && !["three", "images"].includes(view.type)
  );

const canvasFrame = () => {
  const scale = Math.min(
    DRAWING_FRAME.width / CANVAS.width,
    DRAWING_FRAME.height / CANVAS.height
  );
  const width = CANVAS.width * scale;
  const height = CANVAS.height * scale;
  return {
    x: DRAWING_FRAME.x + (DRAWING_FRAME.width - width) / 2,
    y: DRAWING_FRAME.y + (DRAWING_FRAME.height - height) / 2,
    width,
    height,
    scale
  };
};

const canvasToPage = (point, frame) => ({
  x: frame.x + finite(point?.x) * frame.scale,
  y: frame.y + finite(point?.y) * frame.scale
});

const measurementMiddle = (object) => {
  const [start, end] = object?.points ?? [];
  if (!start || !end) return null;
  if (object.kind === "angle") return start;
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
};

const fieldForObject = (
  object,
  frame,
  labelOffsetY,
  formFieldWidthMm,
  formFieldHeightMm
) => {
  if (
    !["measurement", "angle"].includes(object?.kind) ||
    object.status === "measured"
  ) {
    return null;
  }

  const middle = measurementMiddle(object);
  if (!middle) return null;
  const center = canvasToPage(
    { x: middle.x, y: middle.y + (object.kind === "angle" ? -28 : labelOffsetY) },
    frame
  );
  const sourceLabel = object.label || object.type || "Maß";
  const width = clamp(finite(formFieldWidthMm, FORM_FIELD.widthMm), 20, 80);
  const height = clamp(finite(formFieldHeightMm, FORM_FIELD.heightMm), 8, 30);
  const x = clamp(
    center.x - width / 2,
    DRAWING_FRAME.x + 1,
    DRAWING_FRAME.x + DRAWING_FRAME.width - width - 1
  );
  const y = clamp(
    center.y - height / 2,
    DRAWING_FRAME.y + 1,
    DRAWING_FRAME.y + DRAWING_FRAME.height - height - 1
  );

  return {
    id: createId(),
    objectId: String(object.id),
    kind: object.kind,
    label: sourceLabel,
    unit: object.unit || (object.kind === "angle" ? "°" : "mm"),
    originalValue: object.value == null ? "" : String(object.value),
    xMm: x,
    yMm: y,
    widthMm: width,
    heightMm: height,
    normalized: {
      x: x / PAGE.widthMm,
      y: y / PAGE.heightMm,
      width: width / PAGE.widthMm,
      height: height / PAGE.heightMm
    }
  };
};

/**
 * Creates the stable page/field geometry before rendering. The returned data is
 * persisted by the backend and is also the extraction contract for the OCR
 * worker, so all coordinates are expressed in physical PDF millimetres.
 */
export function createMeasurementPrintLayout({
  projectId,
  runId = createId(),
  views = [],
  objects = [],
  measurementLabelSizePercent = 100,
  measurementLabelOffsetY = -30,
  measurementFormFieldWidthMm = FORM_FIELD.widthMm,
  measurementFormFieldHeightMm = FORM_FIELD.heightMm
}) {
  const frame = canvasFrame();
  const labelOffsetY = finite(measurementLabelOffsetY, -30);

  const pages = printableViews(views).map((view, index) => {
    const id = createId();
    const fields = objects
      .filter((object) => object.viewId === view.id)
      .map((object) =>
        fieldForObject(
          object,
          frame,
          labelOffsetY,
          measurementFormFieldWidthMm,
          measurementFormFieldHeightMm
        )
      )
      .filter(Boolean);
    return {
      id,
      pageNumber: index + 1,
      viewId: String(view.id),
      label: String(view.label || `Ansicht ${index + 1}`),
      widthMm: PAGE.widthMm,
      heightMm: PAGE.heightMm,
      identifier: `CPM1:${projectId}:${runId}:${id}`,
      fields
    };
  });

  return {
    schemaVersion: 1,
    runId,
    projectId: String(projectId),
    format: "A4",
    orientation: "landscape",
    pageWidthMm: PAGE.widthMm,
    pageHeightMm: PAGE.heightMm,
    drawingFrame: frame,
    pages
  };
}

const applyTransform = (point, transform = {}) => {
  const a = finite(transform.a, 1);
  const b = finite(transform.b, 0);
  return {
    x: a * finite(point.x) - b * finite(point.y) + finite(transform.tx),
    y: b * finite(point.x) + a * finite(point.y) + finite(transform.ty)
  };
};

const setStroke = (doc, color, width = 0.35) => {
  doc.setDrawColor(color);
  doc.setLineWidth(width);
};

const drawOrientationMarkers = (doc) => {
  doc.setFillColor(0, 0, 0);
  [
    [5, 5],
    [PAGE.widthMm - 9, 5],
    [5, PAGE.heightMm - 9],
    [PAGE.widthMm - 9, PAGE.heightMm - 9]
  ].forEach(([x, y]) => doc.rect(x, y, 4, 4, "F"));

  setStroke(doc, 0, 0.25);
  doc.line(5, 12, 5, 17);
  doc.line(5, 12, 10, 12);
  doc.line(PAGE.widthMm - 5, 12, PAGE.widthMm - 5, 17);
  doc.line(PAGE.widthMm - 10, 12, PAGE.widthMm - 5, 12);
  doc.line(5, PAGE.heightMm - 12, 5, PAGE.heightMm - 17);
  doc.line(5, PAGE.heightMm - 12, 10, PAGE.heightMm - 12);
  doc.line(
    PAGE.widthMm - 5,
    PAGE.heightMm - 12,
    PAGE.widthMm - 5,
    PAGE.heightMm - 17
  );
  doc.line(
    PAGE.widthMm - 10,
    PAGE.heightMm - 12,
    PAGE.widthMm - 5,
    PAGE.heightMm - 12
  );
};

const drawHeader = (doc, { projectName, page, variant }) => {
  doc.setTextColor(24, 34, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(page.label, 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(String(projectName || "Projekt"), 14, 18);
  doc.setTextColor(80, 90, 98);
  doc.text(
    variant === "field" ? "Aufmaßblatt – handschriftlich ausfüllen" : "Aufmaß – dokumentierte Ansicht",
    14,
    22
  );
  doc.setFontSize(6.5);
  doc.text(
    `Seite ${page.pageNumber} · ${page.identifier}`,
    14,
    PAGE.heightMm - 5
  );
};

const drawBackground = (doc, planPage, frame) => {
  doc.setFillColor(255, 255, 255);
  doc.rect(frame.x, frame.y, frame.width, frame.height, "F");
  if (!planPage?.dataUrl) return;

  const target = {
    x: frame.x + 54 * frame.scale,
    y: frame.y + 54 * frame.scale,
    width: 892 * frame.scale,
    height: 542 * frame.scale
  };
  const sourceWidth = Math.max(1, finite(planPage.width, 1));
  const sourceHeight = Math.max(1, finite(planPage.height, 1));
  const scale = Math.min(target.width / sourceWidth, target.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const format = /^data:image\/jpe?g/i.test(planPage.dataUrl)
    ? "JPEG"
    : /^data:image\/webp/i.test(planPage.dataUrl)
      ? "WEBP"
      : "PNG";
  doc.addImage(
    planPage.dataUrl,
    format,
    target.x + (target.width - width) / 2,
    target.y + (target.height - height) / 2,
    width,
    height,
    undefined,
    "FAST"
  );
};

const drawDxf = (doc, dxf, view, frame) => {
  const shapes = dxf?.shapes ?? [];
  if (!shapes.length) return;
  setStroke(doc, 90, 0.28);
  shapes.forEach((shape) => {
    if (shape.type === "circle") {
      const center = canvasToPage(
        applyTransform({ x: shape.cx, y: shape.cy }, view.dxfTransform),
        frame
      );
      const edge = canvasToPage(
        applyTransform(
          { x: finite(shape.cx) + finite(shape.radius), y: shape.cy },
          view.dxfTransform
        ),
        frame
      );
      doc.circle(center.x, center.y, Math.hypot(edge.x - center.x, edge.y - center.y));
      return;
    }
    const start = canvasToPage(
      applyTransform({ x: shape.x1, y: shape.y1 }, view.dxfTransform),
      frame
    );
    const end = canvasToPage(
      applyTransform({ x: shape.x2, y: shape.y2 }, view.dxfTransform),
      frame
    );
    doc.line(start.x, start.y, end.x, end.y);
  });
};

const statusColor = (object) =>
  object.status === "measured" ? [34, 122, 91] : [175, 106, 25];

const drawObjectLine = (doc, object, frame) => {
  const points = (object.points ?? []).map((point) => canvasToPage(point, frame));
  if (!points.length) return;
  const color = statusColor(object);
  doc.setDrawColor(...color);
  doc.setTextColor(...color);
  doc.setLineWidth(0.65);

  if (object.kind === "point") {
    doc.circle(points[0].x, points[0].y, 2.2);
    doc.line(points[0].x - 2.8, points[0].y, points[0].x + 2.8, points[0].y);
    doc.line(points[0].x, points[0].y - 2.8, points[0].x, points[0].y + 2.8);
    return;
  }
  if (object.kind === "cabinet" && points[1]) {
    doc.setLineDashPattern([2, 1.2], 0);
    doc.rect(
      Math.min(points[0].x, points[1].x),
      Math.min(points[0].y, points[1].y),
      Math.abs(points[1].x - points[0].x),
      Math.abs(points[1].y - points[0].y)
    );
    doc.setLineDashPattern([], 0);
    return;
  }
  if (object.kind === "angle" && points[1] && points[2]) {
    doc.line(points[1].x, points[1].y, points[0].x, points[0].y);
    doc.line(points[0].x, points[0].y, points[2].x, points[2].y);
    return;
  }
  if (points[1]) {
    if (object.kind === "guide") doc.setLineDashPattern([2, 1.5], 0);
    doc.line(points[0].x, points[0].y, points[1].x, points[1].y);
    doc.setLineDashPattern([], 0);
    if (object.kind === "measurement") {
      doc.circle(points[0].x, points[0].y, 1.4);
      doc.circle(points[1].x, points[1].y, 1.4);
    }
  }
};

const fullLabelPosition = (object, frame, labelOffsetY) => {
  const middle = measurementMiddle(object);
  if (!middle) return null;
  return canvasToPage(
    {
      x: middle.x,
      y: middle.y + (object.kind === "angle" ? -28 : labelOffsetY)
    },
    frame
  );
};

const drawFullLabel = (doc, object, frame, labelScale, labelOffsetY) => {
  if (!["measurement", "angle"].includes(object.kind)) return;
  const center = fullLabelPosition(object, frame, labelOffsetY);
  if (!center) return;
  const value = object.value
    ? `${object.value}${object.kind === "angle" ? "°" : ` ${object.unit || "mm"}`}`
    : object.label || "Maß offen";
  const fontSize = 10 * labelScale;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  const width = Math.max(18, doc.getTextWidth(value) + 6);
  const height = Math.max(7, fontSize * 0.3528 + 3.2);
  const x = clamp(center.x - width / 2, DRAWING_FRAME.x, PAGE.widthMm - 14 - width);
  const y = clamp(center.y - height / 2, DRAWING_FRAME.y, PAGE.heightMm - 13 - height);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...statusColor(object));
  doc.roundedRect(x, y, width, height, 1, 1, "FD");
  doc.setTextColor(24, 34, 42);
  doc.text(value, x + width / 2, y + height / 2, {
    align: "center",
    baseline: "middle"
  });
};

const drawObjectAnnotation = (doc, object, frame) => {
  if (!["point", "cabinet"].includes(object.kind) || !object.label) return;
  const point = canvasToPage(object.points?.[0], frame);
  const label = String(object.label);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const width = Math.max(18, doc.getTextWidth(label) + 6);
  const height = 7;
  const x = clamp(point.x + 2.5, DRAWING_FRAME.x, PAGE.widthMm - 14 - width);
  const y = clamp(point.y - 5, DRAWING_FRAME.y, PAGE.heightMm - 18);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...statusColor(object));
  doc.roundedRect(x, y, width, height, 1, 1, "FD");
  doc.setTextColor(24, 34, 42);
  doc.text(label, x + width / 2, y + height / 2, {
    align: "center",
    baseline: "middle"
  });
};

const drawField = (doc, field) => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(field.xMm, field.yMm, field.widthMm, field.heightMm, "FD");
};

const renderPage = async ({
  doc,
  page,
  view,
  objects,
  planPage,
  dxf,
  projectName,
  variant,
  encodeQr,
  labelScale,
  labelOffsetY,
  frame
}) => {
  drawOrientationMarkers(doc);
  drawHeader(doc, { projectName, page, variant });
  drawBackground(doc, planPage, frame);
  drawDxf(
    doc,
    dxf?.shapes?.length || planPage?.dataUrl ? dxf : { shapes: FALLBACK_SEGMENTS },
    view,
    frame
  );

  const viewObjects = objects.filter((object) => object.viewId === view.id);
  viewObjects.forEach((object) => drawObjectLine(doc, object, frame));
  viewObjects.forEach((object) => {
    drawObjectAnnotation(doc, object, frame);
    const field = page.fields.find((candidate) => candidate.objectId === String(object.id));
    if (variant === "field" && field) drawField(doc, field);
    else drawFullLabel(doc, object, frame, labelScale, labelOffsetY);
  });

  if (typeof encodeQr === "function") {
    const qr = await encodeQr(page.identifier);
    doc.addImage(qr, "PNG", PAGE.widthMm - 37, 3.5, 25, 25, undefined, "FAST");
  }
};

const createDocument = async ({ jsPDF, layout, variant, ...context }) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({
    title: `${context.projectName || "Projekt"} – Aufmaß ${variant === "field" ? "Formular" : "Dokumentation"}`,
    subject: `CarpentersProduction Aufmaß ${layout.runId}`,
    creator: "CarpentersProduction"
  });

  for (let index = 0; index < layout.pages.length; index += 1) {
    if (index > 0) doc.addPage("a4", "landscape");
    const page = layout.pages[index];
    const view = context.views.find((candidate) => String(candidate.id) === page.viewId);
    await renderPage({
      doc,
      page,
      view,
      objects: context.objects,
      planPage: context.planPages?.[view.id] ?? null,
      dxf: context.dxfLayers?.[view.id] ?? null,
      projectName: context.projectName,
      variant,
      encodeQr: context.encodeQr,
      labelScale: context.labelScale,
      labelOffsetY: context.labelOffsetY,
      frame: layout.drawingFrame
    });
  }
  return doc;
};

/** Builds the documented and handwriting-ready PDF from the same immutable layout. */
export async function createMeasurementPrintDocuments({
  jsPDF,
  encodeQr,
  projectId,
  projectName,
  views = [],
  objects = [],
  planPages = {},
  dxfLayers = {},
  measurementLabelSizePercent = 100,
  measurementLabelOffsetY = -30,
  measurementFormFieldWidthMm = FORM_FIELD.widthMm,
  measurementFormFieldHeightMm = FORM_FIELD.heightMm,
  runId
}) {
  if (typeof jsPDF !== "function") throw new TypeError("jsPDF constructor is required");
  const layout = createMeasurementPrintLayout({
    projectId,
    runId,
    views,
    objects,
    measurementLabelSizePercent,
    measurementLabelOffsetY,
    measurementFormFieldWidthMm,
    measurementFormFieldHeightMm
  });
  if (!layout.pages.length) throw new Error("Keine druckbare Aufmaßansicht vorhanden.");

  const context = {
    jsPDF,
    layout,
    encodeQr,
    projectName,
    views: printableViews(views),
    objects,
    planPages,
    dxfLayers,
    labelScale: clamp(finite(measurementLabelSizePercent, 100) / 100, 0.5, 2),
    labelOffsetY: finite(measurementLabelOffsetY, -30)
  };
  const [documented, fieldSheet] = await Promise.all([
    createDocument({ ...context, variant: "documented" }),
    createDocument({ ...context, variant: "field" })
  ]);
  return { layout, documented, fieldSheet };
}

export const MEASUREMENT_PRINT_PAGE = PAGE;
export const MEASUREMENT_PRINT_FRAME = DRAWING_FRAME;
