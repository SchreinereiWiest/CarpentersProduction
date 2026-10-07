import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "./plateObjects.project";
import { useRef } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";
import {
    findNearestFreeSpace,
    getStripLayout
} from "./algorythm/placement/manualStripPlacement.js";
import { createEmptyNestingPlate } from "./algorythm/placement/nestingPlate.js";

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export default function NestingScene({
    result,
    setActiveStrip,
    activeStrip,
    settings,
    onRemoveStrip,
    onPlaceStrip,
    onInvalidPlacement
}) {
    const sceneRef = useRef(null);

    if (!result) return null;

    const sheetOffset = settings.sheetOffset ?? 3000;
    const emptyStrips = result.emptyStrips ?? [];
    const getLocalPointerPosition = (event) => {
        if (!sceneRef.current) return null;

        const worldPosition = event.ray.intersectPlane(
            dragPlane,
            new THREE.Vector3()
        );

        return worldPosition
            ? sceneRef.current.worldToLocal(worldPosition)
            : null;
    };

    const isOutsideNestingPlates = (point) =>
        !result.nestingPlates.some((sheet) => {
            const left = sheet.id * sheetOffset - settings.margin;
            const top = -settings.margin;

            return (
                point.x >= left &&
                point.x <= left + sheet.placedWidth &&
                point.y >= top &&
                point.y <= top + sheet.placedHeight
            );
        });

    // Ein Drop rechts neben der letzten Platte zielt auf eine neue Standardplatte.
    const getNestingPlateTargetAtPointer = (point) => {
        const existingPlate = result.nestingPlates.find((nestingPlate) => {
            const left = nestingPlate.id * sheetOffset - settings.margin;
            const top = -settings.margin;
            return (
                point.x >= left &&
                point.x <= left + nestingPlate.placedWidth &&
                point.y >= top &&
                point.y <= top + nestingPlate.placedHeight
            );
        });
        if (existingPlate) return { nestingPlate: existingPlate, isNew: false };

        const lastPlate = [...result.nestingPlates].sort((a, b) => b.id - a.id)[0];
        if (!lastPlate) return null;

        const lastRightEdge = lastPlate.id * sheetOffset - settings.margin + lastPlate.placedWidth;
        const lastTop = -settings.margin;
        if (
            point.x <= lastRightEdge ||
            point.y < lastTop ||
            point.y > lastTop + lastPlate.placedHeight
        ) {
            return null;
        }

        const newId = Math.max(...result.nestingPlates.map((plate) => plate.id)) + 1;
        return {
            nestingPlate: createEmptyNestingPlate(settings.defaultSheet, settings, newId),
            isNew: true
        };
    };

    // Vorschau und Drop verwenden dieselbe freie Fläche; beim Drop wird Snapping erzwungen.
    const getPoolSnapPlacement = (strip, desiredPosition, pointerPosition, force = false) => {
        const target = getNestingPlateTargetAtPointer(pointerPosition);
        const nestingPlate = target?.nestingPlate;
        if (!nestingPlate) return null;

        const offset = nestingPlate.id * sheetOffset;
        const nearest = findNearestFreeSpace(
            nestingPlate,
            strip,
            { x: desiredPosition.x - offset, y: desiredPosition.y },
            settings.cutGap
        );
        if (!nearest) return null;

        const snapDistance = settings.snapDistance ?? 120;
        if (!force && nearest.distanceSquared > snapDistance * snapDistance) {
            return { position: desiredPosition, ...target };
        }

        return {
            position: { x: nearest.x + offset, y: nearest.y },
            ...target
        };
    };

    const getPoolDragPosition = (strip, desiredPosition, pointerPosition) =>
        getPoolSnapPlacement(strip, desiredPosition, pointerPosition)?.position ?? desiredPosition;

    const handlePoolDrop = (strip, desiredPosition, pointerPosition) => {
        // Übergibt nur gültige, an eine freie Fläche geschnappte Drops an den State.
        const target = getPoolSnapPlacement(strip, desiredPosition, pointerPosition, true);
        if (!target) {
            onInvalidPlacement?.();
            return false;
        }

        const { nestingPlate, isNew, position: snappedPosition } = target;
        const offset = nestingPlate.id * sheetOffset;
        return onPlaceStrip?.(strip.id, {
            sheet: nestingPlate.id,
            x: snappedPosition.x - offset,
            y: snappedPosition.y,
            createNewPlate: isNew
        }) ?? false;
    };

    // Pool-Strips werden oberhalb der Platten in Reihen dargestellt.
    const maxPlateWidth = Math.max(
        settings.defaultSheet?.width ?? 2800,
        ...result.nestingPlates.map((plate) => plate.placedWidth ?? plate.width ?? 0)
    );
    const poolLayouts = emptyStrips.map((strip) => ({
        strip,
        layout: getStripLayout(strip, settings)
    }));
    const maxPoolStripHeight = Math.max(
        0,
        ...poolLayouts.map(({ layout }) => layout.placedHeight)
    );
    const poolRowWidth = Math.max(maxPlateWidth * 2, sheetOffset * 2);
    const poolBaseY = -maxPoolStripHeight - 300;
    let poolX = 0;
    let poolRowY = poolBaseY;
    let poolRowHeight = 0;
    const poolStrips = poolLayouts.map(({ strip, layout }) => {
        if (poolX > 0 && poolX + layout.placedWidth > poolRowWidth) {
            poolX = 0;
            poolRowY -= poolRowHeight + 160;
            poolRowHeight = 0;
        }

        const displayStrip = {
            ...strip,
            x: poolX,
            y: poolRowY,
            sheet: 0,
            placedWidth: layout.placedWidth,
            placedHeight: layout.placedHeight
        };
        poolX += layout.placedWidth + 160;
        poolRowHeight = Math.max(poolRowHeight, layout.placedHeight);

        return { strip: displayStrip, layout };
    });

    return (
        <group ref={sceneRef}>
            {result.nestingPlates.map((sheet) => (
                <SheetObject key={sheet.id} sheet={sheet} settings={settings} />
            ))}

            {result.strips.map((strip) => {
                const layout = getStripLayout(strip, settings);
                return (
                    <PlateObject
                        key={`${strip.sheet}-${strip.id}`}
                        plate={strip}
                        setActiveStrip={setActiveStrip}
                        activeStrip={activeStrip}
                        getLocalPointerPosition={getLocalPointerPosition}
                        isOutsideNestingPlates={isOutsideNestingPlates}
                        onRemoveStrip={onRemoveStrip}
                        getPoolDragPosition={getPoolDragPosition}
                        settings={settings}
                    >
                        {layout.items.map((itemLayout, index) => (
                            <ItemObject
                                key={itemLayout.plate.id ?? index}
                                plate={itemLayout.plate}
                                strip={strip}
                                itemLayout={itemLayout}
                                settings={settings}
                            />
                        ))}
                    </PlateObject>
                );
            })}

            {result.nestingPlates.map((sheet) =>
                (sheet.freeSpaces ?? []).map((space, index) => (
                    <FreeRectObject
                        key={`${sheet.id}-${index}`}
                        rect={space}
                        Slotindex={sheet.id}
                        settings={settings}
                    />
                ))
            )}

            <Text
                scale={[1, -1, 1]}
                position={[0, poolBaseY - 140, 3]}
                fontSize={90}
                anchorX="left"
                anchorY="middle"
                color="#d1d5db"
            >
                Leerer Strip Pool
            </Text>

            {poolStrips.map(({ strip, layout }) => (
                <PlateObject
                    key={`pool-${strip.id}`}
                    plate={strip}
                    setActiveStrip={setActiveStrip}
                    activeStrip={activeStrip}
                    getLocalPointerPosition={getLocalPointerPosition}
                    isOutsideNestingPlates={isOutsideNestingPlates}
                    onPlacePoolStrip={handlePoolDrop}
                    getPoolDragPosition={getPoolDragPosition}
                    isPool
                    settings={settings}
                >
                    {layout.items.map((itemLayout, index) => (
                        <ItemObject
                            key={itemLayout.plate.id ?? index}
                            plate={itemLayout.plate}
                            strip={strip}
                            itemLayout={itemLayout}
                            isPool
                            settings={settings}
                        />
                    ))}
                </PlateObject>
            ))}
        </group>
    );
}
