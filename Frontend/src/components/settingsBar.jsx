

const tabs = [
    {
        id: "company",
        label: "Unternehmen"
    },
    {
        id: "cache",
        label: "Cache"
    },
    {
        id: "users",
        label: "Benutzer"
    },
    {
        id: "project",
        label: "Projekt"
    },
    {
        id: "cnc",
        label: "CNC"
    }
];

export default function SettingsBar({
    selected,
    onSelect
}) {

    return (
        <nav className="
            h-16
            w-full
            bg-gray-800
            border-b
            border-gray-700
        ">

            <div className="
                flex
                items-center
                gap-2
                px-3
                h-full
            ">

                {tabs.map(tab => {

                    const active =
                        selected === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                                onSelect(tab.id)
                            }
                            className={`
                                h-11
                                rounded-lg
                                px-4
                                text-sm
                                transition

                                ${
                                    active
                                        ? `
                                            bg-gray-900
                                            text-white
                                        `
                                        : `
                                            text-gray-400
                                            hover:bg-gray-700
                                            hover:text-gray-200
                                        `
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    );
                })}

            </div>

        </nav>
    );
}
