const WIDTH = 1000;
const HEIGHT = 650;
const PLAN_FRAME = { x: 54, y: 54, width: 892, height: 542 };
const FALLBACK_SEGMENTS = [
    [94, 548, 906, 548],
    [94, 548, 94, 90],
    [906, 548, 906, 90],
    [94, 90, 906, 90],
    [655, 548, 655, 275],
    [655, 275, 810, 275],
    [810, 275, 810, 548]
];

const finite = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeXml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const point = value => ({ x: finite(value?.x), y: finite(value?.y) });

const applyTransform = (value, transform = {}) => {
    const source = point(value);
    const a = finite(transform.a, 1);
    const b = finite(transform.b, 0);
    return {
        x: a * source.x - b * source.y + finite(transform.tx),
        y: b * source.x + a * source.y + finite(transform.ty)
    };
};

const statusColor = object => object?.status === "measured" ? "#227a5b" : "#af6a19";

const renderDxfShape = (shape, transform) => {
    if (shape?.type === "circle") {
        const center = applyTransform({ x: shape.cx, y: shape.cy }, transform);
        const edge = applyTransform({ x: finite(shape.cx) + finite(shape.radius), y: shape.cy }, transform);
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
        return `<circle cx="${center.x}" cy="${center.y}" r="${radius}"/>`;
    }
    const start = applyTransform({ x: shape?.x1, y: shape?.y1 }, transform);
    const end = applyTransform({ x: shape?.x2, y: shape?.y2 }, transform);
    return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}"/>`;
};

const objectLabel = (object, points, labelOffsetY) => {
    if (!["measurement", "angle"].includes(object?.kind)) return "";
    const middle = object.kind === "angle"
        ? points[0]
        : points[0] && points[1]
            ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
            : null;
    if (!middle) return "";
    const text = object.value
        ? `${object.value}${object.kind === "angle" ? "°" : ` ${object.unit || "mm"}`}`
        : object.label || "Maß offen";
    const y = middle.y + (object.kind === "angle" ? -28 : labelOffsetY);
    const width = Math.max(74, String(text).length * 8.2 + 22);
    return `<g><rect x="${middle.x - width / 2}" y="${y - 16}" width="${width}" height="32" rx="5" fill="#fff" stroke="${statusColor(object)}" stroke-width="2"/><text x="${middle.x}" y="${y + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#18222a">${escapeXml(text)}</text></g>`;
};

const renderObject = (object, labelOffsetY) => {
    const points = (object?.points ?? []).map(point);
    if (!points.length) return "";
    const color = statusColor(object);
    let shape = "";
    if (object.kind === "point") {
        shape = `<g><circle cx="${points[0].x}" cy="${points[0].y}" r="8"/><line x1="${points[0].x - 11}" y1="${points[0].y}" x2="${points[0].x + 11}" y2="${points[0].y}"/><line x1="${points[0].x}" y1="${points[0].y - 11}" x2="${points[0].x}" y2="${points[0].y + 11}"/></g>`;
    } else if (object.kind === "cabinet" && points[1]) {
        shape = `<rect x="${Math.min(points[0].x, points[1].x)}" y="${Math.min(points[0].y, points[1].y)}" width="${Math.abs(points[1].x - points[0].x)}" height="${Math.abs(points[1].y - points[0].y)}" stroke-dasharray="9 6"/>`;
    } else if (object.kind === "angle" && points[1] && points[2]) {
        shape = `<polyline points="${points[1].x},${points[1].y} ${points[0].x},${points[0].y} ${points[2].x},${points[2].y}"/>`;
    } else if (points[1]) {
        shape = `<line x1="${points[0].x}" y1="${points[0].y}" x2="${points[1].x}" y2="${points[1].y}"${object.kind === "guide" ? ' stroke-dasharray="9 6"' : ""}/>`;
    }
    const annotation = ["point", "cabinet"].includes(object.kind) && object.label
        ? `<text x="${points[0].x + 14}" y="${points[0].y - 12}" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="${color}">${escapeXml(object.label)}</text>`
        : "";
    return `<g fill="none" stroke="${color}" stroke-width="3">${shape}</g>${annotation}${objectLabel(object, points, labelOffsetY)}`;
};

export function createMeasurementViewSvg({
    view,
    objects = [],
    planPage,
    dxf,
    measurementLabelOffsetY = -30
} = {}) {
    const planSource = planPage?.dataUrl || planPage?.url || "";
    const dxfShapes = dxf?.shapes ?? [];
    const background = planSource
        ? `<image href="${escapeXml(planSource)}" x="${PLAN_FRAME.x}" y="${PLAN_FRAME.y}" width="${PLAN_FRAME.width}" height="${PLAN_FRAME.height}" preserveAspectRatio="xMidYMid meet"/>`
        : "";
    const reference = dxfShapes.length
        ? dxfShapes.map(shape => renderDxfShape(shape, view?.dxfTransform)).join("")
        : !planSource
            ? FALLBACK_SEGMENTS.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join("")
            : "";
    const viewObjects = objects
        .filter(object => String(object?.viewId) === String(view?.id))
        .map(object => renderObject(object, finite(measurementLabelOffsetY, -30)))
        .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/><defs><clipPath id="plan-frame"><rect x="${PLAN_FRAME.x}" y="${PLAN_FRAME.y}" width="${PLAN_FRAME.width}" height="${PLAN_FRAME.height}"/></clipPath></defs><g clip-path="url(#plan-frame)">${background}<g fill="none" stroke="#5a646a" stroke-width="2">${reference}</g>${viewObjects}</g></svg>`;
    return { svg, width: WIDTH, height: HEIGHT };
}

export function measurementViewSvgDataUrl(options) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createMeasurementViewSvg(options).svg)}`;
}
