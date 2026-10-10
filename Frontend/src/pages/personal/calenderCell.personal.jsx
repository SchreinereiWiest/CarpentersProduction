import { getWorkTypeLabel } from "../../services/companySettings";

export default function DayColumn({

    day,

    dayData,

    data

}) {

    return (

        <div className="
            flex
            flex-col
            rounded-lg
            bg-gray-900
            overflow-hidden
            border
            border-gray-700
        ">

            <div className="
                py-3
                text-center
                font-semibold
                bg-gray-800
                border-b
                border-gray-700
            ">

                {day.label} {dayData?.date}

            </div>

            <div className="
                flex-1
                flex
                flex-col
                gap-2
                p-2
                overflow-hidden
            ">

                {

                    dayData?.blocks.map(block => (

                        <TimeBlock

                            key={block.id}

                            block={block}

                            slots={
                                dayData?.blocks?.find(
                                    b => b.id === block.id
                                )?.slots ?? [
                                    {
                                        id:null,
                                        duration:block.duration,
                                        free:true
                                    }
                                ]
                            }

                            data={data}

                        />

                    ))

                }

            </div>

        </div>

    );

}


export function TimeBlock({

    block,

    slots,

    data

}) {
    return (

        <div className="
            flex
            flex-col
            rounded-lg
            bg-gray-800
            flex-1
            overflow-hidden
        ">

            <div className="
                py-2
                text-center
                text-sm
                font-medium
                bg-gray-700
            ">

                {block.start} - {block.end}

            </div>

            <div className="
                flex
                flex-col
                flex-1
            ">

                {

                    slots.map(slot => (

                        <TimeSlot

                            key={
                                slot.id
                            }

                            slot={slot}

                            data={data}

                        />

                    ))

                }

            </div>

        </div>

    );

}

export function TimeSlot({

    slot,

    data,

}) {

    const selected = data.selectedSlot?.id === slot.id;
    const assigning = slot.free && Boolean(data.selectedOpenEntry);
    const canAssign = assigning && Number(data.selectedOpenEntry.duration) <= slot.duration;

    return (

        <button

            onClick={() => {
                if (slot.free && data.selectedOpenEntry) {
                    data.assignOpenEntry?.(slot, data.selectedOpenEntry);
                    return;
                }

                data.setSelectedSlot(slot);
            }}

            onDoubleClick={() => {

                if (data.selectedOpenEntry) return;

                if(

                    slot.free

                ){

                    data.openEditor?.(slot, "new");

                } else {
                    data.openEditor?.(slot,  "edit");
                }

                

            }}

            style={{

                flex:slot.duration

            }}

            title={
                assigning
                    ? canAssign
                        ? "Offene Zeit hier zuordnen"
                        : "Dieser Bereich ist für die offene Zeit zu kurz"
                    : undefined
            }

            className={`

                relative

                flex

                flex-col

                justify-center

                items-center

                transition-all

                border-b

                border-gray-700

                ${slot.free

                    ?

                    "bg-gray-900 hover:bg-gray-700"

                    :

                    ""
                }

                ${assigning
                    ? canAssign
                        ? "ring-2 ring-inset ring-blue-500 bg-blue-950/30 cursor-copy"
                        : "opacity-50 cursor-not-allowed"
                    : ""
                }

                ${selected

                    ?

                    "ring-2 ring-yellow-300"

                    :

                    ""

                }

            `}

        >

            {

                slot.free ?

                <>

                    <div className="text-gray-500">

                        {assigning ? (canAssign ? "Hier zuordnen" : "Zu kurz") : "Frei"}

                    </div>

                    <div className="
                        text-xs
                        text-gray-600
                    ">

                        {slot.duration} min

                    </div>

                </>

                :

                <>

                    <div
                        className="
                            absolute
                            inset-0
                            opacity-25
                        "
                        style={{

                            backgroundColor:slot.color

                        }}
                    />

                    <div className="
                        relative
                        font-semibold
                        text-center
                        px-2
                    ">

                        {data.projects.find(p => p.id === slot.projectId)?.title || slot.projectId}

                    </div>

                    <div className="
                        relative
                        text-xs
                        text-gray-300
                    ">

                        {getWorkTypeLabel(data.workTypes, slot.workType, slot.customWorkType)}

                    </div>

                    <div className="
                        relative
                        text-xs
                        font-mono
                    ">

                        {slot.duration} min

                    </div>

                </>

            }

        </button>

    );

}
