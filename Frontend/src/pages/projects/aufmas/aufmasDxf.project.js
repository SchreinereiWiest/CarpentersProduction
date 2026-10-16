const numeric = value => {
    const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};

const pairsFromText = text => {
    const rows = text.replace(/\r/g, "").split("\n");
    const pairs = [];
    for (let index = 0; index < rows.length - 1; index += 2) {
        pairs.push({ code: Number.parseInt(rows[index].trim(), 10), value: rows[index + 1].trim() });
    }
    return pairs;
};

const entityGroups = pairs => {
    const groups = [];
    let inEntities = false;
    let current = null;

    for (let index = 0; index < pairs.length; index += 1) {
        const pair = pairs[index];
        if (pair.code === 0 && pair.value === "SECTION" && pairs[index + 1]?.value === "ENTITIES") {
            inEntities = true;
            index += 1;
            continue;
        }
        if (inEntities && pair.code === 0 && pair.value === "ENDSEC") break;
        if (!inEntities) continue;
        if (pair.code === 0) {
            if (current) groups.push(current);
            current = { type: pair.value, values: [] };
        } else if (current) {
            current.values.push(pair);
        }
    }
    if (current) groups.push(current);
    return groups;
};

const firstValue = (values, code) => numeric(values.find(pair => pair.code === code)?.value);

export const DEFAULT_MIN_SNAP_CONNECTIONS = 3;
export const MAX_SNAP_POINTS = 500;

export function parseDxf(text, options = {}) {
    const shapes = [];

    entityGroups(pairsFromText(text)).forEach(entity => {
        if (entity.type === "LINE") {
            shapes.push({
                type: "line",
                x1: firstValue(entity.values, 10),
                y1: firstValue(entity.values, 20),
                x2: firstValue(entity.values, 11),
                y2: firstValue(entity.values, 21)
            });
            return;
        }

        if (entity.type === "LWPOLYLINE") {
            const points = [];
            let point = null;
            entity.values.forEach(pair => {
                if (pair.code === 10) {
                    if (point) points.push(point);
                    point = { x: numeric(pair.value), y: 0 };
                } else if (pair.code === 20 && point) {
                    point.y = numeric(pair.value);
                }
            });
            if (point) points.push(point);
            const closed = (Number.parseInt(entity.values.find(pair => pair.code === 70)?.value ?? "0", 10) & 1) === 1;
            points.slice(1).forEach((nextPoint, index) => {
                const previousPoint = points[index];
                shapes.push({ type: "line", x1: previousPoint.x, y1: previousPoint.y, x2: nextPoint.x, y2: nextPoint.y });
            });
            if (closed && points.length > 2) {
                const first = points[0];
                const last = points[points.length - 1];
                shapes.push({ type: "line", x1: last.x, y1: last.y, x2: first.x, y2: first.y });
            }
            return;
        }

        if (entity.type === "CIRCLE") {
            shapes.push({
                type: "circle",
                cx: firstValue(entity.values, 10),
                cy: firstValue(entity.values, 20),
                radius: Math.abs(firstValue(entity.values, 40))
            });
        }
    });

    return normaliseDxf(shapes, 1000, 650, 54, options);
}

const sourceBounds = shapes => {
    const bounds = {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY
    };
    const include = (x, y) => {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
    };

    shapes.forEach(shape => {
        if (shape.type === "circle") {
            include(shape.cx - shape.radius, shape.cy - shape.radius);
            include(shape.cx + shape.radius, shape.cy + shape.radius);
        } else {
            include(shape.x1, shape.y1);
            include(shape.x2, shape.y2);
        }
    });
    return bounds;
};

