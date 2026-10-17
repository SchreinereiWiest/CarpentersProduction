import { escapeXml, finiteNumber, safeSvgColor } from "./svgUtils.js";

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

    strips.forEach(strip => {
        const layout = stripLayout(strip, settings);
        const stripX = finiteNumber(strip.x);
        const stripY = finiteNumber(strip.y);
        const stripWidth = finiteNumber(strip.placedWidth, layout.width);
        const stripHeight = finiteNumber(strip.placedHeight, layout.height);
        parts.push(`<rect x="${stripX}" y="${stripY}" width="${stripWidth}" height="${stripHeight}" fill="#2ecc71" stroke="#14532d" stroke-width="${Math.max(1, 2 / scale)}"/>`);

        layout.items.forEach(item => {
            parts.push(`<rect x="${stripX + item.x}" y="${stripY + item.y}" width="${item.width}" height="${item.height}" fill="${safeSvgColor(item.plate.color)}" stroke="#111827" stroke-width="${Math.max(0.8, 1.5 / scale)}"/>`);
        });

        const centerX = stripX + stripWidth / 2;
        const centerY = stripY + stripHeight / 2;
        parts.push(
            `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="70" font-weight="700" fill="#111111">[${escapeXml(strip.id ?? "")}]</text>`,
            `<text x="${centerX}" y="${centerY + 85}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="55" fill="#111111">${Math.round(stripWidth)} × ${Math.round(stripHeight)}</text>`
        );
    });

    if (!strips.length) {
        (plate.plates ?? []).forEach(part => {
            parts.push(`<rect x="${finiteNumber(part.x)}" y="${finiteNumber(part.y)}" width="${finiteNumber(part.placedWidth ?? part.width)}" height="${finiteNumber(part.placedHeight ?? part.height)}" fill="${safeSvgColor(part.color)}" stroke="#111827" stroke-width="${Math.max(0.8, 1.5 / scale)}"/>`);
        });
    }

    const freeSpaces = (plate.freeSpaces ?? []).map(space => (
        `<rect x="${finiteNumber(space.x)}" y="${finiteNumber(space.y)}" width="${finiteNumber(space.width)}" height="${finiteNumber(space.height)}" fill="#e74c3c" fill-opacity="0.65"/>`
    )).join("");
    const material = shortText(group.MID || group.storageMaterialName || settings.defaultSheet?.material || "Material");
    const thickness = group.T != null ? ` · ${finiteNumber(group.T)} mm` : "";
    const label = `${material}${thickness} · Platte ${plateIndex + 1}`;

    return [
        `<text x="${cell.x + cell.width / 2}" y="${cell.y + 23}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1f2937">${escapeXml(label)}</text>`,
        `<clipPath id="${clipId}"><rect x="0" y="0" width="${plateWidth}" height="${plateHeight}"/></clipPath>`,
        `<g transform="${transform}" clip-path="url(#${clipId})">`,
        `<rect x="0" y="0" width="${plateWidth}" height="${plateHeight}" fill="#333333"/>`,
        freeSpaces,
        parts.join(""),
        `</g>`,
        `<rect x="${originX}" y="${originY}" width="${drawWidth}" height="${drawHeight}" fill="none" stroke="#111827" stroke-width="2"/>`
    ].join("");
};

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
