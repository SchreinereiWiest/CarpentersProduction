import { useEffect, useState } from "react";
import { Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { hasEdge } from "../nesting/algorythm/helper/helpers";

function FitCutCamera({ width, height }) {
    const { camera, size } = useThree();

    useEffect(() => {
        if (!camera.isOrthographicCamera) return;

        const contentWidth = Math.max(width * 0.01, 1);
        const contentHeight = Math.max(height * 0.01, 1);
        const fitZoom = Math.min(
            size.width / contentWidth,
            size.height / contentHeight
        ) * 0.8;

        camera.zoom = Math.min(25, Math.max(0.1, fitZoom));
        camera.updateProjectionMatrix();
    }, [camera, height, size.height, size.width, width]);

    return null;
}

function StripObject({ width, height }) {
    return (
        <mesh position={[width / 2, height / 2, 0]}>
            <boxGeometry args={[width, height, 2]} />
            <meshBasicMaterial color="#2ecc71" />
        </mesh>
    );
}

function StripItemObject({
    strip,
    plate,
    itemLayout,
    layoutType,
    stripRotation = 0,
    itemIndex,
    onSelectPart,
    selectedPartKey,
    finishedPartKeys
}) {
    const [hovered, setHovered] = useState(false);
    const width = itemLayout.width;
    const height = itemLayout.height;
    const posX = itemLayout.x + width / 2;
    const posY = itemLayout.y + height / 2;
    const originalWidth = Number(plate.originalWidth ?? plate.width) || 0;
    const inferredPartRotation = width !== originalWidth ? 90 : 0;
    const baseRotation = Number(plate.nestingRotation ?? (
        strip.packingMode === "2d" ? inferredPartRotation : layoutType === "horizontal" ? 90 : inferredPartRotation
    ));
    const partRotation = (baseRotation + stripRotation) % 180;
    const partKey = `${strip.id}-${plate.id ?? itemIndex}-${itemIndex}`;
    const isSelected = selectedPartKey === partKey;
    const isFinished = finishedPartKeys.has(partKey);

    const edgeB = hasEdge(partRotation === 90 ? plate.EdgeL : plate.EdgeB);
    const edgeT = hasEdge(partRotation === 90 ? plate.EdgeR : plate.EdgeT);
    const edgeL = hasEdge(partRotation === 90 ? plate.EdgeT : plate.EdgeL);
    const edgeR = hasEdge(partRotation === 90 ? plate.EdgeB : plate.EdgeR);
    const edgeColor = isFinished ? "#6b7280" : "rgba(239, 7, 247, 0.98)";

    const selectPart = (event) => {
        event.stopPropagation();
        onSelectPart?.({
            key: partKey,
            stripId: strip.id,
            plate,
            width,
            height
        });
    };

    return (
        <group
            onClick={selectPart}
            onPointerDown={(event) => {
                if (event.nativeEvent.pointerType === "touch") event.stopPropagation();
            }}
            onPointerOver={(event) => {
                event.stopPropagation();
                setHovered(true);
            }}
            onPointerOut={() => setHovered(false)}
        >
            <Text
                scale={[1, -1, 1]}
                position={[posX, posY, 3]}
                fontSize={70}
                anchorX="center"
                anchorY="middle"
                color={isFinished ? "#d1d5db" : "#111111"}
            >
                {`${height} x ${width}`}
            </Text>

            <mesh position={[posX, posY, 2]}>
                <boxGeometry args={[width, height, 2]} />
                <meshBasicMaterial color={isFinished
                    ? "#6b7280"
                    : isSelected || hovered
                        ? "rgb(225, 255, 0)"
                        : plate.color}
                />
            </mesh>

            {edgeB && (
                <mesh position={[posX, posY - height / 2 + 10, 3]}>
                    <boxGeometry args={[width, 20, 2]} />
                    <meshBasicMaterial color={edgeColor} />
                </mesh>
            )}
            {edgeT && (
                <mesh position={[posX, posY + height / 2 - 10, 3]}>
                    <boxGeometry args={[width, 20, 2]} />
                    <meshBasicMaterial color={edgeColor} />
                </mesh>
            )}
            {edgeL && (
                <mesh position={[posX - width / 2 + 10, posY, 3]}>
                    <boxGeometry args={[20, height, 2]} />
                    <meshBasicMaterial color={edgeColor} />
                </mesh>
            )}
            {edgeR && (
                <mesh position={[posX + width / 2 - 10, posY, 3]}>
                    <boxGeometry args={[20, height, 2]} />
                    <meshBasicMaterial color={edgeColor} />
                </mesh>
            )}
        </group>
    );
}

export default function CutScene({ stack, onSelectPart, selectedPartKey, finishedPartKeys }) {
    const strips = stack?.strips ?? [];
    if (strips.length === 0) return null;

    const stripSpacing = 240;
    const totalWidth = strips.reduce(
        (width, entry) => width + entry.layout.placedWidth,
        stripSpacing * Math.max(0, strips.length - 1)
    );
    const maxHeight = Math.max(...strips.map((entry) => entry.layout.placedHeight));
    let nextX = 0;

    return (
        <>
            <FitCutCamera width={totalWidth} height={maxHeight} />
            <group
                scale={[0.01, -0.01, 0.01]}
                position={[-totalWidth * 0.005, maxHeight * 0.005, 0]}
            >
                {strips.map(({ strip, layout, originalIndex }) => {
                    const x = nextX;
                    nextX += layout.placedWidth + stripSpacing;

                    return (
                        <group
                            key={`${strip.id ?? originalIndex}-${originalIndex}`}
                            position={[x, 0, 0]}
                        >
                            <StripObject
                                width={layout.placedWidth}
                                height={layout.placedHeight}
                            />
                            {layout.items.map((itemLayout, itemIndex) => (
                                <StripItemObject
                                    key={`${itemLayout.plate.id ?? itemIndex}-${itemIndex}`}
                                    strip={strip}
                                    plate={itemLayout.plate}
                                    itemLayout={itemLayout}
                                    layoutType={layout.layoutType}
                                    stripRotation={layout.rotation}
                                    itemIndex={itemIndex}
                                    onSelectPart={onSelectPart}
                                    selectedPartKey={selectedPartKey}
                                    finishedPartKeys={finishedPartKeys}
                                />
                            ))}
                        </group>
                    );
                })}
            </group>
        </>
    );
}
