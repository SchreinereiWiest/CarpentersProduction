import { useEffect, useMemo, useState } from "react";
import { workTypes } from "../projects/timetracking/timeTracking.project";

function calculateOffset(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    return (eh * 60 + em) - (sh * 60 + sm);
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
    Cal
}) {

    // console.log("editSlot", slot);

    const [entry, setEntry] = useState({
        projectId: "",
        workType: "",
        start: "",
        duration: 0
    });


    const block = useMemo(
        () => blocks.find(b => b.id === slot?.position?.block),
        [blocks, slot?.position?.block]
    );

    const blockStart = block?.start ?? "07:00";
    const blockEnd = block?.end ?? "09:00";

    useEffect(() => {

        if (!slot) return;

        let startTime = blockStart;

        if (typeof slot.start === "number") {

            const total =
                calculateOffset("00:00", blockStart) + slot.start;

            const h = Math.floor(total / 60);
            const m = total % 60;

            startTime =
                `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

        } else if (typeof slot.start === "string") {

            startTime = slot.start;

        }

        setEntry({

            projectId: slot.projectId ?? "",

            workType: slot.workType ?? "",

            start: startTime,

            duration: slot.duration ?? 0

        });

    }, [slot, blockStart]);

    if (!open || !slot)
        return null;

    const remaining = calculateOffset(entry.start, blockEnd);

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

            <div className="w-[450px] rounded-xl bg-gray-900 p-6 text-white">

                <h2 className="mb-6 text-xl font-semibold">

                    Zeiteintrag bearbeiten

                </h2>

                <div className="space-y-4">

                    <div>

                        <label className="mb-1 block text-sm">

                            Projekt

                        </label>

                        <select

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

                        <label className="mb-1 block text-sm">

                            Tätigkeit

                        </label>

                        <select

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

                        </select>

                    </div>

                    <div>

                        <label className="mb-1 block text-sm">

                            Start

                        </label>

                        <input

                            type="time"

                            value={entry.start}

                            onChange={e => {

                                const start = e.target.value;

                                const max = calculateOffset(start, blockEnd);

                                setEntry(prev => ({

                                    ...prev,

                                    start,

                                    duration:
                                        Math.min(prev.duration, max)

                                }));

                            }}

                            className="w-full rounded-lg bg-gray-800 p-2"

                        />

                    </div>

                    <div>

                        <label className="mb-1 block text-sm">

                            Dauer (Minuten)

                        </label>

                        <input

                            type="number"

                            min={1}

                            max={remaining}

                            value={entry.duration}

                            onChange={e =>
                                setEntry(prev => ({

                                    ...prev,

                                    duration:
                                        Math.min(
                                            Number(e.target.value),
                                            remaining
                                        )

                                }))
                            }

                            className="w-full rounded-lg bg-gray-800 p-2"

                        />

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

                                    color: "#10B981",

                                    manual: true,

                                    start: entry.start,

                                    date: slot.date,

                                }, mode, Cal)

                            }

                            className="rounded-lg bg-blue-600 px-5 py-2"

                        >

                            Speichern

                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}