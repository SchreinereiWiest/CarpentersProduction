import { DEFAULT_CABINET } from "@Engine/cabinet/cabinetDefaults.js";

const IMPORT_FORMAT = "carpentersproduction-import";
const IMPORT_VERSION = "1.0";
const MAX_ARCHIVE_SIZE = 250 * 1024 * 1024;
const MAX_UNPACKED_SIZE = 500 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 100;
// Palette CAD exports positions/offsets in cm and part dimensions in mm.
const CAD_POSITION_SCALE = 10;
const GEOMETRY_TOLERANCE = 0.5;
const BACK_GEOMETRY_TOLERANCE = 1.5;
const NUMBER_FIELDS = [
  "L",
  "B",
  "T",
  "X",
  "Y",
  "Z",
  "RX",
  "RY",
  "RZ",
  "OX",
  "OY",
  "OZ"
];
export const MATERIAL_FIELDS = ["MID", "ELID", "ERID", "ETID", "EBID"];

export function toFloat(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCadItem(item) {
  const normalized = { ...item, PID: String(item?.PID ?? "").trim() };
  NUMBER_FIELDS.forEach((field) => {
    normalized[field] = toFloat(item?.[field]);
  });
  return normalized;
}

const cadType = (item) => String(item?.Plattentyp ?? item?.type ?? "").trim();

const isKoItem = (item) => cadType(item).toUpperCase() === "KO";

const hasUsableBpid = (item) =>
  item?.BPID !== null &&
  item?.BPID !== undefined &&
  String(item.BPID).trim() !== "";

const isCabinetRoot = (item) =>
  /^\d{6}$/.test(item.PID) &&
  item.PID.endsWith("000") &&
  isKoItem(item);

function createManualGroup(items) {
  if (!items.length) return null;

  const usedIds = new Set(items.map((item) => item.PID).filter(Boolean));
  let nextId = 0;
  const children = items.map((item) => {
    let id = item.PID;
    if (!id || usedIds.has(`manual:${id}`)) {
      do {
        nextId += 1;
        id = `MAN${String(nextId).padStart(6, "0")}`;
      } while (usedIds.has(id));
    }
    usedIds.add(id);
    usedIds.add(`manual:${id}`);
    return { ...item, PID: id, manual: true, tag: "manual" };
  });

  return {
    PID: "MANUAL000",
    Objektname: "Freie Bauteile",
    Plattentyp: "MANUAL",
    Anzahl: 1,
    L: null,
    B: null,
    T: null,
    manual: true,
    tag: "manual",
    Children: children
  };
}

/**
 * Converts Palette CAD's flat PID list into project list.json groups.
 * Only KO records are cabinet parents. Everything without such a parent is
 * deliberately retained in one manual group instead of being dropped.
 */
export function parseCadJson(data) {
  if (!Array.isArray(data)) {
    throw new TypeError("Die CAD-Datei muss eine Liste enthalten.");
  }

  const items = data
    .filter((item) => isKoItem(item) || hasUsableBpid(item))
    .map(normalizeCadItem);
  const roots = new Map();
  const rootOrder = [];

  items.forEach((item) => {
    if (!isCabinetRoot(item)) return;
    const parentId = item.PID.slice(0, 3);
    if (!roots.has(parentId)) rootOrder.push(parentId);
    roots.set(parentId, { ...item, Children: [] });
  });

  const manualItems = [];
  items.forEach((item) => {
    if (isCabinetRoot(item)) return;
    const validPid = /^\d{6}$/.test(item.PID);
    const parent = validPid ? roots.get(item.PID.slice(0, 3)) : null;
    if (parent && !item.PID.endsWith("000")) {
      parent.Children.push(item);
    } else {
      manualItems.push(item);
    }
  });

  const groups = rootOrder.map((parentId) => roots.get(parentId));
  const manualGroup = createManualGroup(manualItems);
  if (manualGroup) groups.push(manualGroup);
  return groups;
}

function createMappingContext(mappings = [], materials = []) {
  const materialById = new Map(
    materials.filter((material) => material?.id).map((material) => [material.id, material])
  );
  const mappingBySource = new Map(
    mappings
      .filter((mapping) => mapping?.source && mapping?.materialId)
      .map((mapping) => [mapping.source, mapping.materialId])
  );
  return { materialById, mappingBySource };
}

function mappedMaterialId(value, context) {
  const source = String(value ?? "").trim();
  const materialId = source ? context.mappingBySource.get(source) : null;
  return materialId && context.materialById.has(materialId) ? materialId : null;
}

function dominantMappedMaterialId(items, fields, context) {
  const counts = new Map();
  items.forEach((item) => {
    fields.forEach((field) => {
      const materialId = mappedMaterialId(item?.[field], context);
      if (materialId) counts.set(materialId, (counts.get(materialId) ?? 0) + 1);
    });
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

const isFrontPart = (item) => {
  const type = cadType(item).toLocaleLowerCase("de");
  return type === "fr" || type.includes("front");
};

const isBackPart = (item) => {
  const type = cadType(item).toLocaleLowerCase("de");
  return type === "rw" || type.includes("rückwand") || type.includes("back");
};

const isHardwarePart = (item) => cadType(item).toLocaleLowerCase("de") === "be";

const isSidePart = (item) =>
  cadType(item).toLocaleLowerCase("de").startsWith("seite");

const isBottomPart = (item) => {
  const type = cadType(item).toLocaleLowerCase("de");
  return type === "boden" || type === "bottom";
};

const isTopPart = (item) => {
  const type = cadType(item).toLocaleLowerCase("de");
  return type === "deckel" || type === "top";
};

const finiteNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const roundMillimeters = (value) => Math.round(value * 1000) / 1000;

function maximumThickness(items) {
  return items.reduce((maximum, item) => {
    const thickness = finiteNumber(item?.T);
    return thickness > 0 ? Math.max(maximum, thickness) : maximum;
  }, 0);
}

function dominantMeasurement(items, field, fallback) {
  const counts = new Map();
  items.forEach((item) => {
    const measurement = finiteNumber(item?.[field]);
    if (measurement > 0) {
      counts.set(measurement, (counts.get(measurement) ?? 0) + 1);
    }
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
    ?? fallback;
}

function dominantThickness(items, fallback) {
  return dominantMeasurement(items, "T", fallback);
}

function normalizePartListSettings(settings) {
  const defaults = DEFAULT_CABINET.partListSettings;
  return {
    ...defaults,
    ...(settings ?? {}),
    grouping: settings?.grouping ?? defaults.grouping,
    separate: {
      ...defaults.separate,
      fronts:
        settings?.separate?.fronts ??
        settings?.fronts ??
        defaults.separate.fronts,
      shelves:
        settings?.separate?.shelves ??
        settings?.shelves ??
        defaults.separate.shelves,
      middleWalls:
        settings?.separate?.middleWalls ??
        settings?.middleWalls ??
        defaults.separate.middleWalls,
      legrabox:
        settings?.separate?.legrabox ??
        settings?.legrabox ??
        defaults.separate.legrabox
    }
  };
}

function cadOrigin(item) {
  const x = finiteNumber(item?.X);
  const y = finiteNumber(item?.Y);
  const z = finiteNumber(item?.Z);
  if (x === null || y === null || z === null) return null;

  const rotation = (finiteNumber(item?.RZ) ?? 0) * Math.PI / 180;
  const offsetX = (finiteNumber(item?.OX) ?? 0) * CAD_POSITION_SCALE;
  const offsetY = (finiteNumber(item?.OY) ?? 0) * CAD_POSITION_SCALE;
  const offsetZ = (finiteNumber(item?.OZ) ?? 0) * CAD_POSITION_SCALE;

  return {
    x:
      x * CAD_POSITION_SCALE +
      Math.cos(rotation) * offsetX -
      Math.sin(rotation) * offsetY,
    y:
      y * CAD_POSITION_SCALE +
      Math.sin(rotation) * offsetX +
      Math.cos(rotation) * offsetY,
    z: z * CAD_POSITION_SCALE + offsetZ,
    rotation
  };
}

function localCadPosition(rootOrigin, item) {
  const origin = cadOrigin(item);
  if (!origin) return null;
  const differenceX = origin.x - rootOrigin.x;
  const differenceY = origin.y - rootOrigin.y;
  return {
    x:
      differenceX * Math.cos(rootOrigin.rotation) +
      differenceY * Math.sin(rootOrigin.rotation),
    depth:
      -differenceX * Math.sin(rootOrigin.rotation) +
      differenceY * Math.cos(rootOrigin.rotation),
    z: origin.z - rootOrigin.z
  };
}

function approximatelyEqual(left, right, tolerance = GEOMETRY_TOLERANCE) {
  return (
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    Math.abs(left - right) <= tolerance
  );
}

function inferCarcassGeometry(root, sideParts, bottomParts, topParts) {
  const rootOrigin = cadOrigin(root);
  const rootWidth = finiteNumber(root.L);
  const rootHeight = finiteNumber(root.T);
  const horizontalParts = [...bottomParts, ...topParts];
  const sideThickness = dominantThickness(sideParts, DEFAULT_CABINET.thickness);
  const horizontalThickness = dominantThickness(horizontalParts, sideThickness);
  const sideLength = dominantMeasurement(sideParts, "L", rootHeight);
  const horizontalPositions = rootOrigin
    ? horizontalParts
        .map((part) => ({ part, position: localCadPosition(rootOrigin, part) }))
        .filter(({ position }) => position)
    : [];

  const spanningHorizontalParts = horizontalParts.filter((part) =>
    approximatelyEqual(finiteNumber(part.L), rootWidth)
  ).length;
  const spanningPositionedParts = horizontalPositions.filter(({ part, position }) => {
    const width = finiteNumber(part.L);
    return (
      width > 0 &&
      Math.abs(position.x) <= BACK_GEOMETRY_TOLERANCE &&
      approximatelyEqual(position.x + width, rootWidth, BACK_GEOMETRY_TOLERANCE)
    );
  }).length;
  const bottomIsContinuous = horizontalParts.length > 0 && (
    spanningHorizontalParts > horizontalParts.length / 2 ||
    spanningPositionedParts > horizontalPositions.length / 2
  );
  const continuous = bottomIsContinuous ? "bottom" : "side";
  const cabinetHeight = sideLength > 0
    ? sideLength + (bottomIsContinuous ? horizontalThickness * 2 : 0)
    : rootHeight;

  const sidePositions = rootOrigin
    ? sideParts
        .map((part) => localCadPosition(rootOrigin, part))
        .filter(Boolean)
    : [];
  let verticalOrigin;
  if (bottomIsContinuous && horizontalPositions.length) {
    verticalOrigin = Math.min(...horizontalPositions.map(({ position }) => position.z));
  } else if (sidePositions.length) {
    verticalOrigin = Math.min(...sidePositions.map((position) => position.z));
  } else {
    verticalOrigin = Math.max(0, (rootHeight ?? cabinetHeight) - cabinetHeight);
  }

  return {
    height: roundMillimeters(cabinetHeight),
    verticalOrigin: roundMillimeters(verticalOrigin),
    continuous,
    thickness: sideThickness,
    topExists: horizontalParts.length ? topParts.length > 0 : DEFAULT_CABINET.topExists,
    bottomExists: horizontalParts.length
      ? bottomParts.length > 0
      : DEFAULT_CABINET.bottomExists
  };
}

function inferBackPanelConfiguration(root, backParts, carcassGeometry) {
  if (!backParts.length) {
    return {
      construction: DEFAULT_CABINET.backPanel.construction,
      thickness: 0,
      deductDepth: false
    };
  }

  const back = [...backParts].sort(
    (left, right) =>
      (finiteNumber(right.L) ?? 0) * (finiteNumber(right.B) ?? 0) -
      (finiteNumber(left.L) ?? 0) * (finiteNumber(left.B) ?? 0)
  )[0];
  const thickness = maximumThickness(backParts);
  const rootOrigin = cadOrigin(root);
  const position = rootOrigin ? localCadPosition(rootOrigin, back) : null;
  const rootDepth = finiteNumber(root.B);
  const backWidth = finiteNumber(back.B);
  const backHeight = finiteNumber(back.L);
  const reachesRear = position && rootDepth !== null
    ? approximatelyEqual(
        Math.max(position.depth, position.depth + thickness),
        rootDepth,
        BACK_GEOMETRY_TOLERANCE
      )
    : null;
  const fillsOuterFace =
    approximatelyEqual(backWidth, finiteNumber(root.L), BACK_GEOMETRY_TOLERANCE) &&
    approximatelyEqual(backHeight, carcassGeometry.height, BACK_GEOMETRY_TOLERANCE);

  let construction;
  if (reachesRear === false) {
    const relativeBottom = position.z - carcassGeometry.verticalOrigin;
    const relativeTop = relativeBottom + backHeight;
    const isOpen =
      approximatelyEqual(relativeBottom, 0, BACK_GEOMETRY_TOLERANCE) ||
      approximatelyEqual(
        relativeTop,
        carcassGeometry.height,
        BACK_GEOMETRY_TOLERANCE
      );
    construction = isOpen ? "grooveOpen" : "groove";
  } else if (fillsOuterFace) {
    construction = "butt";
  } else {
    construction = "rabbet";
  }

  return {
    construction,
    thickness,
    deductDepth: construction === "butt"
  };
}

function normalizeBoundary(value, maximum) {
  if (Math.abs(value) <= GEOMETRY_TOLERANCE) return 0;
  if (Math.abs(value - maximum) <= GEOMETRY_TOLERANCE) return maximum;
  return roundMillimeters(value);
}

function splitSpecFromSizes(sizes) {
  if (sizes.length <= 1) return "1";
  return [
    ...sizes.slice(0, -1).map((size) => `${roundMillimeters(size)}mm`),
    "1"
  ].join(":");
}

function intervalsOverlap(startA, sizeA, startB, sizeB) {
  return Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB);
}

function smallestFrontGap(fronts) {
  const candidates = [];
  fronts.forEach((front, index) => {
    fronts.slice(index + 1).forEach((other) => {
      const verticalGap = Math.max(front.y, other.y) -
        Math.min(front.y + front.height, other.y + other.height);
      if (
        intervalsOverlap(front.x, front.width, other.x, other.width) > GEOMETRY_TOLERANCE &&
        verticalGap >= -GEOMETRY_TOLERANCE
      ) {
        candidates.push(Math.max(0, verticalGap));
      }

      const horizontalGap = Math.max(front.x, other.x) -
        Math.min(front.x + front.width, other.x + other.width);
      if (
        intervalsOverlap(front.y, front.height, other.y, other.height) > GEOMETRY_TOLERANCE &&
        horizontalGap >= -GEOMETRY_TOLERANCE
      ) {
        candidates.push(Math.max(0, horizontalGap));
      }
    });
  });
  return candidates.length
    ? roundMillimeters(Math.min(...candidates))
    : DEFAULT_CABINET.frontGap;
}

function createImportedFrontConfiguration(
  root,
  frontParts,
  context,
  carcassGeometry
) {
  if (!frontParts.length) return { fronts: [] };

  const rootOrigin = cadOrigin(root);
  const cabinetWidth = finiteNumber(root.L);
  const cabinetHeight = carcassGeometry.height;
  if (!rootOrigin || cabinetWidth <= 0 || cabinetHeight <= 0) {
    return { fronts: [] };
  }

  const fronts = frontParts.map((part, index) => {
    const position = localCadPosition(rootOrigin, part);
    const width = finiteNumber(part.B);
    const height = finiteNumber(part.L);
    if (!position || width <= 0 || height <= 0) return null;

    const x = normalizeBoundary(position.x, cabinetWidth);
    const localBottom = position.z - carcassGeometry.verticalOrigin;
    const y = normalizeBoundary(cabinetHeight - localBottom - height, cabinetHeight);

    if (
      x < -GEOMETRY_TOLERANCE ||
      y < -GEOMETRY_TOLERANCE ||
      x + width > cabinetWidth + GEOMETRY_TOLERANCE ||
      y + height > cabinetHeight + GEOMETRY_TOLERANCE
    ) {
      return null;
    }

    const materialId = mappedMaterialId(part.MID, context);
    return {
      id: `cad-${root.PID}-front-${part.PID || index + 1}`,
      type: "front",
      name: part.Objektname || `Front ${index + 1}`,
      ...(materialId ? { materialId } : {}),
      sourcePid: part.PID,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width,
      height,
      children: []
    };
  });

  if (fronts.some((front) => front === null)) return { fronts: [] };

  const byRows = [...fronts].sort((left, right) => left.y - right.y || left.x - right.x);
  const isVertical = byRows.every(
    (front) =>
      Math.abs(front.x - byRows[0].x) <= GEOMETRY_TOLERANCE &&
      Math.abs(front.width - byRows[0].width) <= GEOMETRY_TOLERANCE
  );
  const byColumns = [...fronts].sort((left, right) => left.x - right.x || left.y - right.y);
  const isHorizontal = byColumns.every(
    (front) =>
      Math.abs(front.y - byColumns[0].y) <= GEOMETRY_TOLERANCE &&
      Math.abs(front.height - byColumns[0].height) <= GEOMETRY_TOLERANCE
  );
  const orderedFronts = isVertical ? byRows : isHorizontal ? byColumns : byRows;

  const gapLeft = roundMillimeters(Math.max(0, Math.min(...fronts.map((front) => front.x))));
  const gapRight = roundMillimeters(Math.max(
    0,
    cabinetWidth - Math.max(...fronts.map((front) => front.x + front.width))
  ));
  const gapTop = roundMillimeters(Math.max(0, Math.min(...fronts.map((front) => front.y))));
  const gapBottom = roundMillimeters(Math.max(
    0,
    cabinetHeight - Math.max(...fronts.map((front) => front.y + front.height))
  ));
  const frontGap = smallestFrontGap(fronts);
  const direction = isVertical ? "vertical" : isHorizontal ? "horizontal" : null;
  const sizes = direction === "vertical"
    ? orderedFronts.map((front) => front.height)
    : orderedFronts.map((front) => front.width);

  return {
    fronts: orderedFronts.map((front, index) => ({
      ...front,
      name: front.name === "Front" ? `Front ${index + 1}` : front.name
    })),
    frontGap,
    frontGapLeft: gapLeft,
    frontGapRight: gapRight,
    frontGapTop: gapTop,
    frontGapBottom: gapBottom,
    ...(direction
      ? {
          frontLayout: {
            spec: splitSpecFromSizes(sizes),
            direction,
            source: "palette-cad"
          }
        }
      : {})
  };
}

export function createCabinetsFromPartList(
  partList,
  { mappings = [], materials = [], partListSettings } = {}
) {
  const context = createMappingContext(mappings, materials);
  return partList
    .filter((item) => isCabinetRoot(item))
    .map((item) => {
      const children = Array.isArray(item.Children) ? item.Children : [];
      const frontParts = children.filter(isFrontPart);
      const backParts = children.filter(isBackPart);
      const sideParts = children.filter(isSidePart);
      const bottomParts = children.filter(isBottomPart);
      const topParts = children.filter(isTopPart);
      const bodyParts = children.filter(
        (part) => !isFrontPart(part) && !isBackPart(part) && !isHardwarePart(part)
      );
      const materialId = dominantMappedMaterialId(bodyParts, ["MID"], context);
      const frontMaterialId = dominantMappedMaterialId(frontParts, ["MID"], context);
      const backMaterialId = dominantMappedMaterialId(backParts, ["MID"], context);
      const edgeTopMaterialId = dominantMappedMaterialId(bodyParts, ["ETID"], context);
      const edgeBottomMaterialId = dominantMappedMaterialId(bodyParts, ["EBID"], context);
      const frontEdgeMaterialId = dominantMappedMaterialId(
        frontParts,
        ["ELID", "ERID", "ETID", "EBID"],
        context
      );
      const outerDepth = finiteNumber(item.B);
      const frontThickness = maximumThickness(frontParts);
      const carcassGeometry = inferCarcassGeometry(
        item,
        sideParts,
        bottomParts,
        topParts
      );
      const backConfiguration = inferBackPanelConfiguration(
        item,
        backParts,
        carcassGeometry
      );
      const backDepthDeduction = backConfiguration.deductDepth
        ? backConfiguration.thickness
        : 0;
      const correctedDepth = outerDepth === null
        ? null
        : outerDepth - frontThickness - backDepthDeduction;
      const frontConfiguration = createImportedFrontConfiguration(
        item,
        frontParts,
        context,
        carcassGeometry
      );

      return {
        ...DEFAULT_CABINET,
        id: `cad-${item.PID}`,
        name: item.Objektname || `Korpus ${item.PID}`,
        quantity: Math.max(1, Number(item.Anzahl) || 1),
        width: item.L,
        height: carcassGeometry.height,
        depth: correctedDepth !== null && correctedDepth > 0
          ? roundMillimeters(correctedDepth)
          : item.B,
        thickness: carcassGeometry.thickness,
        continuous: carcassGeometry.continuous,
        topExists: carcassGeometry.topExists,
        bottomExists: carcassGeometry.bottomExists,
        partListSettings: normalizePartListSettings(partListSettings),
        partListSettingsSource: partListSettings ? "company" : "engine-default",
        outerDimensions: {
          width: item.L,
          height: item.T,
          depth: item.B
        },
        source: "palette-cad",
        sourcePid: item.PID,
        ...(materialId ? { materialId } : {}),
        ...(frontMaterialId ? { frontMaterialId } : {}),
        ...(frontThickness ? { frontThickness } : {}),
        ...(edgeTopMaterialId ? { edgeTopMaterialId } : {}),
        ...(edgeBottomMaterialId ? { edgeBottomMaterialId } : {}),
        ...(frontEdgeMaterialId ? { frontEdgeMaterialId } : {}),
        backPanel: {
          ...DEFAULT_CABINET.backPanel,
          construction: backConfiguration.construction,
          continuous: carcassGeometry.continuous,
          ...(backConfiguration.thickness
            ? { thickness: backConfiguration.thickness }
            : {}),
          ...(backMaterialId ? { materialId: backMaterialId } : {})
        },
        ...frontConfiguration,
        sections: []
      };
    });
}

export function collectMaterialReferences(partList) {
  const references = new Map();
  const visit = (item) => {
    MATERIAL_FIELDS.forEach((field) => {
      const source = String(item?.[field] ?? "").trim();
      if (!source) return;
      const reference = references.get(source) ?? {
        source,
        fields: new Set(),
        occurrences: 0
      };
      reference.fields.add(field);
      reference.occurrences += 1;
      references.set(source, reference);
    });
    if (Array.isArray(item?.Children)) item.Children.forEach(visit);
  };
  partList.forEach(visit);
  return [...references.values()]
    .map((reference) => ({
      ...reference,
      fields: MATERIAL_FIELDS.filter((field) => reference.fields.has(field))
    }))
    .sort((left, right) =>
      left.source.localeCompare(right.source, "de", {
        numeric: true,
        sensitivity: "base"
      })
    );
}

export function applyMaterialMappings(partList, mappings = [], materials = []) {
  const context = createMappingContext(mappings, materials);
  const translate = (value) => {
    const materialId = mappedMaterialId(value, context);
    if (!materialId) return value;
    const material = context.materialById.get(materialId);
    return material.materialNumber || value;
  };
  const translateItem = (item) => {
    const translated = { ...item };
    MATERIAL_FIELDS.forEach((field) => {
      translated[field] = translate(item?.[field]);
    });
    const mappedMainMaterialId = mappedMaterialId(item?.MID, context);
    if (mappedMainMaterialId) {
      translated.Maserung = context.materialById.get(mappedMainMaterialId)?.maser
        ? "Ja"
        : "";
    }
    if (Array.isArray(item?.Children)) {
      translated.Children = item.Children.map(translateItem);
    }
    return translated;
  };
  return partList.map(translateItem);
}

export function parseCadText(raw) {
  // Palette CAD commonly emits a comma directly before the closing array.
  // Applying this to both collection delimiters also tolerates nested output.
  return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"));
}

function decodeText(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Palette CAD 10 exports localized object names as Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function findEndOfCentralDirectory(view) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("Das cpimport-Paket ist kein gültiges ZIP-Archiv.");
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Dieser Browser unterstützt das Entpacken von cpimport nicht.");
  }
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipArchive(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(view);
  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  if (diskNumber !== 0 || centralDisk !== 0) {
    throw new Error("Mehrteilige ZIP-Archive werden nicht unterstützt.");
  }
  if (
    entryCount > MAX_ARCHIVE_ENTRIES ||
    centralOffset + centralSize > bytes.byteLength
  ) {
    throw new Error("Das cpimport-ZIP-Verzeichnis ist ungültig.");
  }

  const metadata = [];
  let offset = centralOffset;
  let totalSize = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Das cpimport-ZIP-Verzeichnis ist beschädigt.");
    }
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const nextOffset = nameStart + nameLength + extraLength + commentLength;
    if (nextOffset > bytes.byteLength || flags & 0x1) {
      throw new Error("Verschlüsselte oder beschädigte ZIP-Einträge werden nicht unterstützt.");
    }
    const path = new TextDecoder("utf-8").decode(
      bytes.subarray(nameStart, nameStart + nameLength)
    );
    totalSize += uncompressedSize;
    if (totalSize > MAX_UNPACKED_SIZE) {
      throw new Error("Der entpackte cpimport-Inhalt ist zu groß.");
    }
    metadata.push({
      path,
      compression,
      compressedSize,
      uncompressedSize,
      localOffset
    });
    offset = nextOffset;
  }

  const entries = Object.create(null);
  for (const entry of metadata) {
    if (!validatePath(entry.path) || entry.path.endsWith("/")) continue;
    if (view.getUint32(entry.localOffset, true) !== 0x04034b50) {
      throw new Error("Ein cpimport-ZIP-Eintrag ist beschädigt.");
    }
    const nameLength = view.getUint16(entry.localOffset + 26, true);
    const extraLength = view.getUint16(entry.localOffset + 28, true);
    const dataStart = entry.localOffset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > bytes.byteLength) {
      throw new Error("Ein cpimport-ZIP-Eintrag ist unvollständig.");
    }
    const compressed = bytes.subarray(dataStart, dataEnd);
    let unpacked;
    if (entry.compression === 0) unpacked = compressed.slice();
    else if (entry.compression === 8) unpacked = await inflateRaw(compressed);
    else throw new Error("Das cpimport-Paket nutzt eine unbekannte ZIP-Komprimierung.");
    if (unpacked.byteLength !== entry.uncompressedSize) {
      throw new Error("Ein cpimport-ZIP-Eintrag hat eine ungültige Größe.");
    }
    if (Object.hasOwn(entries, entry.path)) {
      throw new Error("Das cpimport-Paket enthält doppelte Dateipfade.");
    }
    entries[entry.path] = unpacked;
  }
  return entries;
}

function validatePath(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.split("/").includes("..")
  );
}

function requiredEntry(entries, path, label) {
  if (!validatePath(path) || !entries[path]) {
    throw new Error(`${label} fehlt im Importpaket.`);
  }
  return entries[path];
}

function validateManifest(manifest) {
  if (
    manifest?.format !== IMPORT_FORMAT ||
    String(manifest?.version) !== IMPORT_VERSION
  ) {
    throw new Error("Das cpimport-Format oder seine Version wird nicht unterstützt.");
  }
  if (!manifest.files?.cad?.path || !manifest.files?.expose?.path) {
    throw new Error("Das Manifest enthält keine vollständigen CAD-/PDF-Angaben.");
  }
  if (!Array.isArray(manifest.files?.images)) {
    throw new Error("Das Manifest enthält keine gültige Bildliste.");
  }
}

export async function readCpImport(file) {
  if (!file || file.size > MAX_ARCHIVE_SIZE) {
    throw new Error("Das cpimport-Paket ist zu groß (maximal 250 MB).");
  }

  const entries = await unzipArchive(new Uint8Array(await file.arrayBuffer()));
  const paths = Object.keys(entries);
  if (paths.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("Das cpimport-Paket enthält zu viele Dateien.");
  }
  const unpackedSize = paths.reduce(
    (sum, path) => sum + entries[path].byteLength,
    0
  );
  if (unpackedSize > MAX_UNPACKED_SIZE) {
    throw new Error("Der entpackte cpimport-Inhalt ist zu groß.");
  }

  const manifestBytes = requiredEntry(entries, "manifest.json", "manifest.json");
  const manifest = JSON.parse(new TextDecoder("utf-8").decode(manifestBytes));
  validateManifest(manifest);

  const cadBytes = requiredEntry(entries, manifest.files.cad.path, "CAD-Datei");
  const exposeBytes = requiredEntry(
    entries,
    manifest.files.expose.path,
    "Exposé-PDF"
  );
  const rawCad = parseCadText(decodeText(cadBytes));
  const partList = parseCadJson(rawCad);
  const cabinets = createCabinetsFromPartList(partList);
  const materialReferences = collectMaterialReferences(partList);
  const images = manifest.files.images.map((image, index) => ({
    path: image.path,
    view: image.view || `image-${index + 1}`,
    target: image.target || "measurement.attachment",
    bytes: requiredEntry(entries, image.path, `Bild ${index + 1}`),
    mimeType: image.path.toLowerCase().endsWith(".png")
      ? "image/png"
      : "application/octet-stream"
  }));

  return {
    manifest,
    partList,
    cabinets,
    materialReferences,
    expose: {
      path: manifest.files.expose.path,
      bytes: exposeBytes,
      mimeType: "application/pdf"
    },
    images
  };
}
