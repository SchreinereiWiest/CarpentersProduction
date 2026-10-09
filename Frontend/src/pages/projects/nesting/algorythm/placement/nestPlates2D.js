import { splitRect } from "../guillotineSplit";
import { createEmptyNestingPlate } from "./nestingPlate";
import { placeStrip } from "./placeStrip";

const EPSILON = 1e-7;
const MAX_LOOKAHEAD_PARTS = 16;


/* ============================================================
   1. Abmessungen und Geometrie
============================================================ */

function getPartDimensions(plate, partGap = 0) {
  const originalWidth =
    Number(plate.originalWidth ?? plate.width) || 0;

  const originalHeight =
    Number(plate.originalHeight ?? plate.height) || 0;

  return {
    originalWidth,
    originalHeight,

    width:
      Number(plate.width) ||
      originalWidth + partGap,

    height:
      Number(plate.height) ||
      originalHeight + partGap
  };
}


function getPartArea(plate, partGap = 0) {
  const { width, height } = getPartDimensions(
    plate,
    partGap
  );

  return width * height;
}


function getCutMetrics(
  space,
  width,
  height,
  cutOrientation,
  cutGap
) {
  const hasRight =
    space.width - width - cutGap > EPSILON;

  const hasBottom =
    space.height - height - cutGap > EPSILON;

  let cutCount = 0;
  let cutLength = 0;

  if (cutOrientation === "horizontal") {
    if (hasBottom) {
      cutCount++;
      cutLength += space.width;
    }

    if (hasRight) {
      cutCount++;
      cutLength += height;
    }
  } else {
    if (hasRight) {
      cutCount++;
      cutLength += space.height;
    }

    if (hasBottom) {
      cutCount++;
      cutLength += width;
    }
  }

  return { cutCount, cutLength };
}


function getSpaceArea(spaces) {
  return spaces.reduce(
    (sum, space) =>
      sum + space.width * space.height,
    0
  );
}


function canPlateFitInSpace(
  plate,
  space,
  allowRotation,
  partGap
) {
  const dimensions = getPartDimensions(
    plate,
    partGap
  );
  const fitsAt90Degrees =
    dimensions.height <= space.width + EPSILON &&
    dimensions.width <= space.height + EPSILON;

  if (allowRotation !== true) return fitsAt90Degrees;

  const fitsAt0Degrees =
    dimensions.width <= space.width + EPSILON &&
    dimensions.height <= space.height + EPSILON;

  return fitsAt0Degrees || fitsAt90Degrees;
}


/* ============================================================
   2. Freiflächen bewerten
============================================================ */

function evaluateFreeSpaces(
  plates,
  freeSpaces,
  allowRotation,
  partGap
) {
  let potentialCount = 0;
  let potentialArea = 0;

  for (const plate of plates) {
    const fits = freeSpaces.some(space =>
      canPlateFitInSpace(
        plate,
        space,
        allowRotation,
        partGap
      )
    );

    if (fits) {
      potentialCount++;

      potentialArea += getPartArea(
        plate,
        partGap
      );
    }
  }

  let usableFreeArea = 0;
  let unusableFreeArea = 0;
  let largestFreeArea = 0;

  for (const space of freeSpaces) {
    const area =
      space.width * space.height;

    const hasFittingPart = plates.some(plate =>
      canPlateFitInSpace(
        plate,
        space,
        allowRotation,
        partGap
      )
    );

    if (hasFittingPart) {
      usableFreeArea += area;

      largestFreeArea = Math.max(
        largestFreeArea,
        area
      );
    } else {
      unusableFreeArea += area;
    }
  }

  return {
    potentialCount,
    potentialArea,
    usableFreeArea,
    unusableFreeArea,
    largestFreeArea,
    freeRectCount: freeSpaces.length
  };
}


/* ============================================================
   3. Platzierung eines einzelnen Bauteils bewerten
============================================================ */

