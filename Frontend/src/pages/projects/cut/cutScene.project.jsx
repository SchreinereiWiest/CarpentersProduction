import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "../nesting/plateObjects.project";
import React, { act } from 'react'
import { useState } from 'react'
import { hasEdge } from "../nesting/algorythm/helper/helpers";
import { Text } from "@react-three/drei";

function StripObject ({plate}) {

    return(
    <group>
        <mesh position={[plate.width/2,plate.height/2, 0 ]}>
    
            <boxGeometry args={[ plate.width, plate.height, 2 ]} />
    
            <meshBasicMaterial color={ "#2ecc71" } />
    
        </mesh>
    
        </group>
    );

}


function StripItemObject({ plate, settings }) {

    const Width = plate.originalWidth;
    const Height = plate.originalHeight;

    const edgeThickness = 20;

    const posX =
        Width / 2 +
        settings.gap / 2;

    const posY =
        plate.x +
        Height / 2 +
        settings.gap / 2;


    const edgeB = hasEdge(plate.EdgeB);
    const edgeT = hasEdge(plate.EdgeT);
    const edgeL = hasEdge(plate.EdgeL);
    const edgeR = hasEdge(plate.EdgeR);

    const edgeMat = "rgba(239, 7, 247, 0.98)"


    return (<group>
    <Text scale={[1 , -1, 1]} position={[ posX, posY, 3 ]} fontSize={70} anchorX="center" anchorY="middle"
        color="#111111"> {Height} x {Width} </Text>

    {/* Hauptteil */}

    <mesh position={[ posX, posY, 2 ]}>

        <boxGeometry args={[ Width, Height, 2 ]} />

        <meshBasicMaterial color={plate.color} />

    </mesh>

    {/* Untere Kante */}

    {edgeB && (

    <mesh position={[ posX, posY - Height / 2 + edgeThickness / 2, 3 ]}>

        <boxGeometry args={[ Width, edgeThickness, 2 ]} />

        <meshBasicMaterial color={edgeMat} />

    </mesh>

    )}

    {/* Obere Kante */}

    {edgeT && (

    <mesh position={[ posX, posY + Height / 2 - edgeThickness / 2, 3 ]}>

        <boxGeometry args={[ Width, edgeThickness, 2 ]} />

        <meshBasicMaterial color={edgeMat} />

    </mesh>

    )}

    {/* Linke Kante */}

    {edgeL && (

    <mesh position={[ posX - Width / 2 + edgeThickness / 2, posY, 3 ]}>

        <boxGeometry args={[ edgeThickness, Height, 2 ]} />

        <meshBasicMaterial color={edgeMat} />

    </mesh>

    )}

    {/* Rechte Kante */}

    {edgeR && (

    <mesh position={[ posX + Width / 2 - edgeThickness / 2, posY, 3 ]}>

        <boxGeometry args={[ edgeThickness, Height, 2 ]} />

        <meshBasicMaterial color={edgeMat} />

    </mesh>

    )}

</group>

);

}

export default function CutScene({result, stripIndex})
{
if(!result) return;

const settings = result.settings;

const activeStrip = result.strips[stripIndex];

console.log(activeStrip);

return (

<>

    <StripObject key={stripIndex} plate={activeStrip}/>

    {activeStrip.plates.map((item, indexe) => (
        <StripItemObject key={indexe} plate={item} settings={settings}/>
        ))}

</>

);

}