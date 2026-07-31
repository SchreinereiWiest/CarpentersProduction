

import { workTypes } from "./timeTracking.project";

export default function TimeRow({ entry }) {

    function formatTime(date) {

        if (!date) return "--:--";

        return new Date(date).toLocaleTimeString(
            "de-DE",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }

    function formatDuration(seconds = 0) {

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        if (h > 0) {
            return `${h}h ${m}min`;
        }

        return `${m}min`;

    }

    const workType = workTypes.find(
        type => type.id === entry.workType
    );

    return (

        <div
            className="
                flex
                items-center
                justify-between
                rounded-lg
                bg-gray-900
                border
                border-gray-700
                px-5
                py-4
                transition
                hover:border-gray-500
                hover:bg-gray-800
            "
        >

            {/* linke Seite */}

            <div className="flex flex-col">

                <span
                    className="
                        text-base
                        font-semibold
                        text-white
                    "
                >
                    {workType?.label ?? entry.workType}
                </span>

                <span
                    className="
                        mt-1
                        text-sm
                        text-gray-400
                    "
                >
                    {formatTime(entry.startedAt)}
                    {"  →  "}
                    {formatTime(entry.endedAt)}
                </span>

            </div>

            {/* rechte Seite */}

            <div
                className="
                    rounded-lg
                    bg-gray-800
                    px-4
                    py-2
                    text-green-400
                    font-semibold
                    whitespace-nowrap
                "
            >
                {formatDuration(entry.duration)}
            </div>

        </div>

    );

}