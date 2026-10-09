import { fillStrip2D } from "./fillStrip2D";

const EPSILON = 1e-7;
const MAX_CANDIDATES_PER_BUCKET = 3;


/* ------------------------------------------------------------
 * Öffentliche Funktion
 * ---------------------------------------------------------- */

export function createStrips(
  sortedPlates = [],
  settings = {}
) {
  const sheetWidth =
    Number(settings.defaultSheet?.width) || 0;

  const sheetHeight =
    Number(settings.defaultSheet?.height) || 0;

  const margin = Math.max(
    0,
    Number(settings.margin) || 0
  );

  const verticalTarget =
    sheetHeight - margin * 2;

  const horizontalTarget =
    sheetWidth - margin * 2;

  const strips = [];

  let remainingPlates = [...sortedPlates];
  let stripId = 0;

  while (remainingPlates.length > 0) {
    const bestCombination = findBestStripCombination(
      remainingPlates,
      verticalTarget,
      horizontalTarget,
      settings.cutGap,
      settings.stripDifference,
      settings
    );

    if (
      !bestCombination ||
      !bestCombination.plates.length
    ) {
      break;
    }

    const {
      plates,
      type,
      height,
      targetHeight
    } = bestCombination;

    /* --------------------------------------------------------
     * 2D-Nesting
     * ------------------------------------------------------ */

    if (settings.nestingMode === "2d") {
      /*
       * Im Idealfall wurde die Füllung bereits während der
       * Kandidatenbewertung berechnet.
       */
      const filledStrip =
        bestCombination.filledStrip ??
        fillStrip2D(
          plates,
          remainingPlates,
          type,
          targetHeight,
          settings
        );

      if (!filledStrip.plates.length) {
        break;
      }

      const previousCount = remainingPlates.length;

      strips.push({
        id: stripId++,

        type,
        layoutType: type,
        packingMode: "2d",
        cutOrientation: type,

        partGap: settings.gap,
        cutGap: settings.cutGap,

        rotation: 0,

        width: filledStrip.width,
        height: filledStrip.height,

        placedWidth: filledStrip.width,
        placedHeight: filledStrip.height,

        remainingHeight:
          targetHeight -
          (
            type === "horizontal"
              ? filledStrip.width
              : filledStrip.height
          ),

        plates: filledStrip.plates,
        cuts: filledStrip.cuts,
        freeRects: filledStrip.freeRects
      });

      /*
       * Nicht nur die Hauptbauteile entfernen, sondern auch
       * alle tatsächlich platzierten Füllbauteile.
       */
      remainingPlates = remainingPlates.filter(
        plate => !filledStrip.usedPlateIds.has(plate.id)
      );

      // Sicherheitsprüfung: Endlosschleifen verhindern.
      if (remainingPlates.length >= previousCount) {
        break;
      }

      continue;
    }

    /* --------------------------------------------------------
     * Klassisches 1D-Nesting
     * ------------------------------------------------------ */

    let currentX = 0;

    const positionedPlates = plates.map(plate => {
      const positionedPlate = {
        ...plate,
        x: currentX
      };

      currentX +=
        (Number(plate.height) || 0) +
        (Number(settings.cutGap) || 0);

      return positionedPlate;
    });

    const width =
      positionedPlates.length > 0
        ? Math.max(
            ...positionedPlates.map(
              plate => Number(plate.width) || 0
            )
          )
        : 0;

    strips.push({
      id: stripId++,
      type,

      partGap: settings.gap,
      cutGap: settings.cutGap,

      rotation: 0,

      placedWidth:
        type === "horizontal" ? height : width,

      placedHeight:
        type === "horizontal" ? width : height,

      width,
      height,

      remainingHeight: targetHeight - height,

      plates: positionedPlates
    });

    const usedIds = new Set(
      plates.map(plate => plate.id)
    );

    remainingPlates = remainingPlates.filter(
      plate => !usedIds.has(plate.id)
    );
  }

  return strips;
}


/* ------------------------------------------------------------
 * Hauptkombination finden
 * ---------------------------------------------------------- */

