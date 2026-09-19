import {workTypes} from "../projects/timetracking/timeTracking.project";

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

                            totalDuration={block.duration}

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

    totalDuration,

    data,

}) {

    const selected = data.selectedSlot?.id === slot.id;
    return (

        <button

            onClick={() =>

                data.setSelectedSlot(slot)

            }

            onDoubleClick={() => {

                if(

                    slot.free &&
                    data.selectedOpenEntry

                ){

                    data.onDropOpenEntry?.(

                        slot,

                        data.selectedOpenEntry

                    );

                } else if(

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

                        Frei

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

                        {workTypes.find(w => w.id === slot.workType)?.label || slot.workType}

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