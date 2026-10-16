import { getLegraboxHeight } from "../cabinetConfigurator/cnc/legraboxDimensions.js";
import { getMiddleWallCenter } from "../cabinetConfigurator/geometry/middleWall.js";
import { escapeXml, finiteNumber } from "./svgUtils.js";

const formatNumber = value => new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1
}).format(finiteNumber(value));

const rectangle = ({ x, y, width, height, fill, stroke = "none", strokeWidth = 0 }) => (
    `<rect x="${x}" y="${y}" width="${Math.max(0, width)}" height="${Math.max(0, height)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
);

const renderFunction = (cabinet, section, func, cncConfig) => {
    const thickness = finiteNumber(cabinet.thickness, 19);
    const sectionX = finiteNumber(section.x);
    const sectionY = finiteNumber(section.y);
    const sectionWidth = finiteNumber(section.width);
    const sectionHeight = finiteNumber(section.height);

    if (func.type === "shelf") {
        const compartmentCount = Math.max(1, finiteNumber(func.compartmentCount, 1));
        const shelves = [];

        for (let index = 1; index < compartmentCount; index += 1) {
            shelves.push(rectangle({
                x: sectionX,
                y: sectionY + sectionHeight * index / compartmentCount - thickness / 2,
                width: sectionWidth,
                height: thickness,
                fill: "#d1d5db",
                stroke: "#374151",
                strokeWidth: 1.5
            }));
        }

        return shelves.join("");
    }

    if (func.type === "middleWall") {
        const center = getMiddleWallCenter({ wall: func, section, cabinet });

        if ((func.orientation ?? "horizontal") === "vertical") {
            return rectangle({
                x: center - thickness / 2,
                y: sectionY,
                width: thickness,
                height: sectionHeight,
                fill: "#d1d5db",
                stroke: "#374151",
                strokeWidth: 1.5
            });
        }

        return rectangle({
            x: sectionX,
            y: center - thickness / 2,
            width: sectionWidth,
            height: thickness,
            fill: "#d1d5db",
            stroke: "#374151",
            strokeWidth: 1.5
        });
    }

    if (func.type === "legrabox") {
        const boxHeight = getLegraboxHeight(cncConfig, func.variant ?? "M");
        const positionFromBottom = Math.max(0, finiteNumber(func.positionFromBottom, 40));
        const y = sectionY + sectionHeight - positionFromBottom - boxHeight + 37;
        const elements = [rectangle({
            x: sectionX,
            y,
            width: sectionWidth,
            height: boxHeight,
            fill: "#f8fafc",
            stroke: "#1f2937",
            strokeWidth: 2
        })];
        const doublingThickness = Math.max(0, finiteNumber(func.doubling?.thickness));

        if (func.doubling?.left && doublingThickness > 0) {
            elements.push(rectangle({
                x: sectionX,
                y,
                width: doublingThickness,
                height: boxHeight,
                fill: "#d1d5db",
                stroke: "#374151",
                strokeWidth: 1
            }));
        }

        if (func.doubling?.right && doublingThickness > 0) {
            elements.push(rectangle({
                x: sectionX + sectionWidth - doublingThickness,
                y,
                width: doublingThickness,
                height: boxHeight,
                fill: "#d1d5db",
                stroke: "#374151",
                strokeWidth: 1
            }));
        }

        return elements.join("");
    }

    return "";
};

const renderSections = (cabinet, sections, cncConfig, parentNumber = "") => (
    (sections ?? []).map((section, index) => {
        const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
        const x = finiteNumber(section.x);
        const y = finiteNumber(section.y);
        const width = finiteNumber(section.width);
        const height = finiteNumber(section.height);
        const fontSize = Math.max(18, Math.min(48, Math.min(width, height) / 4));
        const functions = (section.functionConfig ?? [])
            .map(func => renderFunction(cabinet, section, func, cncConfig))
            .join("");

        return [
            rectangle({ x, y, width, height, fill: "#ffffff", stroke: "#9ca3af", strokeWidth: 1.5 }),
            `<text x="${x + width / 2}" y="${y + height / 2}" fill="#6b7280" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(number)}</text>`,
            functions,
            renderSections(cabinet, section.children, cncConfig, number)
        ].join("");
    }).join("")
);

export function createCabinetSvg(cabinet, { cncConfig } = {}) {
    const width = Math.max(1, finiteNumber(cabinet.width, 600));
    const height = Math.max(1, finiteNumber(cabinet.height, 720));
    const thickness = Math.max(1, finiteNumber(cabinet.thickness, 19));
    const topOffset = Math.max(0, finiteNumber(cabinet.topOffset));
    const bottomOffset = Math.max(0, finiteNumber(cabinet.bottomOffset));
    const viewX = -130;
    const viewY = -45;
    const viewWidth = width + 260;
    const viewHeight = height + 190;
    const interiorWidth = Math.max(0, width - 2 * thickness);
    const elements = [
        rectangle({ x: viewX, y: viewY, width: viewWidth, height: viewHeight, fill: "#ffffff" }),
        rectangle({ x: 0, y: 0, width, height, fill: "#e5e7eb", stroke: "#111827", strokeWidth: 3 }),
        rectangle({
            x: thickness,
            y: thickness,
            width: interiorWidth,
            height: Math.max(0, height - 2 * thickness),
            fill: "#ffffff",
            stroke: "#6b7280",
            strokeWidth: 1.5
        })
    ];

    if (topOffset > 0) {
        elements.push(rectangle({ x: thickness, y: 0, width: interiorWidth, height: topOffset, fill: "#ffffff" }));
    }

    if (bottomOffset > 0) {
        elements.push(rectangle({
            x: thickness,
            y: height - bottomOffset,
            width: interiorWidth,
            height: bottomOffset,
            fill: "#ffffff"
        }));
    }

    if (cabinet.topExists ?? true) {
        elements.push(rectangle({
            x: thickness,
            y: topOffset,
            width: interiorWidth,
            height: thickness,
            fill: "#d1d5db",
            stroke: "#111827",
            strokeWidth: 1.5
        }));
    }

    if (cabinet.bottomExists ?? true) {
        elements.push(rectangle({
            x: thickness,
            y: height - bottomOffset - thickness,
            width: interiorWidth,
            height: thickness,
            fill: "#d1d5db",
            stroke: "#111827",
            strokeWidth: 1.5
        }));
    }

    elements.push(renderSections(cabinet, cabinet.sections, cncConfig));
    elements.push(
        `<g fill="none" stroke="#374151" stroke-width="2">`,
        `<line x1="-55" y1="0" x2="-55" y2="${height}"/>`,
        `<line x1="-70" y1="0" x2="-40" y2="0"/><line x1="-70" y1="${height}" x2="-40" y2="${height}"/>`,
        `<line x1="0" y1="${height + 55}" x2="${width}" y2="${height + 55}"/>`,
        `<line x1="0" y1="${height + 40}" x2="0" y2="${height + 70}"/><line x1="${width}" y1="${height + 40}" x2="${width}" y2="${height + 70}"/>`,
        `</g>`,
        `<g fill="#374151" font-size="${Math.max(28, Math.min(48, width / 10))}" text-anchor="middle" font-family="Arial, sans-serif">`,
        `<text x="-82" y="${height / 2}" transform="rotate(-90 -82 ${height / 2})">${escapeXml(formatNumber(height))} mm</text>`,
        `<text x="${width / 2}" y="${height + 112}">${escapeXml(formatNumber(width))} mm</text>`,
        `</g>`
    );

    return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="${viewHeight}" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}">${elements.join("")}</svg>`,
        width: viewWidth,
        height: viewHeight
    };
}