function comparePlacement(left, right) {
  if (!right) return true;

  // Ein niedrigerer Score ist besser.
  if (left.score < right.score - EPSILON) {
    return true;
  }

  if (left.score > right.score + EPSILON) {
    return false;
  }

  if (left.cutLength !== right.cutLength) {
    return left.cutLength < right.cutLength;
  }

  if (left.cutCount !== right.cutCount) {
    return left.cutCount < right.cutCount;
  }

  if (
    left.potentialArea !== right.potentialArea
  ) {
    return left.potentialArea > right.potentialArea;
  }

  if (
    left.freeRectCount !== right.freeRectCount
  ) {
    return left.freeRectCount < right.freeRectCount;
  }

  if (left.rotation !== right.rotation) {
    return left.rotation < right.rotation;
  }

  return left.cutOrientation === "vertical";
}


function findBestPlacement(
  plate,
  remainingPlates,
  freeSpaces,
  settings,
  sheetDimensions
) {
  const partGap = Math.max(
    0,
    Number(settings.gap) || 0
  );

  const cutGap = Math.max(
    0,
    Number(settings.cutGap) || 0
  );

  const dimensions = getPartDimensions(
    plate,
    partGap
  );

  const rotations = settings.allowRotation === true
    ? [0, 90]
    : [90];

  /*
   * Große verbleibende Bauteile zuerst für den Ausblick.
   * Die vollständige Belegungsreihenfolge wird separat variiert.
   */
  const otherParts = remainingPlates
    .filter(item => item.id !== plate.id)
    .sort(
      (a, b) =>
        getPartArea(b, partGap) -
        getPartArea(a, partGap)
    );

  const lookAheadParts =
    otherParts.slice(0, MAX_LOOKAHEAD_PARTS);

  const lookAheadArea = lookAheadParts.reduce(
    (sum, item) => sum + getPartArea(item, partGap),
    0
  );

  const sheetWidth =
    Number(sheetDimensions.width) || 1;

  const sheetHeight =
    Number(sheetDimensions.height) || 1;

  let best = null;

  for (const rotation of rotations) {
    const width =
      rotation === 90
        ? dimensions.height
        : dimensions.width;

    const height =
      rotation === 90
        ? dimensions.width
        : dimensions.height;

    if (width <= 0 || height <= 0) {
      continue;
    }

    for (
      let spaceIndex = 0;
      spaceIndex < freeSpaces.length;
      spaceIndex++
    ) {
      const space = freeSpaces[spaceIndex];

      if (
        width > space.width + EPSILON ||
        height > space.height + EPSILON
      ) {
        continue;
      }

      const spaceArea =
        space.width * space.height;

      const partArea = width * height;

      const remainingWidth = Math.max(
        0,
        space.width - width - cutGap
      );

      const remainingHeight = Math.max(
        0,
        space.height - height - cutGap
      );

      const shortSideRatio =
        Math.min(
          remainingWidth,
          remainingHeight
        ) /
        Math.max(
          1,
          space.width,
          space.height
        );

      const localWasteRatio =
        Math.max(0, spaceArea - partArea) /
        Math.max(1, spaceArea);

      // Bauteilrotation und Guillotine-Schnittlage sind unabhängig:
      // auch ohne Teile-Drehung werden beide Schnittachsen bewertet.
      for (const cutOrientation of [
        "vertical",
        "horizontal"
      ]) {
        const split = splitRect(
          space,
          {
            placedWidth: width,
            placedHeight: height,
            cutOrientation
          },
          settings
        );

        /*
         * Die bisherige freie Fläche wird durch ihre
         * neu entstandenen Teilflächen ersetzt.
         */
        const nextFreeSpaces = [
          ...freeSpaces.filter(
            (_, index) => index !== spaceIndex
          ),
          ...split.freeRects
        ];

        /*
         * Nur die neu erzeugten Freiflächen bewerten.
         * Alle anderen freien Flächen bleiben unverändert.
         */
        const quality = evaluateFreeSpaces(
          lookAheadParts,
          split.freeRects,
          settings.allowRotation === true,
          partGap
        );

        const newFreeArea = getSpaceArea(
          split.freeRects
        );

        const unusableAreaRatio =
          newFreeArea > EPSILON
            ? quality.unusableFreeArea / newFreeArea
            : 0;

        const futureAreaRatio =
          lookAheadArea > EPSILON
            ? Math.min(
                1,
                quality.potentialArea / lookAheadArea
              )
            : 0;

        const futureCountRatio =
          lookAheadParts.length > 0
            ? quality.potentialCount /
              lookAheadParts.length
            : 0;

        const cutMetrics = getCutMetrics(
          space,
          width,
          height,
          cutOrientation,
          cutGap
        );

        const cutLengthRatio =
          cutMetrics.cutLength /
          Math.max(
            1,
            space.width + space.height
          );

        const cutCountRatio =
          cutMetrics.cutCount / 2;

        const fragmentationPenalty =
          Math.max(
            0,
            split.freeRects.length - 1
          );

        /*
         * Lokaler Score.
         * Niedriger ist besser.
         *
         * Schnitte und künftige Verwendbarkeit erhalten
         * ein hohes Gewicht.
         */
        const score =
          0.20 * localWasteRatio +
          0.22 * cutLengthRatio +
          0.12 * cutCountRatio +
          0.10 * unusableAreaRatio +
          0.08 * fragmentationPenalty +
          0.04 * shortSideRatio -
          0.14 * futureAreaRatio -
          0.10 * futureCountRatio;

        const candidate = {
          plate,
          space,
          spaceIndex,

          width,
          height,

          rotation,
          cutOrientation,

          split,
          nextFreeSpaces,

          score,

          cutCount: cutMetrics.cutCount,
          cutLength: cutMetrics.cutLength,

          potentialCount: quality.potentialCount,
          potentialArea: quality.potentialArea,

          freeRectCount: nextFreeSpaces.length,

          shortSideFit: Math.min(
            remainingWidth,
            remainingHeight
          ),

          sheetWidth,
          sheetHeight
        };

        if (comparePlacement(candidate, best)) {
          best = candidate;
        }
      }
    }
  }

  return best;
}


