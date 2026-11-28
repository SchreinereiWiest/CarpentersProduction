import { flattenPartList } from "../../src/cnc/flattenPartList.js";
import { getCncProgramSignature } from "../../src/cnc/getCncProgramSignature.js";
import { expandCncMachiningVariants } from "../../src/cnc/machiningVariants.js";
import { neutralOperationToViewer } from "../../src/postprocessor/machiningModel.js";
import { escapeXml, finiteNumber } from "./svgUtils.js";

const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const fmt = value => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(number(value));

const drillSvg = operation => {
    const x = number(operation.x, NaN);
    const y = number(operation.y, NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
    const columns = Math.max(1, Math.floor(number(operation.columns, 1)));
    const rows = Math.max(1, Math.floor(number(operation.rows, 1)));
    const repetitions = Math.max(1, Math.floor(number(operation.R ?? operation.r, 1)));
    const xOffset = number(operation.XOffset ?? operation.xOffset);
    const yOffset = number(operation.YOffset ?? operation.yOffset);
    const radius = Math.max(2, number(operation.diameter, 5) / 2);
    const points = operation.columns != null || operation.rows != null
        ? Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => ({
            x: x + column * xOffset,
            y: y + row * yOffset
        }))).flat()
        : Array.from({ length: repetitions }, (_, index) => ({ x: x + index * xOffset, y: y + index * yOffset }));
    return points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="${radius}"/>`).join("");
};

const linearDrillSvg = operation => {
    const x = number(operation.x ?? operation.position, NaN);
    const y = number(operation.rowStart ?? operation.y, NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
    const count = Math.max(1, Math.floor(number(operation.count, 3)));
    const spacing = number(operation.spacing);
    const radius = Math.max(2, number(operation.diameter, 5) / 2);
    return Array.from({ length: count }, (_, index) => (
        `<circle cx="${x}" cy="${y + index * spacing}" r="${radius}"/>`
    )).join("");
};

const edgeDrillSvg = (operation, partWidth) => {
    const positions = Array.isArray(operation.positions) ? operation.positions : [];
    const right = String(operation.side ?? operation.edge ?? "left").toLowerCase() === "right";
    const x = right ? partWidth : 0;
    const direction = right ? -1 : 1;
    const depth = Math.max(0, number(operation.depth, 15));
    const radius = Math.max(2, number(operation.diameter, 8) / 2);
    return positions.map(value => {
        const y = number(value, NaN);
        if (!Number.isFinite(y)) return "";
        return `<line x1="${x}" y1="${y}" x2="${x + direction * depth}" y2="${y}"/><circle cx="${x}" cy="${y}" r="${radius}"/>`;
    }).join("");
};

const drillRowSvg = operation => {
    const start = number(operation.start, NaN);
    const end = number(operation.end, NaN);
    const spacing = number(operation.spacing, 32);
    const crossPositions = Array.isArray(operation.crossPositions)
        ? operation.crossPositions
        : [operation.frontOffset ?? operation.y, operation.backOffset ?? operation.y];
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(spacing > 0)) return "";
    const radius = Math.max(2, number(operation.diameter, 5) / 2);
    const axis = String(operation.axis ?? "x").toLowerCase();
    const circles = [];
    for (let position = start, count = 0; position <= end + 0.001 && count < 1000; position += spacing, count += 1) {
        crossPositions.forEach(crossPosition => {
            const cross = number(crossPosition, NaN);
            if (!Number.isFinite(cross)) return;
            const x = axis === "y" ? cross : position;
            const y = axis === "y" ? position : cross;
            circles.push(`<circle cx="${x}" cy="${y}" r="${radius}"/>`);
        });
    }
    return circles.join("");
};

const viewerOperation = operation => {
    if (!operation?.kind) return operation;
    try {
        return neutralOperationToViewer(operation) ?? operation;
    } catch {
        return operation;
    }
};

const operationSvg = (operation, partWidth) => {
    operation = viewerOperation(operation);
    const type = String(operation?.type ?? "").toUpperCase();
    if (["BO", "DRILL", "LGBOX", "LEGRABOX"].includes(type)) return drillSvg(operation);
    if (type === "VB") return linearDrillSvg(operation);
    if (type === "VBH") return edgeDrillSvg(operation, partWidth);
    if (type === "LR") return drillRowSvg(operation);
    if (type === "RNT") {
        const y = number(operation.y, NaN);
        if (!Number.isFinite(y)) return "";
        return `<line x1="${number(operation.x)}" y1="${y}" x2="${number(operation.endX, partWidth)}" y2="${y}"/>`;
    }
    if (["XL2P", "LINE"].includes(type)) {
        return `<line x1="${number(operation.startX ?? operation.x)}" y1="${number(operation.startY ?? operation.y)}" x2="${number(operation.endX, partWidth)}" y2="${number(operation.endY ?? operation.y)}"/>`;
    }
    if (type === "ARC") {
        const x1 = number(operation.startX);
        const y1 = number(operation.startY);
        const x2 = number(operation.endX);
        const y2 = number(operation.endY);
        const radius = Math.max(1, number(operation.radius, Math.hypot(x1 - number(operation.centerX), y1 - number(operation.centerY))));
        return `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}"/>`;
    }
    const x = number(operation.x ?? operation.startX, NaN);
    const y = number(operation.y ?? operation.startY, NaN);
    return Number.isFinite(x) && Number.isFinite(y) ? `<circle cx="${x}" cy="${y}" r="4"/>` : "";
};