const collectSections = (sections, parentNumber = "", target = []) => {
    (sections ?? []).forEach((section, index) => {
        const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
        target.push({ section, number });
        collectSections(section.children, number, target);
    });
    return target;
};

export function getCabinetFunctionLines(cabinet) {
    const sections = collectSections(cabinet.sections)
        .sort((left, right) => (
            finiteNumber(left.section.y) - finiteNumber(right.section.y) ||
            finiteNumber(left.section.x) - finiteNumber(right.section.x) ||
            left.number.localeCompare(right.number, "de", { numeric: true })
        ));
    const lines = [];

    sections.forEach(({ section, number }) => {
        (section.functionConfig ?? []).forEach(func => {
            if (func.type === "legrabox") {
                const parts = [`${number} · Legrabox ${func.variant ?? "M"}`];
                const inside = finiteNumber(func.doubling?.insideRightOffset);
                if (inside !== 0) parts.push(`innenliegend: ${formatNumber(inside)} mm`);
                parts.push(`Abstand von unten: ${formatNumber(func.positionFromBottom ?? 40)} mm`);
                lines.push(parts.join(" · "));
                return;
            }

            if (func.type === "middleWall") {
                const orientation = (func.orientation ?? "horizontal") === "vertical"
                    ? "vertikal"
                    : "horizontal";
                lines.push(`${number} · Mittelwand ${orientation} · Abstand: ${formatNumber(func.positionOffset)} mm`);
                return;
            }

            if (func.type === "shelf") {
                const shelfCount = Math.max(0, finiteNumber(func.compartmentCount, 1) - 1);
                lines.push(`${number} · Lochreihe · Fachböden Anzahl: ${formatNumber(shelfCount)}`);
            }
        });
    });

    return lines;
}

const materialLabel = (materials, id) => {
    if (!id) return "–";
    const material = (materials ?? []).find(item => String(item.id) === String(id));
    if (!material) return String(id);
    return material.materialNumber
        ? `${material.name} (${material.materialNumber})`
        : material.name;
};

const CONSTRUCTION_LABELS = {
    butt: "Stumpf",
    rabbet: "Falz",
    groove: "Nut geschlossen",
    grooveOpen: "Nut oben offen"
};

export function getCabinetInformation(cabinet, materials = []) {
    return [
        ["Außenmaße", `${formatNumber(cabinet.width)} × ${formatNumber(cabinet.height)} × ${formatNumber(cabinet.depth)} mm`],
        ["Menge", formatNumber(cabinet.quantity ?? 1)],
        ["Korpusmaterial", materialLabel(materials, cabinet.materialId)],
        ["Frontmaterial", materialLabel(materials, cabinet.frontMaterialId)],
        ["Frontkante", materialLabel(materials, cabinet.frontEdgeMaterialId)],
        ["Kante oben", materialLabel(materials, cabinet.edgeTopMaterialId)],
        ["Kante unten", materialLabel(materials, cabinet.edgeBottomMaterialId)],
        ["Ausführung", CONSTRUCTION_LABELS[cabinet.backPanel?.construction] ?? cabinet.backPanel?.construction ?? "–"],
        ["Geschraubt", (cabinet.spax ?? true) ? "Ja" : "Nein"]
    ];
}