/* ============================================================
   4. Verschiedene Bauteilreihenfolgen generieren
============================================================ */

function seededShuffle(plates, seed) {
  const result = [...plates];
  let state = seed >>> 0;

  for (
    let index = result.length - 1;
    index > 0;
    index--
  ) {
    state =
      (Math.imul(state, 1664525) + 1013904223) >>> 0;

    const swapIndex = state % (index + 1);

    [
      result[index],
      result[swapIndex]
    ] = [
      result[swapIndex],
      result[index]
    ];
  }

  return result;
}


function createOrderings(plates, settings) {
  const partGap = Math.max(
    0,
    Number(settings.gap) || 0
  );

  const dimensions = plates.map(plate => {
    const part = getPartDimensions(plate, partGap);

    return {
      plate,
      width: part.width,
      height: part.height,
      area: part.width * part.height,
      maxSide: Math.max(part.width, part.height),
      minSide: Math.min(part.width, part.height),
      perimeter: 2 * (part.width + part.height),
      aspectRatio:
        Math.max(part.width, part.height) /
        Math.max(1, Math.min(part.width, part.height))
    };
  });

  const comparators = [
    // 1. Größte Fläche zuerst
    (a, b) =>
      b.area - a.area ||
      b.maxSide - a.maxSide,

    // 2. Längste Bauteile zuerst
    (a, b) =>
      b.maxSide - a.maxSide ||
      b.area - a.area,

    // 3. Größte Breite zuerst
    (a, b) =>
      b.width - a.width ||
      b.height - a.height,

    // 4. Größte Höhe zuerst
    (a, b) =>
      b.height - a.height ||
      b.width - a.width,

    // 5. Umfangreiche Bauteile zuerst
    (a, b) =>
      b.perimeter - a.perimeter ||
      b.area - a.area,

    // 6. Besonders schmale/lange Teile zuerst
    (a, b) =>
      b.aspectRatio - a.aspectRatio ||
      b.area - a.area,

    // 7. Eher kompakte Bauteile zuerst
    (a, b) =>
      a.aspectRatio - b.aspectRatio ||
      b.area - a.area,

    // 8. Kleinere Bauteile zuerst
    (a, b) =>
      a.area - b.area ||
      a.maxSide - b.maxSide
  ];

  const orderings = [];
  const seen = new Set();

  const addOrdering = orderedDimensions => {
    const orderedPlates = orderedDimensions.map(
      item => item.plate
    );

    const key = orderedPlates
      .map(plate => String(plate.id))
      .join("|");

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    orderings.push(orderedPlates);
  };

  addOrdering(dimensions);

  for (const comparator of comparators) {
    addOrdering(
      [...dimensions].sort(comparator)
    );
  }

  /*
   * Zusätzliche reproduzierbare Mischungen.
   *
   * Die Optimierung ergibt bei identischen Eingaben
   * reproduzierbare Ergebnisse.
   */
  const randomPasses = Math.max(
    0,
    Math.min(
      8,
      Math.floor(
        Number(settings.optimizationPasses ?? 8)
      )
    )
  );

  const baseOrder = [...dimensions].sort(
    (a, b) =>
      b.area - a.area ||
      b.maxSide - a.maxSide
  );

  for (
    let pass = 0;
    pass < randomPasses;
    pass++
  ) {
    const shuffled = seededShuffle(
      baseOrder,
      9187 + pass * 7919
    );

    const indexById = new Map(
      shuffled.map((item, index) => [
        String(item.plate.id),
        index
      ])
    );

    addOrdering(
      shuffled
    );
  }

  return orderings;
}