function findBestStripCombination(
  plates,
  verticalTarget,
  horizontalTarget,
  cutGap,
  stripDifference,
  settings
) {
  let bestCombination = null;

  /*
   * Kandidaten für den Vergleich im 2D-Modus.
   *
   * Wir behalten mehrere Auslastungsbereiche, damit nicht
   * ausschließlich vollständig gefüllte 1D-Strips bewertet
   * werden.
   */
  const candidateBuckets = new Map();

  const gap = Math.max(
    0,
    Number(cutGap) || 0
  );

  const difference = Math.max(
    0,
    Number(stripDifference) || 0
  );

  const maxTarget = Math.max(
    verticalTarget,
    horizontalTarget
  );

  const is2D = settings.nestingMode === "2d";

  function rememberCandidate(candidate) {
    if (!candidate) return;

    if (!is2D) {
      bestCombination = chooseBetterCombination(
        candidate,
        bestCombination
      );

      return;
    }

    /*
     * 10 Auslastungsbereiche je Orientierung:
     * 0–10 %, 10–20 % usw.
     */
    const bucket = Math.min(
      9,
      Math.floor(candidate.utilization * 10)
    );

    const key = `${candidate.type}:${bucket}`;

    if (!candidateBuckets.has(key)) {
      candidateBuckets.set(key, []);
    }

    const candidates = candidateBuckets.get(key);

    const signature = candidate.plates
      .map(plate => plate.id)
      .join("|");

    // Dieselbe Kombination nicht doppelt speichern.
    if (
      candidates.some(
        item => item.signature === signature
      )
    ) {
      return;
    }

    candidates.push({
      ...candidate,
      signature
    });

    candidates.sort((a, b) => {
      if (
        Math.abs(a.utilization - b.utilization) >
        EPSILON
      ) {
        return b.utilization - a.utilization;
      }

      return b.plates.length - a.plates.length;
    });

    if (
      candidates.length >
      MAX_CANDIDATES_PER_BUCKET
    ) {
      candidates.length =
        MAX_CANDIDATES_PER_BUCKET;
    }
  }


  function search(
    startIndex,
    selectedPlates,
    currentLength,
    minWidth,
    maxWidth
  ) {
    if (selectedPlates.length > 0) {
      /*
       * Vertikale Anordnung:
       * Bauteile bleiben ungedreht.
       */
      const verticalCandidate = createCandidate(
        selectedPlates,
        currentLength,
        verticalTarget,
        "vertical"
      );

      rememberCandidate(verticalCandidate);

      /*
       * Horizontale Anordnung:
       * Bauteile werden gedreht.
       *
       * Eine Rotation ist deshalb nur zulässig, wenn
       * allowRotation aktiviert ist.
       */
      if (settings.allowRotation) {
        const horizontalCandidate = createCandidate(
          selectedPlates,
          currentLength,
          horizontalTarget,
          "horizontal"
        );

        rememberCandidate(horizontalCandidate);
      }
    }

    for (
      let i = startIndex;
      i < plates.length;
      i++
    ) {
      const plate = plates[i];

      const plateWidth = Number(plate.width) || 0;
      const plateHeight = Number(plate.height) || 0;

      if (
        plateWidth <= 0 ||
        plateHeight <= 0
      ) {
        continue;
      }

      let newMinWidth;
      let newMaxWidth;

      if (selectedPlates.length === 0) {
        newMinWidth = plateWidth - difference;
        newMaxWidth = plateWidth + difference;
      } else {
        if (
          plateWidth < minWidth - EPSILON ||
          plateWidth > maxWidth + EPSILON
        ) {
          continue;
        }

        newMinWidth = minWidth;
        newMaxWidth = maxWidth;
      }

      const extraGap =
        selectedPlates.length > 0 ? gap : 0;

      const newLength =
        currentLength +
        extraGap +
        plateHeight;

      /*
       * Wenn die Kombination in keiner Orientierung mehr
       * in die verfügbare Länge passt, braucht dieser Zweig
       * nicht weiter durchsucht zu werden.
       */
      if (newLength > maxTarget + EPSILON) {
        continue;
      }

      selectedPlates.push(plate);

      search(
        i + 1,
        selectedPlates,
        newLength,
        newMinWidth,
        newMaxWidth
      );

      selectedPlates.pop();
    }
  }


  search(
    0,
    [],
    0,
    null,
    null
  );


  /*
   * Im normalen Modus reicht die klassische Bewertung.
   */
  if (!is2D) {
    return bestCombination;
  }


  /*
   * Im 2D-Modus jede gespeicherte Hauptkombination
   * tatsächlich auffüllen und anschließend vergleichen.
   */
  const candidates = [
    ...candidateBuckets.values()
  ].flat();

  let best2DCombination = null;
  let best2DScore = -Infinity;

  for (const candidate of candidates) {
    const mainIds = new Set(
      candidate.plates.map(plate => plate.id)
    );

    const fillCandidates = plates.filter(
      plate => !mainIds.has(plate.id)
    );

    const filledStrip = fillStrip2D(
      candidate.plates,
      fillCandidates,
      candidate.type,
      candidate.targetHeight,
      settings
    );

    if (!filledStrip.plates.length) {
      continue;
    }

    const packedArea = filledStrip.plates.reduce(
      (area, part) => {
        const width =
          Number(
            part.nestingFootprintWidth ??
            part.width
          ) || 0;

        const height =
          Number(
            part.nestingFootprintHeight ??
            part.height
          ) || 0;

        return area + width * height;
      },
      0
    );

    const nominalArea =
      filledStrip.nominalWidth *
      filledStrip.nominalHeight;

    const actualBoundingArea =
      filledStrip.width *
      filledStrip.height;

    const areaUtilization =
      packedArea / Math.max(1, nominalArea);

    const compactness =
      packedArea / Math.max(1, actualBoundingArea);

    const countUtilization =
      filledStrip.plates.length /
      Math.max(1, plates.length);

    /*
     * Gesamtscore:
     *
     * 55 % Flächennutzung der nominellen Stripfläche
     * 25 % tatsächlich gepackte Bauteile
     * 20 % Kompaktheit des fertigen Strips
     */
    const score =
      0.55 * areaUtilization +
      0.25 * countUtilization +
      0.20 * compactness;

    const isBetter =
      !best2DCombination ||
      score > best2DScore + EPSILON ||
      (
        Math.abs(score - best2DScore) <= EPSILON &&
        filledStrip.plates.length >
          best2DCombination.filledStrip.plates.length
      );

    if (isBetter) {
      best2DScore = score;

      best2DCombination = {
        ...candidate,
        filledStrip,
        nestingScore: score
      };
    }
  }

  return best2DCombination;
}


