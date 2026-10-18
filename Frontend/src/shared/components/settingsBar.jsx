

const tabs = [
    {
        id: "company",
        label: "Unternehmen"
    },
    {
        id: "estimation",
        label: "Stundenschätzung"
    },
    {
        id: "ai",
        label: "AI"
    },
    {
        id: "programSettings",
        label: "Programmeinstellungen"
    },
    {
        id: "userInterface",
        label: "Benutzeroberfläche"
    },
    {
        id: "cache",
        label: "Cache"
    },
    {
        id: "storage",
        label: "Storage"
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
    },
    {
        id: "shop",
        label: "Shop"
    }
];

export default function SettingsBar({
    selected,
    onSelect
}) {

    return (
        <nav aria-label="Einstellungsbereiche" className="settings-bar
            h-16
            w-full
            bg-gray-800
            border-b
            border-gray-700
        ">

            <div className="settings-bar__items
                flex
                items-center
                gap-2
                px-3
                h-full
                overflow-x-auto
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
