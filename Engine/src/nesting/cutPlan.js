import { getStripLayout } from "./placement/manualStripPlacement.js";

const finite = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const rounded = (value) => Math.round(finite(value) * 10) / 10;

const cutKey = (cut) => [
  cut.direction,
  rounded(cut.position),
  rounded(cut.start),
  rounded(cut.length)
].join(":");

const normalizeCut = (cut, sourceIndex) => {
  const width = Math.max(0, finite(cut?.width));
  const height = Math.max(0, finite(cut?.height));
  if (width <= 0 || height <= 0) return null;

  const direction = height >= width ? "vertical" : "horizontal";
  const position = direction === "vertical"
    ? finite(cut.x) + width / 2
    : finite(cut.y) + height / 2;
  const start = direction === "vertical" ? finite(cut.y) : finite(cut.x);
  const length = direction === "vertical" ? height : width;

  return {
    direction,
    position: rounded(position),
    start: rounded(start),
    length: rounded(length),
    kerf: rounded(Math.min(width, height)),
    stripId: cut.stripId ?? cut.placementId ?? null,
    sourceIndex
  };
};

const inferredCuts = (plate, settings = {}) => {
  const plateWidth = Math.max(1, finite(
    plate?.placedWidth ?? plate?.width ?? settings.defaultSheet?.width,
    1
  ));
  const plateHeight = Math.max(1, finite(
    plate?.placedHeight ?? plate?.height ?? settings.defaultSheet?.height,
    1
  ));
  const kerf = Math.max(0.1, finite(settings.cutGap, 4));
  const result = [];

  (plate?.strips ?? []).forEach((strip) => {
    const layout = getStripLayout(strip, settings);
    const stripX = finite(strip.x);
    const stripY = finite(strip.y);
    const stripWidth = Math.max(0, finite(strip.placedWidth, layout.placedWidth));
    const stripHeight = Math.max(0, finite(strip.placedHeight, layout.placedHeight));
    const primary = String(
      strip.cutOrientation ?? strip.layoutType ?? strip.type ?? "vertical"
    ).toLowerCase();

    if (primary === "horizontal") {
      if (stripY + stripHeight < plateHeight - kerf / 2) {
        result.push({
          x: 0,
          y: stripY + stripHeight,
          width: plateWidth,
          height: kerf,
          stripId: strip.id
        });
      }
    } else if (stripX + stripWidth < plateWidth - kerf / 2) {
      result.push({
        x: stripX + stripWidth,
        y: 0,
        width: kerf,
        height: plateHeight,
        stripId: strip.id
      });
    }

    const items = layout.items ?? [];
    if (items.length < 2) return;

    if ((layout.layoutType ?? strip.type) === "horizontal") {
      items.slice(0, -1).forEach((item) => {
        result.push({
          x: stripX + item.x + item.width,
          y: stripY,
          width: kerf,
          height: stripHeight,
          stripId: strip.id
        });
      });
    } else {
      items.slice(0, -1).forEach((item) => {
        result.push({
          x: stripX,
          y: stripY + item.y + item.height,
          width: stripWidth,
          height: kerf,
          stripId: strip.id
        });
      });
    }
  });

  return result;
};

export function createPlateCutPlan(group, plate, plateIndex = 0) {
  const settings = group?.settings ?? {};
  const rawCuts = Array.isArray(plate?.cuts) && plate.cuts.length
    ? plate.cuts
    : inferredCuts(plate, settings);
  const unique = new Map();

  rawCuts.forEach((cut, sourceIndex) => {
    const normalized = normalizeCut(cut, sourceIndex);
    if (!normalized) return;
    const key = cutKey(normalized);
    if (!unique.has(key)) unique.set(key, normalized);
  });

  const cuts = [...unique.values()].map((cut, index) => ({
    ...cut,
    number: index + 1,
    directionLabel: cut.direction === "vertical" ? "Vertikal" : "Horizontal",
    measureLabel: cut.direction === "vertical"
      ? `X ${cut.position} mm · Länge ${cut.length} mm`
      : `Y ${cut.position} mm · Länge ${cut.length} mm`
  }));
  const material = String(
    group?.MID || group?.storageMaterialName || settings.defaultSheet?.material || "Material"
  );
  const thickness = group?.T == null ? null : finite(group.T);
  const width = Math.max(1, finite(
    plate?.placedWidth ?? plate?.width ?? settings.defaultSheet?.width,
    1
  ));
  const height = Math.max(1, finite(
    plate?.placedHeight ?? plate?.height ?? settings.defaultSheet?.height,
    1
  ));

  return {
    material,
    thickness,
    plateIndex,
    plateNumber: plateIndex + 1,
    width,
    height,
    cuts
  };
}

export function getNestingCutPlans(nesting) {
  return (nesting ?? []).flatMap((group, groupIndex) =>
    (group.nestingPlates ?? []).map((plate, plateIndex) => ({
      group,
      groupIndex,
      plate,
      plateIndex,
      plan: createPlateCutPlan(group, plate, plateIndex)
    }))
  );
}

export function paginateNestingCuts(
  cuts,
  { singleColumnCapacity = 15, doubleColumnCapacity = 30 } = {}
) {
  const source = Array.isArray(cuts) ? cuts : [];
  const pageCount = Math.max(1, Math.ceil(source.length / doubleColumnCapacity));
  const basePageSize = Math.floor(source.length / pageCount);
  const remainder = source.length % pageCount;
  let offset = 0;

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const pageSize = basePageSize + (pageIndex < remainder ? 1 : 0);
    const pageCuts = source.slice(offset, offset + pageSize);
    offset += pageSize;
    const columnCount = pageCuts.length > singleColumnCapacity ? 2 : 1;
    const firstColumnSize = Math.ceil(pageCuts.length / columnCount);
    const columns = columnCount === 1
      ? [pageCuts]
      : [pageCuts.slice(0, firstColumnSize), pageCuts.slice(firstColumnSize)];

    return {
      cuts: pageCuts,
      columns,
      columnCount,
      pageIndex,
      pageCount,
      totalCuts: source.length,
      startNumber: pageCuts[0]?.number ?? 0,
      endNumber: pageCuts.at(-1)?.number ?? 0
    };
  });
}
