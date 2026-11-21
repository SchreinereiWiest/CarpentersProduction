import { useMemo, useState } from "react";
import { CUSTOM_WORK_TYPE_ID } from "../../shared/settings/company-settings.js";

function calculateOffset(start, end) {
    if (!start || !end) return Number.NaN;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    return (eh * 60 + em) - (sh * 60 + sm);
}

function addMinutes(start, duration) {
    if (!start || !Number.isFinite(Number(duration))) return "";
    const [hours, minutes] = start.split(":").map(Number);
    const total = hours * 60 + minutes + Number(duration);
    if (total < 0 || total >= 24 * 60) return "";
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function EditTimeModal({
    open,
    slot,
    blocks,
    projects,
    onSave,
    onClose,
    onDelete,
    mode,
    Cal,
    workTypes
}) {

    // console.log("editSlot", slot);

    const block = useMemo(
        () => blocks.find(b => b.id === slot?.position?.block),
        [blocks, slot?.position?.block]
    );

    const blockStart = block?.start ?? "07:00";
    const blockEnd = block?.end ?? "09:00";

    const [entry, setEntry] = useState(() => {
        let startTime = blockStart;

        if (typeof slot?.start === "number") {

            const total =
                calculateOffset("00:00", blockStart) + slot.start;

            const h = Math.floor(total / 60);
            const m = total % 60;

            startTime =
                `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        } else if (typeof slot?.start === "string") {

            startTime = slot.start;

        }

        const duration = Number(slot?.duration) || 0;
        return {
            projectId: slot?.projectId ?? "",

            workType: slot?.workType ?? "",

            customWorkType: slot?.customWorkType ?? "",

            timeEntryId: slot?.timeEntryId ?? null,

            start: startTime,

            end: typeof slot?.end === "string" ? slot.end : addMinutes(startTime, duration),

            duration
        };
    });

    if (!open || !slot)
        return null;

    const remaining = Math.max(0, calculateOffset(entry.start, blockEnd) || 0);

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

            <div className="w-full max-w-[450px] rounded-xl bg-gray-900 p-4 text-white sm:p-6">

                <h2 className="mb-6 text-xl font-semibold">

                    Zeiteintrag bearbeiten

                </h2>

                <div className="space-y-4">

                    <div>

                        <label htmlFor="employee-time-project" className="mb-1 block text-sm">

                            Projekt

                        </label>

                        <select

                            id="employee-time-project"

                            value={entry.projectId}

                            onChange={e =>
                                setEntry(prev => ({
                                    ...prev,
                                    projectId: e.target.value
                                }))
                            }

                            className="w-full rounded-lg bg-gray-800 p-2"

                        >

                            <option value="">
                                Projekt auswählen
                            </option>

                            {projects.map(project => (

                                <option
                                    key={project.id}
                                    value={project.id}
                                >

                                    {project.title}

                                </option>

                            ))}

                        </select>

                    </div>

                    <div>

                        <label htmlFor="employee-time-work-type" className="mb-1 block text-sm">

                            Tätigkeit

                        </label>

                        <select

                            id="employee-time-work-type"

                            value={entry.workType}

                            onChange={e =>
                                setEntry(prev => ({
                                    ...prev,
                                    workType: e.target.value
                                }))
                            }

                            className="w-full rounded-lg bg-gray-800 p-2"

                        >

                            <option value="">
                                Tätigkeit auswählen
                            </option>

                            {workTypes.map(type => (

                                <option
                                    key={type.id}
                                    value={type.id}
                                >

                                    {type.label}

                                </option>

                            ))}

                            <option value={CUSTOM_WORK_TYPE_ID}>
                                Eigene Tätigkeit
                            </option>

                        </select>

                    </div>

                    {entry.workType === CUSTOM_WORK_TYPE_ID && (
                        <div>
                            <label htmlFor="employee-time-custom-work" className="mb-1 block text-sm">Eigene Bezeichnung</label>
                            <input
                                id="employee-time-custom-work"
                                type="text"
                                value={entry.customWorkType}
                                onChange={event => setEntry(previous => ({
                                    ...previous,
                                    customWorkType: event.target.value
                                }))}
                                placeholder="Tätigkeit eintragen"
                                className="w-full rounded-lg bg-gray-800 p-2"
                            />
                        </div>
                    )}

                    <div>

                        <label htmlFor="employee-time-start" className="mb-1 block text-sm">

                            Start

                        </label>

                        <input

                            id="employee-time-start"

                            type="time"

                            value={entry.start}

                            onChange={e => {

                                const start = e.target.value;

                                const calculatedMaximum = calculateOffset(start, blockEnd);

                                const max = Number.isFinite(calculatedMaximum) && calculatedMaximum > 0
                                    ? calculatedMaximum
                                    : 0;

                                const durationFromEnd = calculateOffset(start, entry.end);

                                const duration = Number.isFinite(durationFromEnd) && durationFromEnd > 0
                                    ? Math.min(durationFromEnd, max)
                                    : Math.min(Number(entry.duration) || 0, max);

                                setEntry(prev => ({

                                    ...prev,

                                    start,

                                    duration,

                                    end: addMinutes(start, duration)

                                }));

                            }}

                            className="w-full rounded-lg bg-gray-800 p-2"

                        />

                    </div>

                    <div>

                        <label htmlFor="employee-time-end" className="mb-1 block text-sm">

                            Ende

                        </label>

                        <input

                            id="employee-time-end"

                            type="time"

                            min={entry.start}

                            max={blockEnd}

                            value={entry.end}

                            onChange={e => {
                                const end = e.target.value;
                                const calculated = calculateOffset(entry.start, end);
                                setEntry(prev => ({
                                    ...prev,
                                    end,
                                    duration: Number.isFinite(calculated) && calculated > 0 && calculated <= remaining
                                        ? calculated
                                        : 0
                                }));
                            }}

                            className="w-full rounded-lg bg-gray-800 p-2"

                        />

                        <p className="mt-1 text-xs text-gray-500">Start + Ende berechnet die Dauer automatisch.</p>

                    </div>

                    <div>

                        <label htmlFor="employee-time-duration" className="mb-1 block text-sm">

                            Dauer (Minuten)

                        </label>

                        <input

                            id="employee-time-duration"

                            type="number"

                            min={1}

                            max={remaining}

                            value={entry.duration}

                            onChange={e => {
                                const duration = Math.min(Math.max(0, Number(e.target.value) || 0), remaining);
                                setEntry(prev => ({
                                    ...prev,
                                    duration,
                                    end: addMinutes(prev.start, duration)
                                }));
                            }}

                            className="w-full rounded-lg bg-gray-800 p-2"

                        />

                        <p className="mt-1 text-xs text-gray-500">Start + Dauer berechnet die Endzeit automatisch.</p>

                    </div>

                </div>

                <div className="mt-8 flex justify-between">

                    <button

                        onClick={() => onDelete(slot)}

                        className="rounded-lg bg-red-600 px-5 py-2"

                    >

                        Löschen

                    </button>

                    <div className="space-x-2">

                        <button

                            onClick={onClose}

                            className="rounded-lg bg-gray-700 px-5 py-2"

                        >

                            Abbrechen

                        </button>

                        <button

                            onClick={() =>

                                onSave({

                                    position: {

                                        day: slot.position.day,

                                        block: slot.position.block,

                                    },

                                    id: slot.id,

                                    offset: calculateOffset(
                                        blockStart,
                                        entry.start
                                    ),

                                    duration: entry.duration,

                                    projectId: entry.projectId,

                                    workType: entry.workType,

                                    customWorkType: entry.workType === CUSTOM_WORK_TYPE_ID
                                        ? entry.customWorkType.trim()
                                        : null,

                                    timeEntryId: entry.timeEntryId,

                                    color: "#10B981",

                                    manual: true,

                                    start: entry.start,

                                    end: entry.end,

                                    date: slot.date,

                                }, mode, Cal)

                            }

                            disabled={
                                !entry.projectId ||
                                !entry.workType ||
                                !entry.start ||
                                !entry.end ||
                                !Number.isFinite(Number(entry.duration)) ||
                                entry.duration <= 0 ||
                                (entry.workType === CUSTOM_WORK_TYPE_ID && !entry.customWorkType.trim())
                            }

                            className="rounded-lg bg-blue-600 px-5 py-2 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"

                        >

                            Speichern

                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}
