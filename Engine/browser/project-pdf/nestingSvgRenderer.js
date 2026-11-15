import { escapeXml, finiteNumber } from "./svgUtils.js";
import { createPlateCutPlan } from "../../src/nesting/cutPlan.js";

const shortText = (value, maxLength = 38) => {
    const text = String(value ?? "").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const stripLayout = (strip, settings = {}) => {
    const layoutType = strip.layoutType ?? strip.type ?? "vertical";
    const rotated = finiteNumber(strip.rotation) === 90;
    const firstPlate = strip.plates?.[0];
    const firstWidth = finiteNumber(firstPlate?.originalWidth ?? firstPlate?.width);
    const inferredGap = firstPlate
        ? Math.max(0, finiteNumber(firstPlate.width) - firstWidth)
        : 0;
    const partGap = finiteNumber(strip.partGap ?? settings.gap ?? inferredGap);
    const cutGap = finiteNumber(strip.cutGap ?? settings.cutGap);
    let currentX = 0;
    let currentY = 0;
    let baseWidth = 0;
    let baseHeight = 0;
    const packed2d = strip.packingMode === "2d";

    const items = (strip.plates ?? []).map(plate => {
        const originalWidth = finiteNumber(plate.originalWidth ?? plate.width);
        const originalHeight = finiteNumber(plate.originalHeight ?? plate.height);

        if (packed2d) {
            const itemRotated = finiteNumber(plate.nestingRotation) === 90;
            const width = itemRotated ? originalHeight : originalWidth;
            const height = itemRotated ? originalWidth : originalHeight;
            const footprintWidth = finiteNumber(plate.nestingFootprintWidth ?? plate.width, width);
            const footprintHeight = finiteNumber(plate.nestingFootprintHeight ?? plate.height, height);
            return {
                plate,
                x: finiteNumber(plate.nestingX) + (footprintWidth - width) / 2,
                y: finiteNumber(plate.nestingY) + (footprintHeight - height) / 2,
                width,
                height
            };
        }

        const footprintWidth = finiteNumber(plate.width, originalWidth + partGap);
        const footprintHeight = finiteNumber(plate.height, originalHeight + partGap);
        const width = layoutType === "horizontal" ? originalHeight : originalWidth;
        const height = layoutType === "horizontal" ? originalWidth : originalHeight;
        let x;
        let y;

        if (layoutType === "horizontal") {
            x = currentX + (footprintHeight - width) / 2;
            y = (footprintWidth - height) / 2;
            currentX += footprintHeight + cutGap;
            baseHeight = Math.max(baseHeight, footprintWidth);
        } else {
            x = (footprintWidth - width) / 2;
            y = currentY + (footprintHeight - height) / 2;
            currentY += footprintHeight + cutGap;
            baseWidth = Math.max(baseWidth, footprintWidth);
        }

        return { plate, x, y, width, height };
    });

    if (packed2d) {
        baseWidth = finiteNumber(strip.width ?? strip.placedWidth);
        baseHeight = finiteNumber(strip.height ?? strip.placedHeight);
    } else if (layoutType === "horizontal") {
        baseWidth = Math.max(0, currentX - (items.length ? cutGap : 0));
    } else {
        baseHeight = Math.max(0, currentY - (items.length ? cutGap : 0));
    }

    return {
        width: rotated ? baseHeight : baseWidth,
        height: rotated ? baseWidth : baseHeight,
        items: items.map(item => rotated ? {
            ...item,
            x: baseHeight - item.y - item.height,
            y: item.x,
            width: item.height,
            height: item.width
        } : item)
    };
};

export const getNestingPlateEntries = nesting => (nesting ?? []).flatMap((group, groupIndex) => (
    (group.nestingPlates ?? []).map((plate, plateIndex) => ({ group, groupIndex, plate, plateIndex }))
));

const renderPlate = (entry, cell, clipId) => {
    const { group, plate, plateIndex } = entry;
    const plateWidth = Math.max(1, finiteNumber(plate.placedWidth ?? plate.width ?? group.settings?.defaultSheet?.width, 1));
    const plateHeight = Math.max(1, finiteNumber(plate.placedHeight ?? plate.height ?? group.settings?.defaultSheet?.height, 1));
    const labelHeight = 34;
    const padding = 14;
    const scale = Math.min(
        (cell.width - padding * 2) / plateWidth,
        (cell.height - labelHeight - padding * 2) / plateHeight
    );
    const drawWidth = plateWidth * scale;
    const drawHeight = plateHeight * scale;
    const originX = cell.x + (cell.width - drawWidth) / 2;
    const originY = cell.y + labelHeight + (cell.height - labelHeight - drawHeight) / 2;
    const transform = `translate(${originX} ${originY}) scale(${scale})`;
    const settings = group.settings ?? {};
    const strips = plate.strips ?? (group.strips ?? []).filter(strip => String(strip.sheet) === String(plate.id));
    const parts = [];
    const stripDimensions = [];

    strips.forEach(strip => {
        const layout = stripLayout(strip, settings);
        const stripX = finiteNumber(strip.x);
        const stripY = finiteNumber(strip.y);
        const stripWidth = finiteNumber(strip.placedWidth, layout.width);
        const stripHeight = finiteNumber(strip.placedHeight, layout.height);
        parts.push(`<rect x="${stripX}" y="${stripY}" width="${stripWidth}" height="${stripHeight}" fill="none" stroke="#6b7280" stroke-dasharray="${Math.max(4, 10 / scale)} ${Math.max(3, 7 / scale)}" stroke-width="${Math.max(1, 1.5 / scale)}"/>`);

        layout.items.forEach(item => {
            const label = shortText(item.plate.original?.Objektname || item.plate.Objektname || item.plate.id || "Bauteil", 22);
            parts.push(
                `<rect x="${stripX + item.x}" y="${stripY + item.y}" width="${item.width}" height="${item.height}" fill="#f3f4f6" stroke="#111827" stroke-width="${Math.max(0.8, 1.5 / scale)}"/>`,
                `<text x="${stripX + item.x + item.width / 2}" y="${stripY + item.y + item.height / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${Math.max(22, Math.min(52, Math.min(item.width, item.height) / 5))}" fill="#111827">${escapeXml(label)}</text>`
            );
        });

        const centerX = stripX + stripWidth / 2;
        const centerY = stripY + stripHeight / 2;
        const dimensionText = `${Math.round(stripWidth)} × ${Math.round(stripHeight)}`;
        const labelWidth = Math.max(150, dimensionText.length * 34);
        const labelHeight = 74;
        const desiredX = centerX + Math.min(90, stripWidth * 0.12);
        const desiredY = centerY - Math.min(65, stripHeight * 0.12);
        const labelX = stripWidth > labelWidth + 16
            ? Math.max(stripX + labelWidth / 2 + 8, Math.min(stripX + stripWidth - labelWidth / 2 - 8, desiredX))
            : centerX;
        const labelY = stripHeight > labelHeight + 16
            ? Math.max(stripY + labelHeight / 2 + 8, Math.min(stripY + stripHeight - labelHeight / 2 - 8, desiredY))
            : centerY;
        stripDimensions.push(
            `<rect data-strip-dimension-background="true" x="${labelX - labelWidth / 2}" y="${labelY - labelHeight / 2}" width="${labelWidth}" height="${labelHeight}" rx="8" fill="#ffffff" fill-opacity="0.94" stroke="#d1d5db" stroke-width="${Math.max(0.8, 1.2 / scale)}"/>`,
            `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="55" font-weight="700" fill="#111111">${dimensionText}</text>`
        );
    });

    if (!strips.length) {
        (plate.plates ?? []).forEach(part => {
            parts.push(`<rect x="${finiteNumber(part.x)}" y="${finiteNumber(part.y)}" width="${finiteNumber(part.placedWidth ?? part.width)}" height="${finiteNumber(part.placedHeight ?? part.height)}" fill="#f3f4f6" stroke="#111827" stroke-width="${Math.max(0.8, 1.5 / scale)}"/>`);
        });
    }

    const freeSpaces = (plate.freeSpaces ?? []).map(space => (
        `<rect x="${finiteNumber(space.x)}" y="${finiteNumber(space.y)}" width="${finiteNumber(space.width)}" height="${finiteNumber(space.height)}" fill="#ffffff" stroke="#d1d5db" stroke-width="${Math.max(0.5, 1 / scale)}"/>`
    )).join("");
    const cutPlan = createPlateCutPlan(group, plate, plateIndex);
    const cutLines = cutPlan.cuts.map(cut => {
        const vertical = cut.direction === "vertical";
        const x1 = vertical ? cut.position : cut.start;
        const y1 = vertical ? cut.start : cut.position;
        const x2 = vertical ? cut.position : cut.start + cut.length;
        const y2 = vertical ? cut.start + cut.length : cut.position;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000000" stroke-width="${Math.max(2, 4 / scale)}" stroke-dasharray="${Math.max(10, 18 / scale)} ${Math.max(6, 10 / scale)}"/>`;
    }).join("");
    const cutLabels = cutPlan.cuts.map(cut => {
        const vertical = cut.direction === "vertical";
        const centerX = vertical
            ? originX + cut.position * scale
            : originX + drawWidth + 11;
        const centerY = vertical
            ? originY - 11
            : originY + cut.position * scale;
        return `<g data-cut-number="${cut.number}" data-position="plate-edge"><circle cx="${centerX}" cy="${centerY}" r="9.5" fill="#ffffff" stroke="#000000" stroke-width="1.5"/><text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#000000">${cut.number}</text></g>`;
    }).join("");
    const material = shortText(group.MID || group.storageMaterialName || settings.defaultSheet?.material || "Material");
    const thickness = group.T != null ? ` · ${finiteNumber(group.T)} mm` : "";
    const label = `${material}${thickness} · Platte ${plateIndex + 1}`;

    return [
        `<text x="${cell.x + cell.width / 2}" y="${cell.y + 23}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1f2937">${escapeXml(label)}</text>`,
        `<clipPath id="${clipId}"><rect x="0" y="0" width="${plateWidth}" height="${plateHeight}"/></clipPath>`,
        `<g transform="${transform}" clip-path="url(#${clipId})">`,
        `<rect x="0" y="0" width="${plateWidth}" height="${plateHeight}" fill="#ffffff"/>`,
        freeSpaces,
        parts.join(""),
        cutLines,
        stripDimensions.join(""),
        `</g>`,
        `<rect x="${originX}" y="${originY}" width="${drawWidth}" height="${drawHeight}" fill="none" stroke="#111827" stroke-width="2"/>`,
        cutLabels
    ].join("");
};

export function createNestingPlateSvg(entry) {
    if (!entry?.group || !entry?.plate) return null;
    const width = 1200;
    const plateWidth = Math.max(1, finiteNumber(
        entry.plate.placedWidth ?? entry.plate.width ?? entry.group.settings?.defaultSheet?.width,
        1
    ));
    const plateHeight = Math.max(1, finiteNumber(
        entry.plate.placedHeight ?? entry.plate.height ?? entry.group.settings?.defaultSheet?.height,
        1
    ));
    const height = Math.max(560, Math.min(900, 100 + width * plateHeight / plateWidth));
    const content = renderPlate(entry, { x: 20, y: 20, width: width - 40, height: height - 40 }, "nesting-single-clip");
    return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>${content}</svg>`,
        width,
        height,
        plan: createPlateCutPlan(entry.group, entry.plate, entry.plateIndex)
    };
}

export function createNestingOverviewSvg(nesting) {
    const entries = getNestingPlateEntries(nesting);
    if (!entries.length) return null;

    const width = 1200;
    const columns = entries.length === 1
        ? 1
        : Math.max(2, Math.ceil(Math.sqrt(entries.length * 0.72)));
    const rows = Math.ceil(entries.length / columns);
    const margin = 20;
    const gap = 10;
    const cellWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
    const tallestPlateRatio = Math.min(1.25, Math.max(
        0.5,
        ...entries.map(({ group, plate }) => {
            const plateWidth = Math.max(1, finiteNumber(
                plate.placedWidth ?? plate.width ?? group.settings?.defaultSheet?.width,
                1
            ));
            const plateHeight = Math.max(1, finiteNumber(
                plate.placedHeight ?? plate.height ?? group.settings?.defaultSheet?.height,
                1
            ));
            return plateHeight / plateWidth;
        })
    ));
    const cellHeight = 62 + cellWidth * tallestPlateRatio;
    const height = margin * 2 + rows * cellHeight + gap * Math.max(0, rows - 1);
    const content = entries.map((entry, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return renderPlate(entry, {
            x: margin + column * (cellWidth + gap),
            y: margin + row * (cellHeight + gap),
            width: cellWidth,
            height: cellHeight
        }, `nesting-clip-${index}`);
    }).join("");

    return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>${content}</svg>`,
        width,
        height,
        count: entries.length
    };
}
