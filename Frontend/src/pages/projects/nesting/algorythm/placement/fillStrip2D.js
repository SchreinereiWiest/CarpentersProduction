import { splitRect } from "../guillotineSplit";

const CUT_ORIENTATIONS = ["vertical", "horizontal"];
const EPSILON = 1e-7;


function getPlateWidth(plate) {
  return Math.max(
    0,
    Number(plate?.width ?? plate?.originalWidth) || 0
  );
}


function getPlateHeight(plate) {
  return Math.max(
    0,
    Number(plate?.height ?? plate?.originalHeight) || 0
  );
}


function createPackedPart(
  plate,
  x,
  y,
  width,
  height,
  rotation
) {
  const originalWidth =
    Number(plate.originalWidth ?? plate.width) || 0;

  const originalHeight =
    Number(plate.originalHeight ?? plate.height) || 0;

  const itemWidth =
    rotation === 90 ? originalHeight : originalWidth;

  const itemHeight =
    rotation === 90 ? originalWidth : originalHeight;

  return {
    ...plate,

    originalWidth,
    originalHeight,
    placedWidth: itemWidth,
    placedHeight: itemHeight,
    rotation,

    nestingX: x,
    nestingY: y,

    nestingFootprintWidth: width,
    nestingFootprintHeight: height,

    nestingRotation: rotation,

    // Physische Position innerhalb des Footprints.
    x: x + (width - itemWidth) / 2,
    y: y + (height - itemHeight) / 2
  };
}


function getRemainingArea(freeSpaces) {
  return freeSpaces.reduce(
    (area, space) =>
      area + space.width * space.height,
    0
  );
}

function getCutsInsideRect(cuts, rect) {
  return cuts.filter(cut => (
    cut.x >= rect.x - EPSILON &&
    cut.y >= rect.y - EPSILON &&
    cut.x + cut.width <= rect.x + rect.width + EPSILON &&
    cut.y + cut.height <= rect.y + rect.height + EPSILON
  ));
}


function countPotentialFills(
  plates,
  freeSpaces,
  allowRotation
) {
  return plates.reduce((count, plate) => {
    const width = getPlateWidth(plate);
    const height = getPlateHeight(plate);

    const fits = freeSpaces.some((space) => {
      const fitsNormally =
        width <= space.width + EPSILON &&
        height <= space.height + EPSILON;

      const fitsRotated =
        allowRotation &&
        height <= space.width + EPSILON &&
        width <= space.height + EPSILON;

      return fitsNormally || fitsRotated;
    });

    return count + Number(fits);
  }, 0);
}


/*
 * Wählt eine möglichst gut passende Kombination aus:
 * Bauteil, Freifläche, Rotation und Schnittrichtung.
 *
 * Ein niedrigerer Score ist besser.
 */
