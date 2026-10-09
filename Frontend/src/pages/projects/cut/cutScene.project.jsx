import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "../nesting/plateObjects.project";
import React, { act } from 'react'
import { useState } from 'react'
import { hasEdge } from "../nesting/algorythm/helper/helpers";
import { Text } from "@react-three/drei";
import { getStripLayout } from "../nesting/algorythm/placement/manualStripPlacement.js";

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


function StripItemObject({ plate, settings, itemLayout, isPacked2D = false, stripRotation = 0 }) {

    const partRotation = isPacked2D
        ? (Number(plate.nestingRotation ?? 0) + Number(stripRotation)) % 180
        : 0;
    const Width = isPacked2D ? itemLayout.width : plate.originalWidth;
    const Height = isPacked2D ? itemLayout.height : plate.originalHeight;

    const edgeThickness = 20;

    const posX = isPacked2D
        ? itemLayout.x + Width / 2
        : Width / 2 + settings.gap / 2;
    const posY = isPacked2D
        ? itemLayout.y + Height / 2
        : plate.x + Height / 2 + settings.gap / 2;

    // Kantenbezeichnungen folgen der tatsächlichen Drehung des Bauteils.
    const edgeB = hasEdge(partRotation === 90 ? plate.EdgeL : plate.EdgeB);
    const edgeT = hasEdge(partRotation === 90 ? plate.EdgeR : plate.EdgeT);
    const edgeL = hasEdge(partRotation === 90 ? plate.EdgeT : plate.EdgeL);
    const edgeR = hasEdge(partRotation === 90 ? plate.EdgeB : plate.EdgeR);

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

// 2D-Strips enthalten bereits Position und Drehung jedes einzelnen Bauteils.
if (activeStrip?.packingMode === "2d") {
    const layout = getStripLayout(activeStrip, settings);
    const displayedStrip = {
        ...activeStrip,
        width: layout.placedWidth,
        height: layout.placedHeight
    };

    return (
        <>
            <StripObject plate={displayedStrip} />
            {layout.items.map((itemLayout, index) => (
                <StripItemObject
                    key={itemLayout.plate.id ?? index}
                    plate={itemLayout.plate}
                    itemLayout={itemLayout}
                    settings={settings}
                    isPacked2D
                    stripRotation={layout.rotation}
                />
            ))}
        </>
    );
}

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
