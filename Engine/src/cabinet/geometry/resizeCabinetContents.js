import { calculateSplitSizes } from "../sektions/calcSplitSizes.js";
import { frontsToSections } from "../sektions/functions/parseFrontSections.js";
import { getAvailableCabinetArea } from "../sektions/functions/getAvailableCabinetArea.js";


const childrenOf = node =>
    Array.isArray(node?.children)
        ? node.children
        : [];

const inferNodeLayout = (nodes, layout) => {
    const containsLockedWall = nodes.some(node => node?.lockedMiddleWall === true);
    if (layout?.spec && layout?.direction && !containsLockedWall) return layout;
    const direction = nodes.length <= 1 || nodes.some((node, index) =>
        index > 0 && Math.abs(Number(node.y) - Number(nodes[0].y)) > 0.001)
        ? "vertical"
        : "horizontal";
    const sizeKey = direction === "vertical" ? "height" : "width";
    const spec = nodes.map(node => {
        const size = Math.max(0.001, Number(node[sizeKey]) || 0.001);
        return node.lockedMiddleWall ? `${size}mm` : String(size);
    }).join(":");
    return { ...(layout ?? {}), source: layout?.source ?? "inferred", direction, spec, gap: layout?.gap ?? 0 };
};


const reflowNodes = ({
    nodes,
    bounds,
    layout,
    kind,
    defaultGap
}) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
    }

    const effectiveLayout = inferNodeLayout(nodes, layout);

    const direction =
        effectiveLayout.direction === "horizontal"
            ? "horizontal"
            : "vertical";

    const gap =
        kind === "front"
            ? Math.max(
                0,
                Number(
                    effectiveLayout.gap ??
                    defaultGap ??
                    0
                ) || 0
            )
            : Math.max(
                0,
                Number(effectiveLayout.gap ?? 0) || 0
            );

    const totalSize =
        direction === "vertical"
            ? Number(bounds.height)
            : Number(bounds.width);

    const sizes =
        calculateSplitSizes(
            totalSize,
            effectiveLayout.spec,
            gap,
            kind === "front"
        );

    if (sizes.length !== nodes.length) {
        return nodes;
    }

    let position = 0;

    return nodes.map((node, index) => {
        const size = Number(sizes[index]);

        const nextNode = {
            ...node,
            x:
                direction === "vertical"
                    ? bounds.x
                    : bounds.x + position,
            y:
                direction === "vertical"
                    ? bounds.y + position
                    : bounds.y,
            width:
                direction === "vertical"
                    ? bounds.width
                    : size,
            height:
                direction === "vertical"
                    ? size
                    : bounds.height
        };

        const children = childrenOf(node);

        if (children.length > 0) {
            nextNode.children = reflowNodes({
                nodes: children,
                bounds: {
                    x: nextNode.x,
                    y: nextNode.y,
                    width: nextNode.width,
                    height: nextNode.height
                },
                layout: {
                    spec: node.splitSpec,
                    direction: node.splitDirection,
                    gap:
                        kind === "front"
                            ? defaultGap
                            : node.splitGap
                },
                kind,
                defaultGap
            });
        }

        position += size + gap;

        return nextNode;
    });
};


const reflowFronts = (
    fronts,
    cabinet,
    layout
) => {
    const gapLeft =
        Number(cabinet.frontGapLeft ?? 0) || 0;
    const gapRight =
        Number(cabinet.frontGapRight ?? 0) || 0;
    const gapTop =
        Number(cabinet.frontGapTop ?? 0) || 0;
    const gapBottom =
        Number(cabinet.frontGapBottom ?? 0) || 0;

    return reflowNodes({
        nodes: fronts,
        bounds: {
            x: gapLeft,
            y: gapTop,
            width:
                Number(cabinet.width) -
                gapLeft -
                gapRight,
            height:
                Number(cabinet.height) -
                gapTop -
                gapBottom
        },
        layout: {
            ...layout,
            gap: cabinet.frontGap ?? 3
        },
        kind: "front",
        defaultGap: cabinet.frontGap ?? 3
    });
};


const reflowSections = (
    sections,
    cabinet,
    layout
) => {
    const area = getAvailableCabinetArea(cabinet);

    if (area.width <= 0 || area.height <= 0) {
        return sections;
    }

    return reflowNodes({
        nodes: sections,
        bounds: {
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height
        },
        layout,
        kind: "section"
    });
};


const sectionsComeFromFronts = layout =>
    layout?.source === "fronts";


const mergeGeneratedSections = (
    generatedSections,
    previousSections
) => {
    const previousByFrontId = new Map();

    const collect = sections => {
        sections.forEach(section => {
            if (section?.frontId != null) {
                previousByFrontId.set(
                    section.frontId,
                    section
                );
            }

            collect(childrenOf(section));
        });
    };

    collect(previousSections);

    const mergeLevel = (
        sections,
        parentId = null
    ) =>
        sections.map(section => {
            const previous =
                previousByFrontId.get(section.frontId);

            const id = previous?.id ?? section.id;

            const generatedChildren =
                childrenOf(section);

            const previousChildren =
                childrenOf(previous);

            const children =
                generatedChildren.length > 0
                    ? mergeLevel(
                        generatedChildren,
                        id
                    )
                    : reflowNodes({
                        nodes: previousChildren,
                        bounds: {
                            x: section.x,
                            y: section.y,
                            width: section.width,
                            height: section.height
                        },
                        layout: {
                            spec: previous?.splitSpec,
                            direction: previous?.splitDirection,
                            gap: previous?.splitGap
                        },
                        kind: "section"
                    });

            return {
                ...previous,
                ...section,
                id,
                parentId,
                functionConfig: previous.functionConfig,
                children
            };
        });

    return mergeLevel(generatedSections);
};


export const resizeCabinetContents = (
    cabinet,
    changes
) => {
    const resizedCabinet = {
        ...cabinet,
        ...changes
    };

    const previousFronts =
        Array.isArray(cabinet?.fronts)
            ? cabinet.fronts
            : [];

    let frontsWereReflowed = false;

    if (previousFronts.length > 0) {
        resizedCabinet.fronts = reflowFronts(
            previousFronts,
            resizedCabinet,
            cabinet.frontLayout
        );

        frontsWereReflowed =
            resizedCabinet.fronts !== previousFronts;
    }

    const previousSections =
        Array.isArray(cabinet?.sections)
            ? cabinet.sections
            : [];

    if (previousSections.length === 0) {
        return resizedCabinet;
    }

    if (
        sectionsComeFromFronts(
            cabinet.sectionLayout
        ) &&
        resizedCabinet.fronts?.length > 0
    ) {
        if (!frontsWereReflowed) {
            resizedCabinet.sections = previousSections;
            return resizedCabinet;
        }

        const generatedSections =
            frontsToSections(
                resizedCabinet.fronts,
                resizedCabinet
            );

        resizedCabinet.sections =
            generatedSections.length > 0
                ? mergeGeneratedSections(
                    generatedSections,
                    previousSections
                )
                : previousSections;

        return resizedCabinet;
    }

    resizedCabinet.sections = reflowSections(
        previousSections,
        resizedCabinet,
        cabinet.sectionLayout
    );

    return resizedCabinet;
};
