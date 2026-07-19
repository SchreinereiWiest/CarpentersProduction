import { SheetObject, PlateObject, FreeRectObject } from "./plateObjects.project";
import React from 'react'

export default function NestingScene({result})
{

    if(!result) return;

    return (

        <>
           {result.map((sheetPlate, sheetPlateIndex) => (
            <React.Fragment key={sheetPlateIndex}>

                {sheetPlate.iteration.sheets.map(sheet => (
                <SheetObject
                    key={sheet.id}
                    sheet={sheet}
                    PlateIndex={sheetPlateIndex}
                />
                ))}

                {sheetPlate.iteration.placedPlates.map((plate, index) => (
                <PlateObject
                    key={index}
                    plate={plate}
                    sheets={sheetPlate.iteration.sheets}
                    PlateIndex={sheetPlateIndex}
                />
                ))}

                {sheetPlate.iteration.freeRects.map((rect, index) => (
                <FreeRectObject
                    key={index}
                    rect={rect}
                    sheets={sheetPlate.iteration.sheets}
                    PlateIndex={sheetPlateIndex}
                />
                ))}

            </React.Fragment>
            ))}
            

        </>

    );

}