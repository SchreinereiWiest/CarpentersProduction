import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";
import {
    getDrawerFrontGroups,
    getFrontBoxPositionFromBottom,
    getFrontLegraboxVariant
} from "@Engine/cabinet/sektions/front/frontAttachments.js";

const numberOr = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const getFrontMachiningHoles = ({ cabinet, front, cncConfig }) => {
    const custom = cncConfig?.cncDefault ?? cncConfig ?? {};
    const drawerConfig = {
        ...DEFAULT_CNC.fronts.drawer,
        ...(custom.fronts?.drawer ?? {})
    };
    const doorConfig = {
        ...DEFAULT_CNC.fronts.door,
        ...(custom.fronts?.door ?? {}),
        cup: {
            ...DEFAULT_CNC.fronts.door.cup,
            ...(custom.fronts?.door?.cup ?? {})
        },
        auxiliaryHoles: Array.isArray(custom.fronts?.door?.auxiliaryHoles)
            ? custom.fronts.door.auxiliaryHoles
            : DEFAULT_CNC.fronts.door.auxiliaryHoles
    };
    const type = front.attachment?.type;

    if (type === "drawer" || type === "insetDrawer") {
        const boxPosition = getFrontBoxPositionFromBottom({
            cabinet,
            front,
            fallback: drawerConfig.fallbackBoxPositionFromBottom
        });
        const variant = getFrontLegraboxVariant(cabinet, front);
        const groups = getDrawerFrontGroups(drawerConfig, variant);

        return groups.flatMap((group, groupIndex) => (group.holes ?? []).flatMap((hole, holeIndex) => {
            const y = numberOr(front.height) -
                boxPosition -
                numberOr(group.verticalOffset) -
                numberOr(hole.verticalOffset);
            const sideOffset = numberOr(hole.sideOffset, 33);
            return [
                {
                    key: `drawer-${groupIndex}-${holeIndex}-left`,
                    role: "drawerFront",
                    x: Math.max(0, sideOffset - numberOr(front.gapLeft)),
                    y,
                    diameter: numberOr(hole.diameter, 5)
                },
                {
                    key: `drawer-${groupIndex}-${holeIndex}-right`,
                    role: "drawerFront",
                    x: Math.min(numberOr(front.width), numberOr(front.width) - sideOffset + numberOr(front.gapRight)),
                    y,
                    diameter: numberOr(hole.diameter, 5)
                }
            ];
        }));
    }

    if (type !== "door" || doorConfig.cup.enabled === false) {
        return [];
    }

    const width = numberOr(front.width);
    const height = numberOr(front.height);
    const hingeSide = front.attachment?.hingeSide === "right" ? "right" : "left";
    const edgeOffset = numberOr(doorConfig.cup.edgeOffset, 22.5);
    const cupX = hingeSide === "right" ? width - edgeOffset : edgeOffset;
    const centers = [
        numberOr(doorConfig.cup.topOffset, 100),
        height - numberOr(doorConfig.cup.bottomOffset, 100)
    ].filter((center, index, values) => index === 0 || Math.abs(center - values[0]) > 0.001);

    return centers.flatMap((center, hingeIndex) => [
        {
            key: `cup-${hingeIndex}`,
            role: "hingeCup",
            x: cupX,
            y: center,
            diameter: numberOr(doorConfig.cup.diameter, 35)
        },
        ...doorConfig.auxiliaryHoles.map((hole, holeIndex) => ({
            key: `aux-${hingeIndex}-${holeIndex}`,
            role: "hingeAuxiliary",
            x: hingeSide === "right"
                ? cupX - numberOr(hole.horizontalOffset)
                : cupX + numberOr(hole.horizontalOffset),
            y: center + numberOr(hole.verticalOffset),
            diameter: numberOr(hole.diameter, 5)
        }))
    ]);
};

