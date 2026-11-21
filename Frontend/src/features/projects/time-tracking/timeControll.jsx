

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../../app/providers/AuthContext.js";
import DurationInput from "./TimeEntry.jsx";
import { CUSTOM_WORK_TYPE_ID } from "../../../shared/settings/company-settings.js";

export default function TimeControls({
    projectId,
    activeEntry,
    reload,
    workTypes
}) {
    const { user } = useAuth();

    const runningEntry = activeEntry;

    const [elapsed, setElapsed] = useState(0);

    const [manualTimes, setManualTimes] = useState({});

    const [customWorkType, setCustomWorkType] = useState("");

    const [allUsers, setAllUsers] = useState([]);

    const [selectedUserId, setSelectedUserId] = useState("");

    const [directTime, setDirectTime] = useState(() => ({
        date: new Date().toLocaleDateString("sv-SE"),
        start: "",
        end: "",
        workType: "",
        customWorkType: ""
    }));

    const [directTimeMessage, setDirectTimeMessage] = useState(null);

    const timeUser = allUsers.find(entry => entry.id === selectedUserId) ?? user ?? null;

    useEffect(() => {

        if (!runningEntry) {
            return;
        }

        const update = () => {

            setElapsed(

                Math.floor(
                    (Date.now() -
                        new Date(runningEntry.startedAt).getTime()) / 1000 /60
                )

            );

        };

        update();

        const interval = setInterval(update, 1000);

        return () => clearInterval(interval);

    }, [runningEntry]);

    function formatTime(totalMinutes) {

    if (!totalMinutes) return "00:00";

    const h = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");

    const m = Math.floor((totalMinutes % 60))
        .toString()
        .padStart(2, "0");

    return `${h}:${m}`;

}

    async function startTimer(workType, customLabel = null) {

        try {

            await axios.post(
                `/api/projects/time/${projectId}/start`,
                {
                    workType,
                    customWorkType: customLabel,
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

                if (workType === CUSTOM_WORK_TYPE_ID && !customWorkType.trim()) continue;

                await axios.post(
                    `/api/projects/time/${projectId}/new`,
                    {
                        workType,
                        customWorkType: workType === CUSTOM_WORK_TYPE_ID
                            ? customWorkType.trim()
                            : null,
                        duration: value,
                        userId: timeUser.id
                    }
                );

            }

            setManualTimes({});

            setCustomWorkType("");

            await reload();

        } catch (err) {

            console.error(err);

        }

    }

    async function saveDirectTime() {
        const startTime = new Date(`${directTime.date}T${directTime.start}`);
        const endTime = new Date(`${directTime.date}T${directTime.end}`);
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
        if (!directTime.workType || !directTime.start || !directTime.end || !Number.isInteger(duration) || duration <= 0) {
            setDirectTimeMessage({ type: "error", text: "Bitte Tätigkeit, Beginn und ein späteres Ende eintragen." });
            return;
        }
        if (directTime.workType === CUSTOM_WORK_TYPE_ID && !directTime.customWorkType.trim()) {
            setDirectTimeMessage({ type: "error", text: "Bitte die eigene Tätigkeit benennen." });
            return;
        }

        setDirectTimeMessage(null);
        try {
            await axios.post(`/api/projects/time/${projectId}/new`, {
                workType: directTime.workType,
                customWorkType: directTime.workType === CUSTOM_WORK_TYPE_ID
                    ? directTime.customWorkType.trim()
                    : null,
                userId: timeUser.id,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
            });
            setDirectTime(previous => ({ ...previous, start: "", end: "", customWorkType: "" }));
            setDirectTimeMessage({ type: "success", text: "Der Uhrzeiteintrag wurde direkt diesem Projekt zugeordnet." });
            await reload();
        } catch (error) {
            setDirectTimeMessage({
                type: "error",
                text: error.response?.data?.message || "Der Uhrzeiteintrag konnte nicht gespeichert werden."
            });
        }
    }

    useEffect(() => {

        const fetchUser = async () => {
            const { data } = await axios.get(`/api/auth/users`);
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

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

    <h2
        className="
            text-xl
            font-semibold
        "
    >
        Zeiterfassung
    </h2>

    <div className="w-full sm:w-64">



        <select
            value={timeUser?.id ?? ""}
            onChange={event => setSelectedUserId(event.target.value)}
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
                    value={user.id}
                >
                    {user.email}
                </option>
            ))}
        </select>

    </div>

</div>
           

            

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

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

    onChange={(minutes) =>
        setManualTimes(prev => ({
            ...prev,
            [work.id]: minutes
        }))
    }

/>

                        <button
                            disabled={disabled || !timeUser}
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
                                    disabled || !timeUser
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

    <div className="rounded-lg border border-dashed border-gray-600 bg-gray-900 p-4">
        <div className="mb-3 font-medium">Eigene Tätigkeit</div>

        <input
            type="text"
            value={customWorkType}
            disabled={runningEntry && runningEntry.workType !== CUSTOM_WORK_TYPE_ID}
            onChange={event => setCustomWorkType(event.target.value)}
            placeholder="Eigene Bezeichnung"
            className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:text-gray-500"
        />

        {runningEntry?.workType === CUSTOM_WORK_TYPE_ID ? (
            <>
                <div className="mb-3 text-center text-2xl font-mono font-bold text-green-400">
                    {formatTime(elapsed)}
                </div>
                <button onClick={stopTimer} className="w-full rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500">
                    Stop
                </button>
            </>
        ) : (
            <>
                <DurationInput
                    value={manualTimes[CUSTOM_WORK_TYPE_ID] ?? 0}
                    disabled={Boolean(runningEntry)}
                    onChange={minutes => setManualTimes(previous => ({
                        ...previous,
                        [CUSTOM_WORK_TYPE_ID]: minutes
                    }))}
                />
                <button
                    disabled={Boolean(runningEntry) || !customWorkType.trim() || !timeUser}
                    onClick={() => startTimer(CUSTOM_WORK_TYPE_ID, customWorkType.trim())}
                    className="w-full rounded-lg bg-green-600 py-2 font-medium hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
                >
                    Start
                </button>
            </>
        )}
    </div>

</div>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                <div>
                    <h3 className="font-semibold">Direkter Uhrzeiteintrag</h3>
                    <p className="mt-1 text-xs text-gray-500">Beginn und Ende werden automatisch dem geöffneten Projekt zugeordnet.</p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="text-sm text-gray-300">
                        Datum
                        <input type="date" value={directTime.date} onChange={event => setDirectTime(previous => ({ ...previous, date: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
                    </label>
                    <label className="text-sm text-gray-300">
                        Tätigkeit
                        <select value={directTime.workType} onChange={event => setDirectTime(previous => ({ ...previous, workType: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white">
                            <option value="">Tätigkeit wählen</option>
                            {workTypes.map(work => <option key={work.id} value={work.id}>{work.label}</option>)}
                            <option value={CUSTOM_WORK_TYPE_ID}>Eigene Tätigkeit</option>
                        </select>
                    </label>
                    <label className="text-sm text-gray-300">
                        Start
                        <input type="time" value={directTime.start} onChange={event => setDirectTime(previous => ({ ...previous, start: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
                    </label>
                    <label className="text-sm text-gray-300">
                        Ende
                        <input type="time" value={directTime.end} onChange={event => setDirectTime(previous => ({ ...previous, end: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white" />
                    </label>
                </div>
                {directTime.workType === CUSTOM_WORK_TYPE_ID && (
                    <input type="text" value={directTime.customWorkType} onChange={event => setDirectTime(previous => ({ ...previous, customWorkType: event.target.value }))} placeholder="Eigene Tätigkeit benennen" className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
                )}
                {directTimeMessage && <p className={`mt-3 text-sm ${directTimeMessage.type === "success" ? "text-green-400" : "text-red-400"}`} role="status">{directTimeMessage.text}</p>}
                <button type="button" onClick={saveDirectTime} disabled={Boolean(runningEntry) || !timeUser} className="mt-4 w-full rounded-lg bg-cyan-700 py-2.5 font-semibold hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500">Uhrzeit direkt eintragen</button>
            </section>

            <button

                onClick={saveManualTimes}

                disabled={runningEntry || !timeUser}

                className={`
                    w-full  
                    rounded-lg
                    py-3
                    font-semibold
                    transition

                    ${runningEntry || !timeUser

                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"

                        : "bg-blue-600 hover:bg-blue-500"}

                `}

            >

                Stunden eintragen

            </button>

        </div>

    );

}
