export function splitRect(rect, strip, settings = {}) {
  const freeRects = [];
  const cuts = [];

  const x = Number(rect.x) || 0;
  const y = Number(rect.y) || 0;
  const rectWidth = Number(rect.width) || 0;
  const rectHeight = Number(rect.height) || 0;

  const placedWidth = Number(strip.placedWidth) || 0;
  const placedHeight = Number(strip.placedHeight) || 0;
  const cutGap = Math.max(0, Number(settings.cutGap) || 0);

  const EPSILON = 1e-7;

  if (
    rectWidth <= 0 ||
    rectHeight <= 0 ||
    placedWidth <= 0 ||
    placedHeight <= 0 ||
    placedWidth > rectWidth + EPSILON ||
    placedHeight > rectHeight + EPSILON
  ) {
    return { freeRects, cuts };
  }

  const rightWidth = Math.max(
    0,
    rectWidth - placedWidth - cutGap
  );

  const bottomHeight = Math.max(
    0,
    rectHeight - placedHeight - cutGap
  );

  const cutOrientation = String(
    strip.cutOrientation ?? strip.type ?? "vertical"
  ).toLowerCase();

  const horizontalFirst = cutOrientation === "horizontal";

  const addFreeRect = (freeX, freeY, width, height) => {
    if (width <= EPSILON || height <= EPSILON) {
      return;
    }

    freeRects.push({
      ...rect,
      x: freeX,
      y: freeY,
      width,
      height
    });
  };

  const addCut = (cutX, cutY, width, height) => {
    if (width <= EPSILON || height <= EPSILON) {
      return;
    }

    cuts.push({
      sheet: rect.sheet,
      x: cutX,
      y: cutY,
      width,
      height
    });
  };

  if (horizontalFirst) {
    /*
     * Zuerst horizontal schneiden:
     *
     *  +-----------------------+
     *  | Bauteil | rechter Rest|
     *  +---------+-------------+
     *  |      unterer Rest     |
     *  +-----------------------+
     */

    addFreeRect(
      x + placedWidth + cutGap,
      y,
      rightWidth,
      placedHeight
    );

    addFreeRect(
      x,
      y + placedHeight + cutGap,
      rectWidth,
      bottomHeight
    );

    if (bottomHeight > EPSILON) {
      addCut(
        x,
        y + placedHeight,
        rectWidth,
        cutGap
      );
    }

    if (rightWidth > EPSILON) {
      addCut(
        x + placedWidth,
        y,
        cutGap,
        placedHeight
      );
    }
  } else {
    /*
     * Zuerst vertikal schneiden:
     *
     *  +---------+-------------+
     *  | Bauteil |             |
     *  |         | rechter Rest|
     *  +---------+             |
     *  | unterer Rest           |
     *  +-----------------------+
     */

    addFreeRect(
      x + placedWidth + cutGap,
      y,
      rightWidth,
      rectHeight
    );

    addFreeRect(
      x,
      y + placedHeight + cutGap,
      placedWidth,
      bottomHeight
    );

    if (rightWidth > EPSILON) {
      addCut(
        x + placedWidth,
        y,
        cutGap,
        rectHeight
      );
    }

    if (bottomHeight > EPSILON) {
      addCut(
        x,
        y + placedHeight,
        placedWidth,
        cutGap
      );
    }
  }

  return {
    freeRects,
    cuts
  };
}