const connectedLineJunctions = (shapes, bounds, minConnections, maxSnapPoints) => {
    const drawingSize = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
    const tolerance = Math.max(drawingSize * 0.00001, 0.001);
    const buckets = new Map();
    const junctions = [];
    const bucketKey = (x, y) => `${x}:${y}`;

    const findOrCreateJunction = point => {
        const bucketX = Math.round(point.x / tolerance);
        const bucketY = Math.round(point.y / tolerance);
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
                const bucket = buckets.get(bucketKey(bucketX + offsetX, bucketY + offsetY)) ?? [];
                const match = bucket.find(junction => Math.hypot(junction.x - point.x, junction.y - point.y) <= tolerance);
                if (match) {
                    match.samples += 1;
                    match.x += (point.x - match.x) / match.samples;
                    match.y += (point.y - match.y) / match.samples;
                    return match;
                }
            }
        }

        const junction = { x: point.x, y: point.y, samples: 1, connections: 0 };
        junctions.push(junction);
        const key = bucketKey(bucketX, bucketY);
        buckets.set(key, [...(buckets.get(key) ?? []), junction]);
        return junction;
    };

    shapes.forEach(shape => {
        if (shape.type !== "line") return;
        const connected = new Set([
            findOrCreateJunction({ x: shape.x1, y: shape.y1 }),
            findOrCreateJunction({ x: shape.x2, y: shape.y2 })
        ]);
        connected.forEach(junction => { junction.connections += 1; });
    });

    const eligible = junctions
        .filter(junction => junction.connections >= minConnections)
        .sort((first, second) => second.connections - first.connections);

    return {
        candidates: junctions.length,
        eligible: eligible.length,
        points: eligible.slice(0, maxSnapPoints),
        referencePoints: [...junctions]
            .sort((first, second) => second.connections - first.connections)
            .slice(0, 10000),
        referenceTruncated: junctions.length > 10000,
        truncated: eligible.length > maxSnapPoints,
        tolerance
    };
};

export function normaliseDxf(
    shapes,
    width = 1000,
    height = 650,
    padding = 54,
    { minConnections = DEFAULT_MIN_SNAP_CONNECTIONS, maxSnapPoints = MAX_SNAP_POINTS } = {}
) {
    if (!shapes.length) {
        return {
            shapes: [],
            snapPoints: [],
            referencePoints: [],
            bounds: null,
            snapStats: { candidates: 0, eligible: 0, rendered: 0, truncated: false, minConnections }
        };
    }

    const { minX, maxX, minY, maxY } = sourceBounds(shapes);
    const scale = Math.min(
        (width - padding * 2) / Math.max(maxX - minX, 1),
        (height - padding * 2) / Math.max(maxY - minY, 1)
    );
    const offsetX = (width - (maxX - minX) * scale) / 2;
    const offsetY = (height - (maxY - minY) * scale) / 2;
    const point = (x, y) => ({
        x: offsetX + (x - minX) * scale,
        y: height - (offsetY + (y - minY) * scale)
    });

    const normalised = shapes.map(shape => {
        if (shape.type === "circle") {
            const center = point(shape.cx, shape.cy);
            return { ...shape, cx: center.x, cy: center.y, radius: shape.radius * scale };
        }
        const start = point(shape.x1, shape.y1);
        const end = point(shape.x2, shape.y2);
        return { ...shape, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
    });
    const junctionResult = connectedLineJunctions(
        shapes,
        { minX, maxX, minY, maxY },
        Math.max(1, minConnections),
        Math.max(1, maxSnapPoints)
    );
    const snapPoints = junctionResult.points.map(junction => ({
        ...point(junction.x, junction.y),
        connections: junction.connections
    }));
    const referencePoints = junctionResult.referencePoints.map(junction => ({
        ...point(junction.x, junction.y),
        connections: junction.connections
    }));

    return {
        shapes: normalised,
        snapPoints,
        referencePoints,
        bounds: { minX, maxX, minY, maxY, scale },
        snapStats: {
            candidates: junctionResult.candidates,
            eligible: junctionResult.eligible,
            rendered: snapPoints.length,
            truncated: junctionResult.truncated,
            referenceTruncated: junctionResult.referenceTruncated,
            minConnections,
            tolerance: junctionResult.tolerance
        }
    };
}