export function getCncPrograms(partList = []) {
    const programs = new Map();
    flattenPartList(partList).flatMap(expandCncMachiningVariants).forEach(part => {
        const operations = Array.isArray(part?.CNC?.operations) ? part.CNC.operations : [];
        if (!operations.length) return;
        const signature = getCncProgramSignature(part);
        const key = `${part.L}x${part.B}|${signature}`;
        const cabinetName = part.cabinetName || part.korpusName || part.CabinetName || "";
        if (!programs.has(key)) {
            programs.set(key, {
                id: String(part.PID ?? `cnc-${programs.size + 1}`),
                label: String(part.Objektname || part.PID || `CNC-Programm ${programs.size + 1}`),
                part,
                quantity: 0,
                cabinetNames: []
            });
        }
        const program = programs.get(key);
        program.quantity += Math.max(1, number(part.Anzahl, 1));
        if (cabinetName && !program.cabinetNames.includes(cabinetName)) program.cabinetNames.push(cabinetName);
    });
    return [...programs.values()];
}

export function createCncProgramSvg(program, { showDimensions = true } = {}) {
    const part = program?.part ?? program;
    const width = Math.max(1, finiteNumber(part?.L, 600));
    const height = Math.max(1, finiteNumber(part?.B, 400));
    // Keep enough room for dimensions without shrinking the actual program
    // graphic. The labels themselves are positioned well inside this margin.
    const padding = showDimensions ? Math.max(70, Math.min(width, height) * 0.18) : 0;
    const viewBox = [-padding, -padding, width + padding * 2, height + padding * 2];
    const operations = Array.isArray(part?.CNC?.operations) ? part.CNC.operations : [];
    const operationLines = operations.map(operation => operationSvg(operation, width)).join("");
    const dimensionFont = 42;
    const outerRect = showDimensions
        ? `<rect x="0" y="0" width="${width}" height="${height}"/>`
        : `<rect x="1.1" y="1.1" width="${Math.max(0, width - 2.2)}" height="${Math.max(0, height - 2.2)}"/>`;
    const dimensions = showDimensions ? `
      <g fill="none" stroke="#17242b" stroke-width="2.2" vector-effect="non-scaling-stroke">
        <line x1="0" y1="${height + padding * 0.42}" x2="${width}" y2="${height + padding * 0.42}"/>
        <line x1="0" y1="${height + padding * 0.28}" x2="0" y2="${height + padding * 0.58}"/>
        <line x1="${width}" y1="${height + padding * 0.28}" x2="${width}" y2="${height + padding * 0.58}"/>
        <line x1="${-padding * 0.42}" y1="0" x2="${-padding * 0.42}" y2="${height}"/>
        <line x1="${-padding * 0.58}" y1="0" x2="${-padding * 0.28}" y2="0"/>
        <line x1="${-padding * 0.58}" y1="${height}" x2="${-padding * 0.28}" y2="${height}"/>
      </g>
      <g fill="#17242b" font-family="Arial, sans-serif" font-size="${dimensionFont}" text-anchor="middle">
        <text x="${width / 2}" y="${height + padding * 0.7}" font-weight="600">${escapeXml(fmt(width))} mm</text>
        <text x="${-padding * 0.6}" y="${height / 2}" dominant-baseline="middle" font-weight="600" transform="rotate(-90 ${-padding * 0.6} ${height / 2})">${escapeXml(fmt(height))} mm</text>
      </g>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}" width="${viewBox[2]}" height="${viewBox[3]}">
      <rect x="${-padding}" y="${-padding}" width="${viewBox[2]}" height="${viewBox[3]}" fill="#fff"/>
      <g fill="none" stroke="#17242b" stroke-width="2.2" vector-effect="non-scaling-stroke">
        ${outerRect}
      </g>
      <g fill="none" stroke="#253942" stroke-width="3" vector-effect="non-scaling-stroke">${operationLines}</g>
      ${dimensions}
    </svg>`;
    return { svg, width: viewBox[2], height: viewBox[3] };
}