function findBestFillPlacement(
  remainingPlates,
  freeSpaces,
  settings
) {
  let best = null;

  const rotations = settings.allowRotation
    ? [0, 90]
    : [0];

  remainingPlates.forEach((plate, plateIndex) => {
    rotations.forEach((rotation) => {
      const baseWidth = getPlateWidth(plate);
      const baseHeight = getPlateHeight(plate);

      const width =
        rotation === 90 ? baseHeight : baseWidth;

      const height =
        rotation === 90 ? baseWidth : baseHeight;

      if (width <= 0 || height <= 0) {
        return;
      }

      freeSpaces.forEach((space, spaceIndex) => {
        if (
          width > space.width + EPSILON ||
          height > space.height + EPSILON
        ) {
          return;
        }

        const remainingWidth = Math.max(
          0,
          space.width - width
        );

        const remainingHeight = Math.max(
          0,
          space.height - height
        );

        const shortSideFit = Math.min(
          remainingWidth,
          remainingHeight
        );

        const longSideFit = Math.max(
          remainingWidth,
          remainingHeight
        );

        const spaceArea =
          space.width * space.height;

        const partArea = width * height;

        const areaWasteRatio =
          (spaceArea - partArea) /
          Math.max(1, spaceArea);

        const dimensionScale = Math.max(
          1,
          space.width,
          space.height
        );

        const shortSideRatio =
          shortSideFit / dimensionScale;

        const longSideRatio =
          longSideFit / dimensionScale;

        CUT_ORIENTATIONS.forEach((cutOrientation) => {
          const split = splitRect(
            space,
            {
              placedWidth: width,
              placedHeight: height,
              cutOrientation
            },
            settings
          );

          const nextFreeSpaces = [
            ...freeSpaces.filter(
              (_, index) => index !== spaceIndex
            ),
            ...split.freeRects
          ];

          const remainingAfterPlacement =
            remainingPlates.filter(
              (_, index) => index !== plateIndex
            );

          // Nur eine Vorschau auf mögliche Folgeplatzierungen.
          // Diese werden noch nicht als gepackt gezählt.
          const potentialCount = countPotentialFills(
            remainingAfterPlacement,
            nextFreeSpaces,
            settings.allowRotation
          );

          /*
           * Best-Fit-Bewertung:
           * - möglichst wenig verschwendete Fläche
           * - kleine Seitenreste
           * - wenige unnötige Freiflächen
           */
          const score =
            0.50 * areaWasteRatio +
            0.25 * shortSideRatio +
            0.15 * longSideRatio +
            0.01 * nextFreeSpaces.length;

          const candidate = {
            plateIndex,
            spaceIndex,
            width,
            height,
            rotation,
            score,
            potentialCount,
            nextFreeSpaces,
            cuts: getCutsInsideRect(split.cuts, space),
            partArea
          };

          const isBetter =
            !best ||
            score < best.score - EPSILON ||
            (
              Math.abs(score - best.score) <= EPSILON &&
              potentialCount > best.potentialCount
            ) ||
            (
              Math.abs(score - best.score) <= EPSILON &&
              potentialCount === best.potentialCount &&
              partArea > best.partArea
            );

          if (isBetter) {
            best = candidate;
          }
        });
      });
    });
  });

  return best;
}


