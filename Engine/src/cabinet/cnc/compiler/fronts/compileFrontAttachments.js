import { addOperation, getSource, isSidePart } from "../cncHelpers.js";
import {
    FRONT_ATTACHMENT_TYPES,
    getDrawerFrontGroups,
    getFrontBoxPositionFromBottom,
    getFrontLegraboxVariant
} from "../../../sektions/front/frontAttachments.js";
import { getLeafFronts } from "../../../partList/geometry/get/getLeafFronts.js";
import {
    MACHINING_INTENT_IDS,
    MACHINING_KINDS
} from "../../../../postprocessor/machiningModel.js";

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const frontPointToPart = ({ part, verticalFromTop, horizontalFromLeft }) => {
    if (getSource(part).orientation === "widthOnDx") {
        return {
            x: horizontalFromLeft,
            y: verticalFromTop
        };
    }

    return {
        x: verticalFromTop,
        y: horizontalFromLeft
    };
};

const addFrontDrill = ({ part, point, drill, intentId, source }) => {
    const coordinates = frontPointToPart({
        part,
        verticalFromTop: point.verticalFromTop,
        horizontalFromLeft: point.horizontalFromLeft
    });

    addOperation(part, {
        kind: MACHINING_KINDS.DRILL_POINT,
        intentId,
        face: "A",
        x: coordinates.x,
        y: coordinates.y,
        diameter: numberOr(drill.diameter, 5),
        depth: numberOr(drill.depth, 1),
        source
    });
};

const compileDrawerFront = ({ cabinet, front, part, config }) => {
    const drawerConfig = config.fronts.drawer;
    const boxPositionFromBottom = getFrontBoxPositionFromBottom({
        cabinet,
        front,
        fallback: drawerConfig.fallbackBoxPositionFromBottom
    });
    const height = numberOr(front.height);
    const width = numberOr(front.width);
    const leftGap = numberOr(front.gapLeft);
    const rightGap = numberOr(front.gapRight);

    const variant = getFrontLegraboxVariant(cabinet, front);
    const groups = getDrawerFrontGroups(drawerConfig, variant);

    groups.forEach((group, groupIndex) => (group.holes ?? []).forEach((hole, holeIndex) => {
        const verticalFromBottom = boxPositionFromBottom +
            numberOr(group.verticalOffset) +
            numberOr(hole.verticalOffset);
        const verticalFromTop = height - verticalFromBottom;
        const sideOffset = Math.max(0, numberOr(hole.sideOffset, 33));
        const left = Math.max(0, sideOffset - leftGap);
        const right = Math.min(width, width - sideOffset + rightGap);

        [
            ["left", left],
            ["right", right]
        ].forEach(([side, horizontalFromLeft]) => addFrontDrill({
            part,
            point: { verticalFromTop, horizontalFromLeft },
            drill: hole,
            intentId: MACHINING_INTENT_IDS.FRONT_DRAWER_MOUNT,
            source: {
                type: "frontAttachment",
                role: "drawerFront",
                frontId: front.id,
                side,
                variant,
                programId: group.programId,
                groupId: group.id,
                groupIndex,
                holeIndex,
                boxPositionFromBottom,
                verticalFromBottom
            }
        }));
    }));
};

const getDoorCenters = (front, cup) => {
    const height = numberOr(front.height);
    const top = Math.max(0, numberOr(cup.topOffset, 100));
    const bottom = Math.min(height, height - Math.max(0, numberOr(cup.bottomOffset, 100)));

    return Math.abs(top - bottom) < 0.001 ? [top] : [top, bottom];
};