/* ============================================================
   5. Einen kompletten Belegungsplan simulieren
============================================================ */

function simulateOrder(
  plates,
  order,
  dimensions,
  settings
) {
  const template = createEmptyNestingPlate(
    dimensions,
    settings,
    0
  );

  const sheetId = template.id ?? 0;

  let freeSpaces = (template.freeSpaces ?? []).map(
    space => ({
      ...space,
      sheet: space.sheet ?? sheetId
    })
  );

  const placements = [];
  const usedIds = new Set();

  let packedArea = 0;
  let totalCutLength = 0;
  let totalCutCount = 0;

  for (
    let index = 0;
    index < order.length;
    index++
  ) {
    const plate = order[index];

    if (usedIds.has(plate.id)) {
      continue;
    }

    /*
     * Frühere nicht platzierbare Teile können übersprungen
     * werden. Wegen der Guillotine-Aufteilung entstehen
     * keine größeren Freiflächen als zuvor.
     */
    const remainingForLookAhead = order.slice(
      index + 1
    ).filter(
      item => !usedIds.has(item.id)
    );

    const candidate = findBestPlacement(
      plate,
      remainingForLookAhead,
      freeSpaces,
      settings,
      dimensions
    );

    if (!candidate) {
      continue;
    }

    placements.push({
      ...candidate,
      plate
    });

    usedIds.add(plate.id);

    packedArea +=
      candidate.width * candidate.height;

    totalCutLength += candidate.cutLength;
    totalCutCount += candidate.cutCount;

    freeSpaces = candidate.nextFreeSpaces;
  }

  const remainingPlates = plates.filter(
    plate => !usedIds.has(plate.id)
  );

  const boardArea =
    Math.max(1, dimensions.width * dimensions.height);

  const utilization =
    packedArea / boardArea;

  const partCountRatio =
    placements.length / Math.max(1, plates.length);

  /*
   * Schnittlänge und Schnittanzahl pro platziertem Teil
   * normieren, damit unterschiedliche Pläne vergleichbar sind.
   */
  const cutLengthRatio = Math.min(
    1,
    totalCutLength /
      Math.max(
        1,
        placements.length *
        (dimensions.width + dimensions.height)
      )
  );

  const cutCountRatio = Math.min(
    1,
    totalCutCount /
      Math.max(1, placements.length * 2)
  );

  const remainingArea = getSpaceArea(freeSpaces);

  const lookAhead = [...remainingPlates]
    .sort(
      (a, b) =>
        getPartArea(b, Number(settings.gap) || 0) -
        getPartArea(a, Number(settings.gap) || 0)
    )
    .slice(0, MAX_LOOKAHEAD_PARTS);

  const futureQuality = evaluateFreeSpaces(
    lookAhead,
    freeSpaces,
    settings.allowRotation === true,
    Number(settings.gap) || 0
  );

  const unplacedArea = lookAhead.reduce(
    (sum, plate) =>
      sum + getPartArea(
        plate,
        Number(settings.gap) || 0
      ),
    0
  );

  const futureAreaRatio =
    unplacedArea > EPSILON
      ? Math.min(
          1,
          futureQuality.potentialArea / unplacedArea
        )
      : 1;

  const fragmentationRatio = Math.min(
    1,
    freeSpaces.length /
      Math.max(1, placements.length * 2)
  );

  /*
   * Gesamt-Score des ganzen Blatts:
   *
   * Materialausnutzung ist weiterhin am wichtigsten.
   * Schnittlänge und Schnittanzahl können aber zwischen
   * vergleichbaren Plänen entscheiden.
   */
  const score =
    0.55 * utilization +
    0.15 * partCountRatio +
    0.14 * (1 - cutLengthRatio) +
    0.08 * (1 - cutCountRatio) +
    0.05 * futureAreaRatio +
    0.03 * (1 - fragmentationRatio);

  return {
    placements,
    usedIds,

    freeSpaces,
    remainingPlates,

    packedArea,
    utilization,

    totalCutLength,
    totalCutCount,

    remainingArea,
    score
  };
}


