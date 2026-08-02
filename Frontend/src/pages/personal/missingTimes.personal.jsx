export default function MissingTimes({

    entries,
    selected,
    setSelected

}) {

    console.log("MissingTimes entries:", entries);

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

                {

                    entries?.map(entry => {

                        const active =
                            selected?.id === entry.id;

                        return (

                            <button

                                key={entry.id}

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

                                    {entry.project}

                                </div>

                                <div className="
                                    text-sm
                                    text-gray-400
                                ">

                                    {entry.workType}

                                </div>

                                <div className="
                                    mt-2
                                    text-blue-300
                                    font-medium
                                ">

                                    {Math.round(entry.duration / 60)} min

                                </div>

                            </button>

                        );

                    })

                }

            </div>

        </div>

    );

}