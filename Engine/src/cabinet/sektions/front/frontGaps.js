import { findTreeNode, updateTree } from "../../../shared/tree.js";

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const childrenOf = front => Array.isArray(front?.children) ? front.children : [];

export const flattenLeafFronts = fronts => (fronts ?? []).flatMap(front => {
    const children = childrenOf(front);
    return children.length > 0 ? flattenLeafFronts(children) : [front];
});

const rangeOverlaps = (startA, sizeA, startB, sizeB) =>
    Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB) > 0.001;

export const getFrontGapContext = (fronts, frontId, cabinet) => {
    const front = findTreeNode(fronts ?? [], frontId);
    if (!front) return null;
    const leaves = flattenLeafFronts(fronts).filter(item => item.id !== front.id);
    const x = numberOr(front.x);
    const y = numberOr(front.y);
    const width = numberOr(front.width);
    const height = numberOr(front.height);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const verticalCandidates = leaves.filter(item => rangeOverlaps(y, height, numberOr(item.y), numberOr(item.height)));
    const horizontalCandidates = leaves.filter(item => rangeOverlaps(x, width, numberOr(item.x), numberOr(item.width)));
    const left = verticalCandidates
        .filter(item => numberOr(item.x) + numberOr(item.width) / 2 < centerX)
        .sort((a, b) => numberOr(b.x) + numberOr(b.width) - numberOr(a.x) - numberOr(a.width))[0] ?? null;
    const right = verticalCandidates
        .filter(item => numberOr(item.x) + numberOr(item.width) / 2 > centerX)
        .sort((a, b) => numberOr(a.x) - numberOr(b.x))[0] ?? null;
    const top = horizontalCandidates
        .filter(item => numberOr(item.y) + numberOr(item.height) / 2 < centerY)
        .sort((a, b) => numberOr(b.y) + numberOr(b.height) - numberOr(a.y) - numberOr(a.height))[0] ?? null;
    const bottom = horizontalCandidates
        .filter(item => numberOr(item.y) + numberOr(item.height) / 2 > centerY)
        .sort((a, b) => numberOr(a.y) - numberOr(b.y))[0] ?? null;
    const anchors = {
        left: left ? numberOr(left.x) + numberOr(left.width) : 0,
        right: right ? numberOr(right.x) : numberOr(cabinet?.width),
        top: top ? numberOr(top.y) + numberOr(top.height) : 0,
        bottom: bottom ? numberOr(bottom.y) : numberOr(cabinet?.height)
    };
    return {
        front,
        neighbors: { left, right, top, bottom },
        anchors,
        gaps: {
            left: x - anchors.left,
            right: anchors.right - (x + width),
            top: y - anchors.top,
            bottom: anchors.bottom - (y + height)
        }
    };
};

export const applyFrontGaps = ({ cabinet, frontId, gaps }) => {
    const context = getFrontGapContext(cabinet?.fronts, frontId, cabinet);
    if (!context) return { cabinet, front: null, changed: false };
    const left = context.anchors.left + numberOr(gaps?.left, context.gaps.left);
    const right = context.anchors.right - numberOr(gaps?.right, context.gaps.right);
    const top = context.anchors.top + numberOr(gaps?.top, context.gaps.top);
    const bottom = context.anchors.bottom - numberOr(gaps?.bottom, context.gaps.bottom);
    if (right - left <= 0.001 || bottom - top <= 0.001) {
        return { cabinet, front: context.front, changed: false };
    }
    const nextFront = {
        ...context.front,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        gapLeft: numberOr(gaps?.left, context.gaps.left),
        gapRight: numberOr(gaps?.right, context.gaps.right),
        gapTop: numberOr(gaps?.top, context.gaps.top),
        gapBottom: numberOr(gaps?.bottom, context.gaps.bottom),
        manualFrontGaps: true
    };
    const fronts = updateTree(cabinet.fronts ?? [], frontId, () => nextFront);
    return { cabinet: { ...cabinet, fronts }, front: nextFront, changed: true };
};