function isBetterPlan(candidate, currentBest) {
  if (!candidate || candidate.placements.length === 0) {
    return false;
  }

  if (!currentBest) {
    return true;
  }

  if (
    candidate.score >
    currentBest.score + EPSILON
  ) {
    return true;
  }

  if (
    candidate.score <
    currentBest.score - EPSILON
  ) {
    return false;
  }

  if (
    candidate.packedArea !==
    currentBest.packedArea
  ) {
    return candidate.packedArea >
      currentBest.packedArea;
  }

  if (
    candidate.placements.length !==
    currentBest.placements.length
  ) {
    return candidate.placements.length >
      currentBest.placements.length;
  }

  if (
    candidate.totalCutLength !==
    currentBest.totalCutLength
  ) {
    return candidate.totalCutLength <
      currentBest.totalCutLength;
  }

  return candidate.totalCutCount <
    currentBest.totalCutCount;
}


function findBestPlanForSheet(
  plates,
  dimensions,
  settings
) {
  const orderings = createOrderings(
    plates,
    settings
  );

  let bestPlan = null;

  for (const order of orderings) {
    const plan = simulateOrder(
      plates,
      order,
      dimensions,
      settings
    );

    if (isBetterPlan(plan, bestPlan)) {
      bestPlan = plan;
    }
  }

  return bestPlan;
}


/* ============================================================
   6. Gewählten Plan in die vorhandene View-Struktur übertragen
============================================================ */

function createPartPlacement(
  record,
  settings
) {
  const plate = record.plate;
  const rotation = settings.allowRotation === true
    ? record.rotation
    : 90;

  const {
    originalWidth,
    originalHeight
  } = getPartDimensions(
    plate,
    Number(settings.gap) || 0
  );

  const partWidth =
    rotation === 90
      ? originalHeight
      : originalWidth;

  const partHeight =
    rotation === 90
      ? originalWidth
      : originalHeight;

  const part = {
    ...plate,

    originalWidth,
    originalHeight,

    width: partWidth,
    height: partHeight,

    placedWidth: partWidth,
    placedHeight: partHeight,

    rotation,
    nestingRotation: rotation,

    nestingX: 0,
    nestingY: 0,

    nestingFootprintWidth: record.width,
    nestingFootprintHeight: record.height,

    x: (record.width - partWidth) / 2,
    y: (record.height - partHeight) / 2
  };

  return {
    id: plate.id,
    partId: plate.id,

    type: "vertical",
    layoutType: "vertical",

    packingMode: "2d",
    individualPart: true,

    partGap: settings.gap,
    cutGap: settings.cutGap,

    cutOrientation: record.cutOrientation,
    rotation: 0,

    width: record.width,
    height: record.height,

    placedWidth: record.width,
    placedHeight: record.height,

    remainingHeight: 0,

    plates: [part],
    cuts: []
  };
}


