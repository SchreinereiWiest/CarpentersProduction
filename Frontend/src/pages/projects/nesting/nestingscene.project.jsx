import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "./plateObjects.project";
import { useRef } from "react";
import * as THREE from "three";

const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export default function NestingScene({
    result,
    setActiveStrip,
    activeStrip,
    settings,
    onRemoveStrip
}) {
    const sceneRef = useRef(null);

    if (!result) return null;

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
            const left = sheet.id * 3000 - settings.margin;
            const top = -settings.margin;

            return (
                point.x >= left &&
                point.x <= left + sheet.placedWidth &&
                point.y >= top &&
                point.y <= top + sheet.placedHeight
            );
        });

    return (
        <group ref={sceneRef}>
            {result.nestingPlates.map((sheet) => (
                <SheetObject key={sheet.id} sheet={sheet} settings={settings} />
            ))}

            {result.strips.map((strip) => (
                <PlateObject
                    key={`${strip.sheet}-${strip.id}`}
                    plate={strip}
                    setActiveStrip={setActiveStrip}
                    activeStrip={activeStrip}
                    getLocalPointerPosition={getLocalPointerPosition}
                    isOutsideNestingPlates={isOutsideNestingPlates}
                    onRemoveStrip={onRemoveStrip}
                >
                    {strip.plates.map((item) => (
                        <ItemObject
                            key={item.id}
                            plate={item}
                            strip={strip}
                        />
                    ))}
                </PlateObject>
            ))}

            {result.nestingPlates.map((sheet) =>
                sheet.freeSpaces.map((space, index) => (
                    <FreeRectObject
                        key={`${sheet.id}-${index}`}
                        rect={space}
                        Slotindex={sheet.id}
                    />
                ))
            )}
        </group>
    );
}