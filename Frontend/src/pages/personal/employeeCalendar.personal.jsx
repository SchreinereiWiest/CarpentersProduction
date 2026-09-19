import DayColumn from "./calenderCell.personal";



export default function EmployeeCalendar({

    data

}) {
    // console.log(data);
    return (

        <div className="
            flex
            flex-col
            rounded-xl
            bg-gray-800
            p-4
            h-full
            overflow-hidden
        ">

            <div className="flex items-center justify-center gap-4 mb-4">

    {/* Vorherige Woche */}
    <button
        type="button"
        onClick={data.previousWeek}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6"
        >
            <path
                fillRule="evenodd"
                d="M7.28 7.72a.75.75 0 0 1 0 1.06l-2.47 2.47H21a.75.75 0 0 1 0 1.5H4.81l2.47 2.47a.75.75 0 1 1-1.06 1.06l-3.75-3.75a.75.75 0 0 1 0-1.06l3.75-3.75a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
            />
        </svg>
    </button>

    {/* Kalenderwoche */}
    <div className="min-w-20 text-center text-lg font-semibold">
        KW {data.getCalendarWeek(data.weekOffset, data.today)}
    </div>

    {/* Nächste Woche */}
    <button
        type="button"
        onClick={data.nextWeek}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-6"
        >
            <path
                fillRule="evenodd"
                d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
            />
        </svg>
    </button>

</div>

            <div className="
                grid
                grid-cols-5
                gap-4
                flex-1
                overflow-hidden
            ">

                {

                    data.weekData.map(day => (

                        <DayColumn

                            key={day.day}

                            day={data.days?.find(
                                    d => d.id === day.day
                                )}

                            dayData={day}

                            data={data}

                        />

                    ))

                }

            </div>

        </div>

    );

}