function sameSpace(left, right) {
  return (
    Math.abs(left.x - right.x) <= EPSILON &&
    Math.abs(left.y - right.y) <= EPSILON &&
    Math.abs(left.width - right.width) <= EPSILON &&
    Math.abs(left.height - right.height) <= EPSILON
  );
}


function commitPlan(
  plan,
  dimensions,
  settings,
  nestingPlates
) {
  const sheetIndex = nestingPlates.length;

  const sheet = createEmptyNestingPlate(
    dimensions,
    settings,
    sheetIndex
  );

  const sheetId = sheet.id ?? sheetIndex;

  const freeSpaces = (
    sheet.freeSpaces ?? []
  ).map(space => ({
    ...space,
    sheet: space.sheet ?? sheetId
  }));

  nestingPlates.push(sheet);

  const committedIds = new Set();

  /*
   * Die Simulation wird in genau derselben Reihenfolge
   * wiederholt. Für jede Platzierung wird das zugehörige
   * aktuelle freie Rechteck anhand seiner Geometrie gesucht.
   */
  for (const record of plan.placements) {
    const matchingSpace = freeSpaces.find(
      space => sameSpace(space, record.space)
    );

    if (!matchingSpace) {
      /*
       * Der Plan passt nicht mehr zum tatsächlichen Zustand.
       * Das Teil bleibt dann unverplant und wird später erneut
       * berücksichtigt, anstatt eine falsche Position zu erhalten.
       */
      continue;
    }

    const placement = createPartPlacement(
      record,
      settings
    );

    placement.x = matchingSpace.x;
    placement.y = matchingSpace.y;
    placement.sheet = sheetId;

    placeStrip(
      placement,
      {
        x: matchingSpace.x,
        y: matchingSpace.y,
        space: matchingSpace
      },
      nestingPlates,
      freeSpaces,
      settings
    );

    committedIds.add(record.plate.id);
  }

  sheet.freeSpaces = freeSpaces.filter(
    space => space.sheet === sheetId
  );

  if (!sheet.strips?.length) {
    nestingPlates.pop();
    return new Set();
  }

  // IDs und Blattzugehörigkeit für die Ansicht absichern.
  for (const placement of sheet.strips) {
    placement.sheet = sheetId;
  }

  return committedIds;
}


/* ============================================================
   7. Öffentlicher 2D-Nesting-Einstiegspunkt
============================================================ */

export function nestPlates2D(
  plates = [],
  defaultPlate,
  settings = {}
) {
  const nestingPlates = [];

  let remainingPlates = [...plates];

  function packSheet(dimensions) {
    if (!remainingPlates.length) {
      return false;
    }

    const plan = findBestPlanForSheet(
      remainingPlates,
      dimensions,
      settings
    );

    if (
      !plan ||
      plan.placements.length === 0
    ) {
      return false;
    }

    const usedIds = commitPlan(
      plan,
      dimensions,
      settings,
      nestingPlates
    );

    if (!usedIds.size) {
      return false;
    }

    remainingPlates = remainingPlates.filter(
      plate => !usedIds.has(plate.id)
    );

    return true;
  }


  /*
   * 1. Vorhandene Restplatten nutzen.
   */
  for (const remainingPlate of (
    settings.remainingPlates ?? []
  )) {
    if (!remainingPlates.length) {
      break;
    }

    const dimensions = {
      ...defaultPlate,

      width: Number(remainingPlate.X) || 0,
      height: Number(remainingPlate.Y) || 0
    };

    if (
      dimensions.width > 0 &&
      dimensions.height > 0
    ) {
      packSheet(dimensions);
    }
  }


  /*
   * 2. Anschließend Standardplatten verwenden,
   * bis keine weiteren Teile mehr platziert werden können.
   */
  while (remainingPlates.length > 0) {
    const previousCount = remainingPlates.length;

    const progressed = packSheet(defaultPlate);

    if (
      !progressed ||
      remainingPlates.length >= previousCount
    ) {
      break;
    }
  }


  /*
   * Die bisherige Rückgabestruktur bleibt erhalten.
   */
  const strips = nestingPlates.flatMap(
    sheet => sheet.strips ?? []
  );

  return {
    nestingPlates,
    strips,
    remainingPlates
  };
}
