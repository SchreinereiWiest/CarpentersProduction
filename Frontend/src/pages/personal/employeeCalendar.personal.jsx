import DayColumn from "./calenderCell.personal";



export default function EmployeeCalendar({

    data

}) {

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

            <div className="
                mb-4
                flex
                items-center
                justify-between
            ">

                <h2 className="
                    text-xl
                    font-semibold
                ">
                    Kalender
                </h2>

                <div className="
                    text-gray-400
                ">
                    KW 31
                </div>

            </div>

            <div className="
                grid
                grid-cols-5
                gap-4
                flex-1
                overflow-hidden
            ">

                {

                    data?.days.map(day => (

                        <DayColumn

                            key={day.id}

                            day={day}

                            dayData={   
                                data.weekData?.find(
                                    d => d.day === day.id
                                )
                            }

                            data={data}

                        />

                    ))

                }

            </div>

        </div>

    );

}