const compileDoorFront = ({ front, part, config }) => {
    const doorConfig = config.fronts.door;
    const cup = doorConfig.cup;

    if (cup.enabled === false) {
        return;
    }

    const width = numberOr(front.width);
    const hingeSide = front.attachment?.hingeSide === "right" ? "right" : "left";
    const edgeOffset = Math.max(0, numberOr(cup.edgeOffset, 22.5));
    const cupX = hingeSide === "right" ? width - edgeOffset : edgeOffset;

    getDoorCenters(front, cup).forEach((verticalFromTop, hingeIndex) => {
        addFrontDrill({
            part,
            point: { verticalFromTop, horizontalFromLeft: cupX },
            drill: cup,
            intentId: MACHINING_INTENT_IDS.FRONT_HINGE_CUP,
            source: {
                type: "frontAttachment",
                role: "hingeCup",
                frontId: front.id,
                hingeSide,
                hingeIndex
            }
        });

        (doorConfig.auxiliaryHoles ?? []).forEach((hole, holeIndex) => {
            const horizontalOffset = numberOr(hole.horizontalOffset);
            const horizontalFromLeft = hingeSide === "right"
                ? cupX - horizontalOffset
                : cupX + horizontalOffset;

            addFrontDrill({
                part,
                point: {
                    verticalFromTop: verticalFromTop + numberOr(hole.verticalOffset),
                    horizontalFromLeft
                },
                drill: hole,
                intentId: MACHINING_INTENT_IDS.FRONT_HINGE_AUXILIARY,
                source: {
                    type: "frontAttachment",
                    role: "hingeAuxiliary",
                    frontId: front.id,
                    hingeSide,
                    hingeIndex,
                    holeIndex
                }
            });
        });
    });
};

const findSidePart = (parts, side) => parts.find(part => {
    if (!isSidePart(part)) {
        return false;
    }

    const instances = getSource(part).instances ?? [];
    return instances.some(instance => instance.side === side);
});

const compileDoorCorpus = ({ front, parts, config }) => {
    const corpus = config.fronts.door.corpus;

    if (corpus.enabled === false) {
        return;
    }

    const hingeSide = front.attachment?.hingeSide === "right" ? "right" : "left";
    const part = findSidePart(parts, hingeSide);

    if (!part) {
        return;
    }

    const instance = (getSource(part).instances ?? [])[0] ?? {};
    const instanceY = numberOr(instance.y);
    const centers = getDoorCenters(front, config.fronts.door.cup);

    centers.forEach((center, hingeIndex) => {
        (corpus.centerOffsets ?? [-32, 32]).forEach((offset, holeIndex) => {
            const positionFromCabinetTop =
                numberOr(front.y) +
                center +
                numberOr(offset) -
                instanceY;
            const x = hingeSide === "left"
                ? numberOr(part.L) - positionFromCabinetTop
                : positionFromCabinetTop;

            addOperation(part, {
                kind: MACHINING_KINDS.DRILL_POINT,
                intentId: MACHINING_INTENT_IDS.CABINET_HINGE_PLATE,
                face: "A",
                x,
                y: numberOr(corpus.frontOffset, 37),
                diameter: numberOr(corpus.diameter, 5),
                depth: numberOr(corpus.depth, 15),
                source: {
                    type: "frontAttachment",
                    role: "hingeCorpus",
                    frontId: front.id,
                    hingeSide,
                    hingeIndex,
                    holeIndex,
                    cupCenterOffset: offset,
                    mirroredForCncFrontEdge: hingeSide === "left"
                }
            });
        });
    });
};

export const compileFrontAttachments = ({ cabinet, parts, config }) => {
    const fronts = getLeafFronts(cabinet.fronts ?? [])
        .filter(front => !front.isRemoved && front.attachment?.type && front.attachment.type !== FRONT_ATTACHMENT_TYPES.NONE);

    fronts.forEach(front => {
        const part = parts.find(candidate => String(getSource(candidate).frontId) === String(front.id));

        if (!part) {
            return;
        }

        if (
            front.attachment.type === FRONT_ATTACHMENT_TYPES.DRAWER ||
            front.attachment.type === FRONT_ATTACHMENT_TYPES.INSET_DRAWER
        ) {
            compileDrawerFront({ cabinet, front, part, config });
            return;
        }

        if (front.attachment.type === FRONT_ATTACHMENT_TYPES.DOOR) {
            compileDoorFront({ front, part, config });
            compileDoorCorpus({ front, parts, config });
        }
    });
};
