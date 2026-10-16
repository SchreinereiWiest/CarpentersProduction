

import TimeRow from "./timeRow.project";

export default function TimeHistory({ entries, workTypes }) {

    function formatDuration(minutes) {

        const h = Math.floor(minutes / 60);
        const m = Math.floor((minutes % 60));

        return `${h}h ${m}min`;

    }

    function groupEntries(entries) {

        const grouped = {};

        entries.forEach(entry => {
            let day = new Date().toLocaleDateString("de-DE");
            if(entry.startedAt!=null) {
                day = new Date(entry.startedAt)
                .toLocaleDateString("de-DE");
            }

            if (!grouped[day]) {

                grouped[day] = {
                    total: 0,
                    entries: []
                };

            }

            grouped[day].entries.push(entry);

            grouped[day].total += entry.duration ?? 0;

        });

        return Object.entries(grouped);

    }

    const groupedEntries = groupEntries(entries);
    return (

        <div
            className="
                min-h-0
                w-full
                space-y-4
                lg:h-full
                lg:overflow-y-auto
                lg:pr-3
                lg:space-y-6
            "
        >

            <h2 className="text-xl font-semibold">

                Zeithistorie

            </h2>

            {

                groupedEntries.map(([day, data]) => (

                    <div

                        key={day}

                        className="
                            rounded-xl
                            bg-gray-800
                            p-3
                            sm:p-5
                        "

                    >

                        <div
                            className="
                                mb-5
                                flex
                                flex-wrap
                                gap-3
                                items-center
                                justify-between
                                border-b
                                border-gray-700
                                pb-3
                            "
                        >

                            <div
                                className="
                                    text-lg
                                    font-semibold
                                "
                            >

                                {day}

                            </div>

                            <div
                                className="
                                    text-lg
                                    font-semibold
                                "
                            >

                                {data.userID}

                            </div>

                            <div
                                className="
                                    rounded-lg
                                    bg-gray-900
                                    px-3
                                    py-1.5
                                    text-green-400
                                    font-semibold
                                "
                            >

                                {formatDuration(data.total)}

                            </div>

                        </div>

                        <div className="space-y-3">

                            {

                                data.entries.map(entry => (

                                    <TimeRow

                                        key={entry.id}

                                        entry={entry}

                                        workTypes={workTypes}

                                    />

                                ))

                            }

                        </div>

                    </div>

                ))

            }

        </div>

    );

}
