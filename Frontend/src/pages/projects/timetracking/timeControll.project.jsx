

import { useEffect, useState, setState } from "react";
import axios from "axios";
import { workTypes } from "./timeTracking.project";
import { useAuth } from "../../../routes/AuthContext";
import DurationInput from "./TimeEntry.project";

export default function TimeControls({
    projectId,
    activeEntry,
    reload
}) {
    const { user, loading } = useAuth();

    const [runningEntry, setRunningEntry] = useState(activeEntry);

    const [elapsed, setElapsed] = useState(0);

    const [manualTimes, setManualTimes] = useState({});

    const [timeUser, setTimeUser] = useState(user ?? null);

    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        setRunningEntry(activeEntry);
    }, [activeEntry]);

    useEffect(() => {

        if (!runningEntry) {
            setElapsed(0);
            return;
        }

        const update = () => {

            setElapsed(

                Math.floor(
                    (Date.now() -
                        new Date(runningEntry.startedAt).getTime()) / 1000
                )

            );

        };

        update();

        const interval = setInterval(update, 1000);

        return () => clearInterval(interval);

    }, [runningEntry]);

    function formatTime(seconds) {

    if (!seconds) return "00:00:00";

    const h = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, "0");

    const m = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, "0");

    const s = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${h}:${m}:${s}`;

}

function timeToSeconds(value) {

    const [h, m, s] = value.split(":").map(Number);

    return h * 3600 + m * 60 + s;

}

    async function startTimer(workType) {

        try {

            await axios.post(
                `/api/projects/time/${projectId}/start`,
                {
                    workType,
                    userId: timeUser.id
                }
            );

            await reload();

        } catch (err) {

            console.error(err);

        }

    }

    async function stopTimer() {

        if (!runningEntry) return;

        try {

            await axios.patch(
                `/api/projects/time/${runningEntry.id}/stop`
            );

            await reload();

        } catch (err) {

            console.error(err);

        }

    }

    async function saveManualTimes() {

        try {

            for (const workType of Object.keys(manualTimes)) {

                const value = manualTimes[workType];

                if (!value) continue;

                await axios.post(
                    `/api/projects/time/${projectId}/new`,
                    {
                        workType,
                        duration: value,
                        userId: timeUser.id
                    }
                );

            }

            setManualTimes({});

            await reload();

        } catch (err) {

            console.error(err);

        }

    }

    useEffect(() => {

        const fetchUser = async () => {
            const { data } = await axios.get(`/api/auth/users`);
            const allUsers = data.filterUser;
            setAllUsers(data.filterUser);
        };
        
        fetchUser();
    }, []);

    return (

        <div className="
            rounded-xl
            bg-gray-800
            p-4
            space-y-4
            h-fit
        ">

            <div className="flex items-end justify-between mb-5">

    <h2
        className="
            text-xl
            font-semibold
        "
    >
        Zeiterfassung
    </h2>

    <div className="w-64">



        <select
            value={timeUser?.email ?? ""}
            onChange={(e) => {

                const selectedUser = allUsers.find(
                    u => u.email === e.target.value
                );

                setTimeUser(selectedUser);

            }}
            className="
                w-full
                rounded-lg
                border
                border-gray-700
                bg-gray-900
                px-3
                py-2
                text-white
                focus:border-blue-500
                focus:outline-none
            "
        >
            {allUsers.map(user => (
                <option
                    key={user.id}
                    value={user.email}
                >
                    {user.email}
                </option>
            ))}
        </select>

    </div>

</div>
           

            

            <div className="grid grid-cols-2 gap-4">

    {workTypes.map(work => {

        const running =
            runningEntry?.workType === work.id;

        const disabled =
            runningEntry &&
            !running;

        return (

            <div
                key={work.id}
                className="
                    rounded-lg
                    bg-gray-900
                    p-4
                "
            >

                <div className="
                    mb-3
                    font-medium
                ">
                    {work.label}
                </div>

                {running ? (

                    <>

                        <div className="
                            mb-3
                            text-center
                            text-2xl
                            font-mono
                            font-bold
                            text-green-400
                        ">

                            {formatTime(elapsed)}

                        </div>

                        <button
                            onClick={stopTimer}
                            className="
                                w-full
                                rounded-lg
                                bg-red-600
                                py-2
                                font-medium
                                hover:bg-red-500
                            "
                        >

                            Stop

                        </button>

                    </>

                ) : (

                    <>

                        <DurationInput

    value={
        manualTimes[work.id] ?? 0
    }

    disabled={disabled}

    onChange={(seconds) =>
        setManualTimes(prev => ({
            ...prev,
            [work.id]: seconds
        }))
    }

/>

                        <button
                            disabled={disabled}
                            onClick={() =>
                                startTimer(work.id)
                            }
                            className={`
                                w-full
                                rounded-lg
                                py-2
                                font-medium
                                transition

                                ${
                                    disabled
                                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                        : "bg-green-600 hover:bg-green-500"
                                }
                            `}
                        >

                            Start

                        </button>

                    </>

                )}

            </div>

        );

    })}

</div>

            <button

                onClick={saveManualTimes}

                disabled={runningEntry}

                className={`
                    w-full  
                    rounded-lg
                    py-3
                    font-semibold
                    transition

                    ${runningEntry

                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"

                        : "bg-blue-600 hover:bg-blue-500"}

                `}

            >

                Manuelle Zeiten speichern

            </button>

        </div>

    );

}