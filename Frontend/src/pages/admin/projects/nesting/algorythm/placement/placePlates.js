import { canFit } from "../helper/helpers";
import { splitRect } from "../guillotineSplit";

export function placePlates(plates, iteration, settings) {

    for (const plate of plates) {

        let placed = false;

        for (let i = 0; i < iteration.freeRects.length; i++) {

            const rect = iteration.freeRects[i];
            

            let rotate = false;

            let width = plate.width;
            let height = plate.height;

            if (
                settings.allowRotation &&
                Math.random() < settings.rotationChance
            ) {

                if (canFit(rect, plate.height, plate.width, settings.gap)) {

                    rotate = true;

                    width = plate.height;
                    height = plate.width;

                }

            }

            if (!canFit(rect, width, height, settings.gap))
                continue;

            iteration.placedPlates.push({

                ...plate,

                x: rect.x,
                y: rect.y,

                width,
                height,

                rotated: rotate,

                sheet: rect.sheet

            });

            iteration.freeRects.splice(i, 1);

            const split = splitRect(
                rect,
                width,
                height,
                settings,
                "h"
            );

            iteration.freeRects.unshift(...split.freeRects);

            iteration.cuts.push(...split.cuts);

            placed = true;

            break;

        }

        if (!placed)
            return false;

    }

    return true;

}