export function FrontLayer({
    cabinet,
    cncConfig,
    selectedElement,
    onSelect,
    opacity = 1,
    showBackground = true,
    showMachining = false,
    machiningOpacity = 0.5
}) {

    const fronts =
        cabinet.fronts ?? [];


    const renderFronts = (
        fronts,
        parentNumber = ""
    ) => {

        return fronts.map(
            (front, index) => {

                const number =
                    parentNumber
                        ? `${parentNumber}.${index + 1}`
                        : `${index + 1}`;


                const selected =
                    selectedElement?.id ===
                    front.id;


                const hasChildren =
                    front.children &&
                    front.children.length > 0;

                const isRemoved =
                    front.isRemoved === true;

                const machiningHoles = showMachining && !hasChildren && !isRemoved
                    ? getFrontMachiningHoles({ cabinet, front, cncConfig })
                    : [];


                return (

                    <g
                        key={front.id}
                    >

                        {/* ================================= */}
                        {/* FRONT */}
                        {/* ================================= */}

                        {!hasChildren && (

                            <g
                                onClick={(event) => {

                                    event.stopPropagation();

                                    onSelect?.({
                                        ...front,
                                        type: "front"
                                    });

                                }}

                                onDoubleClick={(event) => {

                                    event.stopPropagation();

                                    onSelect?.({
                                        ...front,
                                        type: "front",
                                        openSetup: true
                                    });

                                }}

                                style={{
                                    cursor: "pointer"
                                }}
                                opacity={isRemoved ? 0.35 : 1}
                            >

                                <rect
                                    x={front.x}
                                    y={front.y}
                                    width={front.width}
                                    height={front.height}

                                    fill={
                                        isRemoved
                                            ? "#52525b"
                                            : selected
                                            ? "#166534"
                                            : "#14532d"
                                    }

                                    stroke={
                                        isRemoved
                                            ? selected
                                                ? "#e4e4e7"
                                                : "#a1a1aa"
                                            : selected
                                            ? "#4ade80"
                                            : "#22c55e"
                                    }

                                    strokeWidth={
                                        selected
                                            ? 3
                                            : 1.5
                                    }

                                    vectorEffect="non-scaling-stroke"
                                    strokeDasharray={isRemoved ? "8 6" : undefined}
                                />

                                {machiningHoles.length > 0 && (
                                    <g
                                        opacity={machiningOpacity}
                                        pointerEvents="none"
                                        data-front-machining={front.id}
                                    >
                                        {machiningHoles.map(hole => (
                                            <circle
                                                key={hole.key}
                                                cx={numberOr(front.x) + hole.x}
                                                cy={numberOr(front.y) + hole.y}
                                                r={Math.max(4, hole.diameter / 2)}
                                                fill={hole.role === "drawerFront" ? "#60a5fa" : "#f59e0b"}
                                                stroke="#f8fafc"
                                                strokeWidth="1.5"
                                                vectorEffect="non-scaling-stroke"
                                                data-machining-role={hole.role}
                                            />
                                        ))}
                                    </g>
                                )}


                                <text
                                    x={
                                        front.x +
                                        front.width / 2
                                    }

                                    y={
                                        front.y +
                                        front.height / 2
                                    }

                                    textAnchor="middle"
                                    dominantBaseline="middle"

                                    fill={isRemoved ? "#f4f4f5" : "#bbf7d0"}

                                    fontSize="30"

                                    pointerEvents="none"
                                >
                                    {number}
                                </text>

                                <text
                                    x={
                                        front.x +
                                        front.width / 2
                                    }

                                    y={
                                        front.y +
                                        front.height / 2 +
                                        40
                                    }

                                    textAnchor="middle"
                                    dominantBaseline="middle"

                                    fill={isRemoved ? "#d4d4d8" : "#86efac"}

                                    fontSize="28"

                                    pointerEvents="none"
                                >
                                    {Math.round(
                                        front.width
                                    )} × {Math.round(
                                        front.height
                                    )} mm
                                </text>

                            </g>

                        )}


                        {/* ================================= */}
                        {/* UNTERFRONTEN */}
                        {/* ================================= */}

                        {hasChildren &&
                            renderFronts(
                                front.children,
                                number
                            )
                        }

                    </g>

                );

            }
        );
    };


    return (

        <g>

            {/*
             * Korpus-Hintergrund
             */}

            {showBackground && (
                <rect
                    x={0}
                    y={0}
                    width={cabinet.width}
                    height={cabinet.height}

                    fill="#171717"

                    stroke="#737373"

                    strokeWidth={2}

                    vectorEffect="non-scaling-stroke"
                />
            )}

            <g opacity={opacity}>
                {renderFronts(fronts)}
            </g>

        </g>
    );
}
