import { Text } from "@react-three/drei";
import { useRef, useState } from "react";

export function SheetObject({sheet, settings})
{

return(

<mesh position={[ sheet.id * 3000 + sheet.placedWidth/2 - settings.margin, sheet.placedHeight/2 - settings.margin, -2 ]}>

    <boxGeometry args={[ sheet.placedWidth, sheet.placedHeight, 1 ]} />

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
    children
})
{

const offset = plate.sheet *3000;
const [hovered, hover] = useState(false)
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
const dragStart = useRef(null);
const dragging = useRef(false);
const clicked = activeStrip === plate;

// console.log(plate);
return(
<group
    position={[dragOffset.x, dragOffset.y, 0]}
    onPointerOver={(event)=> (event.stopPropagation(), hover(true))}
    onPointerOut={() => hover(false)}
    onPointerDown={(e) => {
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

        setDragOffset({
            x: point.x - dragStart.current.x,
            y: point.y - dragStart.current.y
        });
    }}
    onPointerUp={(e) => {
        if (!dragging.current || !dragStart.current) return;
        e.stopPropagation();
        const point = getLocalPointerPosition(e);
        dragging.current = false;
        dragStart.current = null;
        e.target.releasePointerCapture?.(e.pointerId);

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
    <mesh position={[ plate.x + plate.placedWidth/2 + offset, plate.y + plate.placedHeight/2, 0 ]}>

        <boxGeometry args={[ plate.placedWidth, plate.placedHeight, 2 ]} />

        <meshBasicMaterial color={ hovered || clicked ? "rgb(225, 255, 0)" :"#2ecc71" } />

    </mesh>

    <Text scale={[1 , -1, 1]} position={[ plate.x + plate.placedWidth / 2 + offset, plate.y + plate.placedHeight / 2, 3
        ]} fontSize={70} anchorX="center" anchorY="middle" color="#111111">
        {`[${plate.id}]`}

    </Text>

    <Text scale={[1 , -1, 1]} position={[ plate.x + plate.placedWidth / 2 + offset, plate.y + plate.placedHeight / 2 -
        100, 3 ]} fontSize={60} anchorX="center" anchorY="middle" color="#111111"> {`${Math.round( plate.placedWidth )} × ${Math.round(plate.placedHeight )}`} </Text>
    {children}
</group>
);

}

export function ItemObject({plate, strip})
{

const offset = strip.sheet *3000;

const Width = strip.type=="horizontal" ? plate.originalHeight : plate.originalWidth;
const Height = strip.type=="horizontal" ? plate.originalWidth : plate.originalHeight;

const posX = strip.type=="horizontal" ? (strip.x + plate.x + Width/2 + 10) : (strip.x + 10 + Width/2);
const posY = strip.type=="horizontal" ? (strip.y + 10 + Height/2) : (plate.x + Height/2 + 10 + strip.y);

// console.log(plate);
return(

<mesh position={[ posX + offset, posY, 2 ]}>

    <boxGeometry args={[ Width, Height, 2 ]} />

    <meshBasicMaterial color={plate.color} />

</mesh>

);

}

export function FreeRectObject({rect, Slotindex})
{

const offset = Slotindex * 3000;

return(

<mesh position={[ rect.x+rect.width/2 + offset, rect.y+rect.height/2, -1 ]}>

    <boxGeometry args={[ rect.width, rect.height, 1 ]} />

    <meshBasicMaterial color="#e74c3c" transparent opacity={0.65} depthWrite={false} />

</mesh>

);

}