import { MeshBasicMaterial } from "three";
import { Text } from "@react-three/drei";
import React, { Children, useEffect, useRef, useState, useMemo } from "react";

export function SheetObject({sheet, settings})
{

return(

<mesh position={[ sheet.id * 3000 + sheet.placedWidth/2 - settings.margin, sheet.placedHeight/2 - settings.margin, -2 ]}>

    <boxGeometry args={[ sheet.placedWidth, sheet.placedHeight, 1 ]} />

    <meshBasicMaterial color="#333" />

</mesh>

);

}

export function PlateObject({plate, setActiveStrip, activeStrip})
{

const offset = plate.sheet *3000;
const [hovered, hover] = useState(false)

let clicked = false;
if(activeStrip == plate) {
clicked = true;
} else {
clicked = false;
}

// console.log(plate);
return(
<group onPointerOver={(event)=> (event.stopPropagation(), hover(true))} onPointerOut={(event) => hover(false)}
    onPointerDown={(e) => {
    e.stopPropagation();
    setActiveStrip(plate);

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
        100, 3 ]} fontSize={60} anchorX="center" anchorY="middle" color="#111111"> {`${Math.round( plate.placedWidth )} × ${Math.round(plate.placedHeight )}`} </Text> </group>
);

}

export function ItemObject({plate, strip})
{

const offset = strip.sheet *3000;

const Width = strip.type=="horizontal" ? plate.originalHeight : plate.originalWidth;
const Height = strip.type=="horizontal" ? plate.originalWidth : plate.originalHeight;

const posX = strip.type=="horizontal" ? (plate.x + Width/2 + 10) : (strip.x + 10 + Width/2);
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