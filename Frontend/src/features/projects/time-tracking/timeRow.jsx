

import { getWorkTypeLabel } from "../../../shared/settings/company-settings.js";

export default function TimeRow({ entry, workTypes }) {

    const userName = [entry.user?.firstName, entry.user?.lastName]
        .filter(Boolean)
        .join(" ") || entry.user?.login || "Unbekannter Benutzer";

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

    function formatDuration(minutes = 0) {

        const h = Math.floor(minutes / 60);
        const m = Math.floor((minutes % 60));

        if (h > 0) {
            return `${h}h ${m}min`;
        }

        return `${m}min`;

    }

    return (

        <div
            className="
                flex
                flex-col
                items-stretch
                justify-between
                gap-3
                rounded-lg
                bg-gray-900
                border
                border-gray-700
                px-4
                py-3
                sm:flex-row
                sm:items-center
                sm:gap-4
                sm:px-5
                sm:py-4
                transition
                hover:border-gray-500
                hover:bg-gray-800
            "
        >

            {/* linke Seite */}

            <div className="flex flex-col">

                <div className="flex flex-wrap items-baseline gap-x-2">
                    <span
                        className="
                            text-base
                            font-semibold
                            text-white
                        "
                    >
                        {getWorkTypeLabel(workTypes, entry.workType, entry.customWorkType)}
                    </span>

                    <span className="text-sm font-normal text-gray-400">
                        {userName}
                    </span>
                </div>

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
                    text-center
                "
            >
                {formatDuration(entry.duration)}
            </div>

        </div>

    );

}
