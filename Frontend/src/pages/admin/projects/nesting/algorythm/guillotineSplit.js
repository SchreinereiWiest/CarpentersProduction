export function splitRect(rect, strip, settings) {

    const freeRects = [];
    const cuts = [];

    const rightWidth =
        rect.width -
        strip.placedWidth -
        settings.cutGap;

    const bottomHeight =
        rect.height -
        strip.placedHeight -
        settings.cutGap;

    let cut = true;

    if (strip.type == "horizontal") {
        cut = true;
    } else {
        cut = false;
    }

    let rightHeight = rect.height
    if (cut) {
        rightHeight = rect.height - (rect.height - strip.placedHeight)
    }

    let bottomWidth = rect.width
    if (!cut) {
        bottomWidth = rect.width - (rect.width - strip.placedWidth)
    }

    if (rightWidth > 0) {

        freeRects.push({

            sheet: rect.sheet,

            x:
                rect.x +
                strip.placedWidth +
                settings.cutGap,

            y: rect.y,

            width: rightWidth,

            height: rightHeight

        });

        cuts.push({

            sheet: rect.sheet,

            x:
                rect.x +
                strip.placedWidth,

            y: rect.y,

            width: settings.cutGap,

            height: rightHeight

        });

    }

    if (bottomHeight > 0) {

        freeRects.push({

            sheet: rect.sheet,

            x: rect.x,

            y:
                rect.y +
                strip.placedHeight +
                settings.cutGap,

            width: bottomWidth,

            height: bottomHeight

        });

        cuts.push({

            sheet: rect.sheet,

            x: rect.x,

            y:
                rect.y +
                strip.placedHeight,

            width: bottomWidth,

            height: settings.cutGap

        });

    }

    return {

        freeRects,
        cuts

    };

}