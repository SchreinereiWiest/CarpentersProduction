

export default function CncPartSidebar({
    groups,
    selectedGroupId,
    setSelectedGroupId,
    selectedPart,
    setSelectedPart
}) {

    return (
        <aside className="
            min-h-0
            overflow-y-auto
            border-r
            border-gray-700
            bg-gray-900
        ">

            <div className="
                h-14
                flex
                items-center
                px-4
                border-b
                border-gray-700
                font-semibold
            ">
                CNC Programme
            </div>

            <div className="p-2 space-y-1">

                {groups.map(group => {

                    const selected =
                        group.id === selectedGroupId;

                    return (
                        <div
                            key={group.id}
                            className={`
                                rounded
                                border
                                ${
                                    selected
                                        ? "border-blue-700 bg-gray-800"
                                        : "border-gray-800 bg-gray-900"
                                }
                            `}
                        >

                            <button
                                type="button"
                                onClick={() => {

                                    setSelectedGroupId(
                                        group.id
                                    );

                                    setSelectedPart(
                                        group.parts[0] ?? null
                                    );
                                }}
                                className="
                                    w-full
                                    px-3
                                    py-2
                                    text-left
                                    hover:bg-gray-800
                                "
                            >

                                <div className="
                                    flex
                                    justify-between
                                    items-center
                                ">

                                    <span className="
                                        text-sm
                                        text-gray-200
                                    ">
                                        {group.name}
                                    </span>

                                    <span className="
                                        text-xs
                                        text-gray-500
                                    ">
                                        {group.parts.length}×
                                    </span>

                                </div>

                                <div className="
                                    text-xs
                                    text-gray-500
                                    mt-1
                                ">
                                    {group.type}
                                </div>

                            </button>

                            {selected && (
                                <div className="
                                    border-t
                                    border-gray-700
                                    px-2
                                    py-1
                                ">

                                    {group.parts.map(part => (

                                        <button
                                            key={part.PID}
                                            type="button"
                                            onClick={() =>
                                                setSelectedPart(
                                                    part
                                                )
                                            }
                                            className={`
                                                w-full
                                                px-2
                                                py-1
                                                rounded
                                                text-left
                                                text-xs

                                                ${
                                                    selectedPart?.PID === part.PID
                                                        ? "bg-blue-900 text-blue-200"
                                                        : "text-gray-400 hover:bg-gray-800"
                                                }
                                            `}
                                        >
                                            {part.PID} — {part.Objektname}
                                        </button>

                                    ))}

                                </div>
                            )}

                        </div>
                    );
                })}

            </div>

        </aside>
    );
}