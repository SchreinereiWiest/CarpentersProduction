import { calculateSplitSizes } from "../sektions/calcSplitSizes.js";
import { frontsToSections } from "../sektions/functions/parseFrontSections.js";
import { getAvailableCabinetArea } from "../sektions/functions/getAvailableCabinetArea.js";


const childrenOf = node =>
    Array.isArray(node?.children)
        ? node.children
        : [];


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

    if (!layout?.spec || !layout?.direction) {
        return nodes;
    }

    const direction =
        layout.direction === "horizontal"
            ? "horizontal"
            : "vertical";

    const gap =
        kind === "front"
            ? Math.max(
                0,
                Number(
                    layout.gap ??
                    defaultGap ??
                    0
                ) || 0
            )
            : Math.max(
                0,
                Number(layout.gap ?? 0) || 0
            );

    const totalSize =
        direction === "vertical"
            ? Number(bounds.height)
            : Number(bounds.width);

    const sizes =
        calculateSplitSizes(
            totalSize,
            layout.spec,
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
        Math.max(0, Number(cabinet.frontGapLeft ?? 0) || 0);
    const gapRight =
        Math.max(0, Number(cabinet.frontGapRight ?? 0) || 0);
    const gapTop =
        Math.max(0, Number(cabinet.frontGapTop ?? 0) || 0);
    const gapBottom =
        Math.max(0, Number(cabinet.frontGapBottom ?? 0) || 0);

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
