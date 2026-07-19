import { MeshBasicMaterial } from "three";

export function SheetObject({sheet, PlateIndex})
{

    return(

        <mesh

            position={[
                sheet.offsetX + sheet.width/2,
                sheet.height/2 + (sheet.height +150)*PlateIndex,
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



export function PlateObject({plate, sheets, PlateIndex})
{

    const offset = sheets[plate.sheet].offsetX

    // console.log(plate);
    return(

        <mesh

            position={[

                plate.x + plate.width/2 + offset,

                plate.y + plate.height/2  + (sheets[plate.sheet].height +150)*PlateIndex,

                0

            ]}

        >

            <boxGeometry

                args={[

                    plate.width,

                    plate.height,

                    2

                ]}

            />

            <meshBasicMaterial color="#2ecc71"/>

        </mesh>

    );

}


export function FreeRectObject({rect, sheets, PlateIndex})
{

    const offset = sheets[rect.sheet].offsetX

    return(

        <mesh

            position={[

                rect.x+rect.width/2 + offset,

                rect.y+rect.height/2  + (sheets[rect.sheet].height +150)*PlateIndex,

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