/* ------------------------------------------------------------
 * Kandidaten und Bewertung
 * ---------------------------------------------------------- */

function createCandidate(
  plates,
  length,
  targetLength,
  type
) {
  if (
    targetLength <= 0 ||
    length > targetLength + EPSILON
  ) {
    return null;
  }

  return {
    plates: [...plates],

    type,

    // Der bisherige Name bleibt erhalten, damit die
    // bestehenden Aufrufer kompatibel bleiben.
    height: length,
    targetHeight: targetLength,

    remainingHeight: targetLength - length,

    utilization: length / targetLength
  };
}


function chooseBetterCombination(
  candidate,
  currentBest
) {
  if (!candidate) return currentBest;
  if (!currentBest) return candidate;

  if (
    candidate.utilization >
    currentBest.utilization + EPSILON
  ) {
    return candidate;
  }

  if (
    candidate.utilization <
    currentBest.utilization - EPSILON
  ) {
    return currentBest;
  }

  if (
    candidate.plates.length >
    currentBest.plates.length
  ) {
    return candidate;
  }

  if (
    candidate.plates.length <
    currentBest.plates.length
  ) {
    return currentBest;
  }

  // Bei Gleichstand eine nicht gedrehte Anordnung bevorzugen.
  if (candidate.type === "vertical") {
    return candidate;
  }

  return currentBest;
}
