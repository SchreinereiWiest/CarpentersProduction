

export function CabinetList({
    cabinets,
    activeCabinetId,
    onSelect,
}) {

    return (
        <div className="">


            <div className="px-2 pb-3">

                {cabinets.map(
                    cabinet => {

                        const active =
                            cabinet.id ===
                            activeCabinetId;


                        return (
                            <button
                                key={cabinet.id}
                                type="button"

                                onClick={() =>
                                    onSelect(
                                        cabinet.id
                                    )
                                }

                                className={`
                                    w-full
                                    rounded
                                    px-3
                                    py-2
                                    text-left
                                    transition
                                    ${
                                        active
                                            ? "bg-gray-800"
                                            : "hover:bg-gray-800/60"
                                    }
                                `}
                            >

                                <div className="flex items-center gap-2">

                                    <div
                                        className={`
                                            h-2
                                            w-2
                                            rounded-full
                                            ${
                                                active
                                                    ? "bg-blue-400"
                                                    : "bg-gray-600"
                                            }
                                        `}
                                    />

                                    <span className="
                                        truncate
                                        text-sm
                                        text-gray-200
                                    ">
                                        {cabinet.name}
                                    </span>

                                </div>


                                <div className="
                                    ml-4
                                    mt-0.5
                                    text-xs
                                    text-gray-500
                                ">

                                    {cabinet.width}
                                    {" × "}
                                    {cabinet.height}
                                    {" × "}
                                    {cabinet.depth}

                                    {" mm"}

                                </div>

                            </button>
                        );

                    }
                )}

            </div>

        </div>
    );
}