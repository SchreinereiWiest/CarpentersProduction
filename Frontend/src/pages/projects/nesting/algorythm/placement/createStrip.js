const EPSILON = 1e-7;


/* ------------------------------------------------------------
 * Öffentliche Funktion
 * ---------------------------------------------------------- */

export function createStrips(
  sortedPlates = [],
  settings = {}
) {
  // 2D nutzt nestPlates2D direkt; hier bleibt die Strip-Bildung ausschließlich 1D.
  if (settings.nestingMode === "2d") return [];

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

  function rememberCandidate(candidate) {
    if (!candidate) return;
    bestCombination = chooseBetterCombination(
      candidate,
      bestCombination
    );
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


  return bestCombination;
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
