import { flattenPartList } from "../../src/cnc/flattenPartList.js";
import { getCncProgramSignature } from "../../src/cnc/getCncProgramSignature.js";
import { expandCncMachiningVariants } from "../../src/cnc/machiningVariants.js";
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

const operationSvg = (operation, partWidth) => {
    const type = String(operation?.type ?? "").toUpperCase();
    if (["BO", "DRILL", "VB", "VBH", "LR", "LEGRABOX"].includes(type)) return drillSvg(operation);
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

export function createCncProgramSvg(program) {
    const part = program?.part ?? program;
    const width = Math.max(1, finiteNumber(part?.L, 600));
    const height = Math.max(1, finiteNumber(part?.B, 400));
    // Keep enough room for dimensions without shrinking the actual program
    // graphic. The labels themselves are positioned well inside this margin.
    const padding = Math.max(70, Math.min(width, height) * 0.18);
    const viewBox = [-padding, -padding, width + padding * 2, height + padding * 2];
    const operations = Array.isArray(part?.CNC?.operations) ? part.CNC.operations : [];
    const operationLines = operations.map(operation => operationSvg(operation, width)).join("");
    const dimensionFont = 42;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}" width="${viewBox[2]}" height="${viewBox[3]}">
      <rect x="${-padding}" y="${-padding}" width="${viewBox[2]}" height="${viewBox[3]}" fill="#fff"/>
      <g fill="none" stroke="#17242b" stroke-width="2.2" vector-effect="non-scaling-stroke">
        <rect x="0" y="0" width="${width}" height="${height}"/>
        <line x1="0" y1="${height + padding * 0.42}" x2="${width}" y2="${height + padding * 0.42}"/>
        <line x1="0" y1="${height + padding * 0.28}" x2="0" y2="${height + padding * 0.58}"/>
        <line x1="${width}" y1="${height + padding * 0.28}" x2="${width}" y2="${height + padding * 0.58}"/>
        <line x1="${-padding * 0.42}" y1="0" x2="${-padding * 0.42}" y2="${height}"/>
        <line x1="${-padding * 0.58}" y1="0" x2="${-padding * 0.28}" y2="0"/>
        <line x1="${-padding * 0.58}" y1="${height}" x2="${-padding * 0.28}" y2="${height}"/>
      </g>
      <g fill="none" stroke="#253942" stroke-width="3" vector-effect="non-scaling-stroke">${operationLines}</g>
      <g fill="#17242b" font-family="Arial, sans-serif" font-size="${dimensionFont}" text-anchor="middle">
        <text x="${width / 2}" y="${height + padding * 0.7}" font-weight="600">${escapeXml(fmt(width))} mm</text>
        <text x="${-padding * 0.6}" y="${height / 2}" dominant-baseline="middle" font-weight="600" transform="rotate(-90 ${-padding * 0.6} ${height / 2})">${escapeXml(fmt(height))} mm</text>
      </g>
    </svg>`;
    return { svg, width: viewBox[2], height: viewBox[3] };
}
