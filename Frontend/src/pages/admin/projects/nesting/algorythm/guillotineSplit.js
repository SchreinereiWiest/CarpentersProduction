export function splitRect(rect, width, height, settings, cut) {

    const freeRects = [];
    const cuts = [];

    const rightWidth =
        rect.width -
        width -
        settings.gap -
        settings.cutGap;

    const bottomHeight =
        rect.height -
        height -
        settings.gap -
        settings.cutGap;

    let rightHeight = rect.height
    if (cut=="h") {
    rightHeight =rect.height - (rect.height - height-settings.gap)}

    let bottomWidth = rect.width
    if (cut=="v") {
        bottomWidth = rect.width - (rect.width-width-settings.gap)}

    if (rightWidth > 0) {

        freeRects.push({

            sheet: rect.sheet,

            x:
                rect.x +
                width +
                settings.gap +
                settings.cutGap,

            y: rect.y,

            width: rightWidth,

            height: rightHeight

        });

        cuts.push({

            sheet: rect.sheet,

            x:
                rect.x +
                width +
                settings.gap,

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
                height +
                settings.gap +
                settings.cutGap,

            width: bottomWidth,

            height: bottomHeight

        });

        cuts.push({

            sheet: rect.sheet,

            x: rect.x,

            y:
                rect.y +
                height +
                settings.gap,

            width: bottomWidth,

            height: settings.cutGap

        });

    }

    return {

        freeRects,
        cuts

    };

}