export function fillStrip2D(
  mainPlates = [],
  remainingPlates = [],
  type,
  targetLength,
  settings = {}
) {
  if (!mainPlates.length) {
    return {
      width: 0,
      height: 0,
      nominalWidth: 0,
      nominalHeight: 0,
      plates: [],
      cuts: [],
      freeRects: [],
      usedPlateIds: new Set()
    };
  }

  const cutGap = Math.max(
    0,
    Number(settings.cutGap) || 0
  );

  const target = Math.max(
    0,
    Number(targetLength) || 0
  );

  /*
   * Vertikal:
   *   Bauteile bleiben ungedreht und werden entlang Y angeordnet.
   *
   * Horizontal:
   *   Bauteile werden um 90° gedreht und entlang X angeordnet.
   */
  const rotation = type === "horizontal" ? 90 : 0;
  const mainCutOrientation =
    type === "vertical" ? "horizontal" : "vertical";
  const mainParts = [];
  const cuts = [];

  /* Schritt 1: Hauptteile mit gültigen Guillotine-Schnitten anordnen. */
  const nominalWidth =
    type === "horizontal"
      ? target
      : Math.max(...mainPlates.map(getPlateWidth));
  const nominalHeight =
    type === "horizontal"
      ? Math.max(...mainPlates.map(getPlateWidth))
      : target;

  let freeSpaces = [{
    x: 0,
    y: 0,
    width: nominalWidth,
    height: nominalHeight
  }];
  let mainSpace = freeSpaces[0];
  let mainLength = 0;

  for (let index = 0; index < mainPlates.length; index++) {
    const plate = mainPlates[index];

    const baseWidth = getPlateWidth(plate);
    const baseHeight = getPlateHeight(plate);

    const width =
      rotation === 90 ? baseHeight : baseWidth;

    const height =
      rotation === 90 ? baseWidth : baseHeight;

    if (width <= 0 || height <= 0) {
      continue;
    }

    const axisLength = type === "horizontal" ? width : height;
    const nextLength =
      mainLength +
      (index > 0 ? cutGap : 0) +
      axisLength;

    if (
      !mainSpace ||
      nextLength > target + EPSILON ||
      width > mainSpace.width + EPSILON ||
      height > mainSpace.height + EPSILON
    ) {
      return {
        width: 0,
        height: 0,
        nominalWidth: 0,
        nominalHeight: 0,
        plates: [],
        cuts: [],
        freeRects: [],
        usedPlateIds: new Set()
      };
    }

    const x = mainSpace.x;
    const y = mainSpace.y;

    mainParts.push(
      createPackedPart(
        plate,
        x,
        y,
        width,
        height,
        rotation
      )
    );

    const split = splitRect(
      mainSpace,
      {
        placedWidth: width,
        placedHeight: height,
        cutOrientation: mainCutOrientation
      },
      { ...settings, cutGap }
    );
    const mainSpaceIndex = freeSpaces.indexOf(mainSpace);
    freeSpaces.splice(mainSpaceIndex, 1, ...split.freeRects);
    cuts.push(...getCutsInsideRect(split.cuts, mainSpace));
    mainLength = nextLength;

    if (index < mainPlates.length - 1) {
      const nextX = type === "horizontal" ? x + width + cutGap : x;
      const nextY = type === "vertical" ? y + height + cutGap : y;
      mainSpace = split.freeRects.find(
        space =>
          Math.abs(space.x - nextX) <= EPSILON &&
          Math.abs(space.y - nextY) <= EPSILON
      );
    }
  }

  if (!mainParts.length) {
    return {
      width: 0,
      height: 0,
      nominalWidth: 0,
      nominalHeight: 0,
      plates: [],
      cuts: [],
      freeRects: [],
      usedPlateIds: new Set()
    };
  }

  if (mainLength > target + EPSILON) {
    // Die Kombination passt geometrisch nicht in die Zielrichtung.
    return {
      width: 0,
      height: 0,
      nominalWidth: 0,
      nominalHeight: 0,
      plates: [],
      cuts: [],
      freeRects: [],
      usedPlateIds: new Set()
    };
  }

  const stripWidth = nominalWidth;
  const stripHeight = nominalHeight;

  /*
   * Hauptbauteile dürfen nicht ein zweites Mal als Füllteile
   * angeboten werden.
   */
  const mainIds = new Set(
    mainParts.map(part => part.id)
  );

  const remaining = remainingPlates.filter(
    plate => !mainIds.has(plate.id)
  );

  const packedParts = [...mainParts];

  let packedArea = packedParts.reduce(
    (area, part) =>
      area +
      part.nestingFootprintWidth *
      part.nestingFootprintHeight,
    0
  );

  while (
    remaining.length > 0 &&
    freeSpaces.length > 0
  ) {
    const placement = findBestFillPlacement(
      remaining,
      freeSpaces,
      settings
    );

    if (!placement) {
      break;
    }

    const [plate] = remaining.splice(
      placement.plateIndex,
      1
    );

    const space = freeSpaces[placement.spaceIndex];

    packedParts.push(
      createPackedPart(
        plate,
        space.x,
        space.y,
        placement.width,
        placement.height,
        placement.rotation
      )
    );

    packedArea += placement.partArea;
    cuts.push(...placement.cuts);

    /*
     * Die gewählte Freifläche durch ihre neuen Teilflächen
     * ersetzen. Alle übrigen Freiflächen bleiben erhalten.
     */
    freeSpaces.splice(
      0,
      freeSpaces.length,
      ...placement.nextFreeSpaces
    );
  }

  /*
   * Tatsächliche Außenabmessungen des fertig gepackten Strips.
   */
  const finalWidth = Math.max(
    ...packedParts.map(
      part =>
        part.nestingX +
        part.nestingFootprintWidth
    )
  );

  const finalHeight = Math.max(
    ...packedParts.map(
      part =>
        part.nestingY +
        part.nestingFootprintHeight
    )
  );

  /*
   * Übrig gebliebene Rechtecke auf den tatsächlichen Strip
   * beschränken, damit sie nicht über dessen Außenmaße ragen.
   */
  const remainingFreeRects = freeSpaces
    .filter(
      space =>
        space.x < finalWidth &&
        space.y < finalHeight
    )
    .map(space => ({
      ...space,

      width: Math.min(
        space.width,
        finalWidth - space.x
      ),

      height: Math.min(
        space.height,
        finalHeight - space.y
      )
    }))
    .filter(
      space =>
        space.width > EPSILON &&
        space.height > EPSILON
    );

  const usedPlateIds = new Set(
    packedParts.map(part => part.id)
  );

  return {
    width: finalWidth,
    height: finalHeight,

    nominalWidth,
    nominalHeight,

    packedArea,
    remainingArea: getRemainingArea(remainingFreeRects),

    plates: packedParts,
    cuts,
    freeRects: remainingFreeRects,
    usedPlateIds
  };
}
