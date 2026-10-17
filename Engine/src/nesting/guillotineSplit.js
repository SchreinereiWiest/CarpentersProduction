export function splitRect(rect, strip, settings = {}) {
  const freeRects = [];
  const cuts = [];

  const x = Number(rect.x) || 0;
  const y = Number(rect.y) || 0;
  const rectWidth = Number(rect.width) || 0;
  const rectHeight = Number(rect.height) || 0;

  const placedWidth = Number(strip.placedWidth) || 0;
  const placedHeight = Number(strip.placedHeight) || 0;
  const requestedX = Number(strip.x);
  const requestedY = Number(strip.y);
  const placedX = Number.isFinite(requestedX) ? requestedX : x;
  const placedY = Number.isFinite(requestedY) ? requestedY : y;
  const cutGap = Math.max(0, Number(settings.cutGap) || 0);

  const EPSILON = 1e-7;

  if (
    rectWidth <= 0 ||
    rectHeight <= 0 ||
    placedWidth <= 0 ||
    placedHeight <= 0 ||
    placedX < x - EPSILON ||
    placedY < y - EPSILON ||
    placedX + placedWidth > x + rectWidth + EPSILON ||
    placedY + placedHeight > y + rectHeight + EPSILON
  ) {
    return { freeRects, cuts };
  }

  const leftOffset = Math.max(0, placedX - x);
  const topOffset = Math.max(0, placedY - y);
  const hasLeftSide = leftOffset > EPSILON;
  const hasTopSide = topOffset > EPSILON;
  const leftWidth = Math.max(
    0,
    leftOffset - (hasLeftSide ? cutGap : 0)
  );
  const topHeight = Math.max(
    0,
    topOffset - (hasTopSide ? cutGap : 0)
  );
  const rightWidth = Math.max(
    0,
    x + rectWidth - placedX - placedWidth - cutGap
  );

  const bottomHeight = Math.max(
    0,
    y + rectHeight - placedY - placedHeight - cutGap
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
      x,
      y,
      rectWidth,
      topHeight
    );

    addFreeRect(
      x,
      placedY + placedHeight + cutGap,
      rectWidth,
      bottomHeight
    );

    addFreeRect(
      x,
      placedY,
      leftWidth,
      placedHeight
    );

    addFreeRect(
      placedX + placedWidth + cutGap,
      placedY,
      rightWidth,
      placedHeight
    );

    if (topHeight > EPSILON) {
      addCut(
        x,
        placedY - cutGap,
        rectWidth,
        cutGap
      );
    }

    if (bottomHeight > EPSILON) {
      addCut(
        x,
        placedY + placedHeight,
        rectWidth,
        cutGap
      );
    }

    if (leftWidth > EPSILON) {
      addCut(
        placedX - cutGap,
        placedY,
        cutGap,
        placedHeight
      );
    }

    if (rightWidth > EPSILON) {
      addCut(
        placedX + placedWidth,
        placedY,
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
      x,
      y,
      leftWidth,
      rectHeight
    );

    addFreeRect(
      placedX + placedWidth + cutGap,
      y,
      rightWidth,
      rectHeight
    );

    addFreeRect(
      placedX,
      y,
      placedWidth,
      topHeight
    );

    addFreeRect(
      placedX,
      placedY + placedHeight + cutGap,
      placedWidth,
      bottomHeight
    );

    if (leftWidth > EPSILON) {
      addCut(
        placedX - cutGap,
        y,
        cutGap,
        rectHeight
      );
    }

    if (rightWidth > EPSILON) {
      addCut(
        placedX + placedWidth,
        y,
        cutGap,
        rectHeight
      );
    }

    if (topHeight > EPSILON) {
      addCut(
        placedX,
        placedY - cutGap,
        placedWidth,
        cutGap
      );
    }

    if (bottomHeight > EPSILON) {
      addCut(
        placedX,
        placedY + placedHeight,
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
