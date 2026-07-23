import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "./plateObjects.project";
import React from 'react'

export default function NestingScene({result})
{

    if(!result) return;

    return (

        <>
           {result.map((sheetPlate, sheetPlateIndex) => (
            <React.Fragment key={sheetPlateIndex}>

                {sheetPlate.strips.nestingPlates.map(sheet => (
                <SheetObject
                    key={sheet.id}
                    sheet={sheet}
                    PlateIndex={sheetPlateIndex}
                />
                ))}

                {sheetPlate.strips.strips.map((plate, index) => (
                <PlateObject
                    key={index}
                    plate={plate}
                    PlateIndex={sheetPlateIndex}
                />
                ))}

                {sheetPlate.strips.nestingPlates.map((rect, index) => (
                    <React.Fragment key={index}>
                        {rect.freeSpaces.map((space, indexe) => (

                        <FreeRectObject
                            key={indexe}
                            rect={space}
                            PlateIndex={sheetPlateIndex}
                            Slotindex={index}
                        />
                        ))}
                </React.Fragment>
                ))}

            {sheetPlate.strips.strips.map((plate, index) => (
                <React.Fragment key={index}>
                    {plate.plates.map((item, indexe) => (
                        <ItemObject
                    key={indexe}
                    plate={item}
                    strip={plate}
                    PlateIndex={sheetPlateIndex}
                />
                    ))}

                    </React.Fragment>
                ))}

            </React.Fragment>
            ))}
            

        </>

    );

}