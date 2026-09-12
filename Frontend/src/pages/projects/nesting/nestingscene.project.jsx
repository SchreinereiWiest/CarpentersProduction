import { SheetObject, PlateObject, FreeRectObject, ItemObject } from "./plateObjects.project";
import React from 'react'

export default function NestingScene({result, setActiveStrip, activeStrip, settings})
{
if(!result) return;

console.log(result);

return (

<>

    {result.nestingPlates.map(sheet => (
    <SheetObject key={sheet.id} sheet={sheet} settings={settings}/>
    ))}

    {result.strips.map((plate, index) => (
    <PlateObject key={index} plate={plate} setActiveStrip={setActiveStrip} activeStrip={activeStrip} />
    ))}

    {result.nestingPlates.map((rect, index) => (
    <React.Fragment key={index}>
        {rect.freeSpaces.map((space, indexe) => (

        <FreeRectObject key={indexe} rect={space} Slotindex={index} />
        ))}
    </React.Fragment>
    ))}

    {result.strips.map((plate, index) => (
    <React.Fragment key={index}>
        {plate.plates.map((item, indexe) => (
        <ItemObject key={indexe} plate={item} strip={plate} />
        ))}

    </React.Fragment>
    ))}

</>

);

}