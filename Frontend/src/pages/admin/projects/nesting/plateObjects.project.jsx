import { MeshBasicMaterial } from "three";

export function SheetObject({sheet, PlateIndex})
{

    return(

        <mesh

            position={[
                sheet.id * 3000 + sheet.width/2,
                sheet.height/2 + (sheet.height +150) * PlateIndex,
                -2
            ]}

        >

            <boxGeometry args={[

                sheet.width,
                sheet.height,
                1

            ]}/>

            <meshBasicMaterial color="#333"/>

        </mesh>

    );

}



export function PlateObject({plate, PlateIndex})
{

    const offset = plate.sheet *3000;

    // console.log(plate);
    return(

        <mesh

            position={[

                plate.x + plate.placedWidth/2 + offset,

                plate.y + plate.placedHeight/2 + (PlateIndex * (2070 + 150)),

                0

            ]}

        >

            <boxGeometry

                args={[

                    plate.placedWidth,

                    plate.placedHeight,

                    2

                ]}

            />

            <meshBasicMaterial color="#2ecc71"/>

        </mesh>

    );

}


export function ItemObject({plate, strip, PlateIndex })
{

    const offset = strip.sheet *3000;

    const Width = strip.type=="horizontal" ? plate.originalHeight : plate.originalWidth;
    const Height = strip.type=="horizontal" ? plate.originalWidth : plate.originalHeight;

    const posX = strip.type=="horizontal" ? (plate.x + Width/2 + 10) : (strip.x + 10 + Width/2);
    const posY = strip.type=="horizontal" ? (strip.y + 10 + Height/2) : (plate.x + Height/2 + 10 + strip.y);

    // console.log(plate);
    return(

        <mesh

            position={[

                posX + offset,

                posY + (PlateIndex * (2070 + 150)),

                2

            ]}

        >

            <boxGeometry

                args={[

                    Width,

                    Height,

                    2

                ]}

            />

            <meshBasicMaterial

                color="#3f3ce7"

                transparent

                opacity={0.25}

            />

        </mesh>

    );

}


export function FreeRectObject({rect, PlateIndex, Slotindex})
{

    const offset = Slotindex * 3000;

    return(

        <mesh

            position={[

                rect.x+rect.width/2 + offset,

                rect.y+rect.height/2  + (PlateIndex * (2070 + 150)),

                -1

            ]}

        >

            <boxGeometry args={[

                rect.width,

                rect.height,

                1

            ]}/>

            <meshBasicMaterial

                color="#e74c3c"

                transparent

                opacity={0.25}

            />

        </mesh>

    );

}