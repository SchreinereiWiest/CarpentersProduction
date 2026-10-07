import { Text } from "@react-three/drei";
import { useRef, useState } from "react";

export function SheetObject({ sheet, settings }) {
    const sheetOffset = settings.sheetOffset ?? 3000;

    return (
        <mesh position={[sheet.id * sheetOffset + sheet.placedWidth / 2 - settings.margin, sheet.placedHeight / 2 - settings.margin, -2]}>
            <boxGeometry args={[sheet.placedWidth, sheet.placedHeight, 1]} />
            <meshBasicMaterial color="#333" />
        </mesh>
    );
}

export function PlateObject({
    plate,
    setActiveStrip,
    activeStrip,
    getLocalPointerPosition,
    isOutsideNestingPlates,
    onRemoveStrip,
    onPlacePoolStrip,
    getPoolDragPosition,
    isPool = false,
    settings,
    children
})
{

const sheetOffset = isPool ? 0 : plate.sheet * (settings.sheetOffset ?? 3000);
const [hovered, hover] = useState(false)
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const dragStart = useRef(null);
const dragging = useRef(false);
const clicked = activeStrip?.id === plate.id;

// console.log(plate);
return(
<group
    position={[dragOffset.x, dragOffset.y, 0]}
    onPointerOver={(event)=> (event.stopPropagation(), hover(true))}
    onPointerOut={() => hover(false)}
    onPointerDown={(e) => {
    // Nur der erste Touch darf einen Strip-Drag beginnen.
    if (e.nativeEvent.pointerType === "touch" && !e.nativeEvent.isPrimary) {
        e.stopPropagation();
        return;
    }
    e.stopPropagation();
    const point = getLocalPointerPosition(e);
    if (!point) return;

    dragging.current = true;
    dragStart.current = { x: point.x, y: point.y };
    setActiveStrip(plate);
    e.target.setPointerCapture?.(e.pointerId);
    }}
    onPointerMove={(e) => {
        if (!dragging.current || !dragStart.current) return;
        e.stopPropagation();
        const point = getLocalPointerPosition(e);
        if (!point) return;

        const delta = {
            x: point.x - dragStart.current.x,
            y: point.y - dragStart.current.y
        };
        // Pool-Strips zeigen während des Ziehens bereits die berechnete Snap-Position.
        if (isPool) {
            const desiredPosition = {
                x: plate.x + delta.x,
                y: plate.y + delta.y
            };
            const displayedPosition = getPoolDragPosition?.(plate, desiredPosition, point) ?? desiredPosition;
            setDragOffset({
                x: displayedPosition.x - plate.x,
                y: displayedPosition.y - plate.y
            });
            return;
        }

        setDragOffset({
            x: delta.x,
            y: delta.y
        });
    }}
    onPointerUp={(e) => {
        if (!dragging.current || !dragStart.current) return;
        e.stopPropagation();
        const point = getLocalPointerPosition(e);
        const delta = point
            ? { x: point.x - dragStart.current.x, y: point.y - dragStart.current.y }
            : { x: 0, y: 0 };
        dragging.current = false;
        dragStart.current = null;
        e.target.releasePointerCapture?.(e.pointerId);

        if (isPool && point) {
            // Pool-Drops gehen an die Scene zur Zielsuche und Kollisionsprüfung.
            onPlacePoolStrip?.(plate, {
                x: plate.x + delta.x,
                y: plate.y + delta.y
            }, point);
            setDragOffset({ x: 0, y: 0 });
            return;
        }

        if (point && isOutsideNestingPlates(point)) {
            onRemoveStrip(plate);
            return;
        }

        setDragOffset({ x: 0, y: 0 });
    }}
    onPointerCancel={(e) => {
        dragging.current = false;
        dragStart.current = null;
        setDragOffset({ x: 0, y: 0 });
        e.target.releasePointerCapture?.(e.pointerId);
    }}>
    <mesh position={[ plate.x + plate.placedWidth/2 + sheetOffset, plate.y + plate.placedHeight/2, 0 ]}>

        <boxGeometry args={[ plate.placedWidth, plate.placedHeight, 2 ]} />

    <meshBasicMaterial color={ hovered || clicked ? "rgb(225, 255, 0)" : isPool ? "#3498db" : "#2ecc71" } />

    </mesh>

    <Text scale={[1 , -1, 1]} position={[ plate.x + plate.placedWidth / 2 + sheetOffset, plate.y + plate.placedHeight / 2, 3
        ]} fontSize={70} anchorX="center" anchorY="middle" color="#111111">
        {`[${plate.id}]`}

    </Text>

    <Text scale={[1 , -1, 1]} position={[ plate.x + plate.placedWidth / 2 + sheetOffset, plate.y + plate.placedHeight / 2 -
        100, 3 ]} fontSize={60} anchorX="center" anchorY="middle" color="#111111"> {`${Math.round( plate.placedWidth )} × ${Math.round(plate.placedHeight )}`} </Text>
    {children}
</group>
);

}

export function ItemObject({ plate, strip, itemLayout, isPool = false, settings }) {
    const sheetOffset = isPool ? 0 : strip.sheet * (settings.sheetOffset ?? 3000);

    return (
        <mesh position={[
            strip.x + itemLayout.x + itemLayout.width / 2 + sheetOffset,
            strip.y + itemLayout.y + itemLayout.height / 2,
            2
        ]}>
            <boxGeometry args={[itemLayout.width, itemLayout.height, 2]} />
            <meshBasicMaterial color={plate.color} />
        </mesh>
    );
}

export function FreeRectObject({ rect, Slotindex, settings })
{

const offset = Slotindex * (settings.sheetOffset ?? 3000);

return(

<mesh position={[ rect.x+rect.width/2 + offset, rect.y+rect.height/2, -1 ]}>

    <boxGeometry args={[ rect.width, rect.height, 1 ]} />

    <meshBasicMaterial color="#e74c3c" transparent opacity={0.65} depthWrite={false} />

</mesh>

);

}
