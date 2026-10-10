import { getWorkTypeLabel } from "../../services/companySettings";

export default function MissingTimes({

    entries,
    selected,
    setSelected,
    workTypes,
    assigningEntryId,
    message

}) {

    // console.log("MissingTimes entries:", entries);

    return (

        <div className="
            rounded-xl
            bg-gray-800
            h-full
            flex
            flex-col
            overflow-hidden
        ">

            <div className="
                px-5
                py-4
                border-b
                border-gray-700
            ">

                <h2 className="text-xl font-semibold">

                    Offene Zeiten

                </h2>

            </div>

            <div className="
                flex-1
                overflow-y-auto
                p-3
                space-y-3
            ">

                {message && (
                    <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                        message.type === "success"
                            ? "border-green-800 bg-green-950/40 text-green-300"
                            : "border-red-800 bg-red-950/40 text-red-300"
                    }`}>
                        {message.text}
                    </div>
                )}

                {selected && (
                    <div className="mb-3 rounded-lg border border-blue-800 bg-blue-950/40 px-3 py-2 text-sm text-blue-200">
                        Klicke jetzt auf einen passenden freien Kalenderbereich.
                    </div>
                )}

                {

                    entries?.map(entry => {

                        const active =
                            selected?.id === entry.id;

                        return (

                            <button

                                key={entry.id}

                                type="button"

                                disabled={Boolean(assigningEntryId)}

                                aria-pressed={active}

                                onClick={()=>

                                    setSelected(entry)

                                }

                                className={`

                                    w-full

                                    rounded-lg

                                    border

                                    p-4

                                    text-left

                                    transition

                                    ${active

                                        ?

                                        "border-blue-400 bg-blue-500/20"

                                        :

                                        "border-gray-700 bg-gray-900 hover:bg-gray-700"

                                    }

                                `}

                            >

                                <div className="font-semibold">

                                    {entry.project?.title || entry.projectId}

                                </div>

                                <div className="
                                    text-sm
                                    text-gray-400
                                ">

                                    {getWorkTypeLabel(workTypes, entry.workType, entry.customWorkType)}

                                </div>

                                <div className="
                                    mt-2
                                    text-blue-300
                                    font-medium
                                ">

                                    {entry.duration} min

                                </div>

                            </button>

                        );

                    })

                }

            </div>

        </div>

    );

}
