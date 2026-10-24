

import { useAuth } from '../../app/providers/AuthContext.js';

const tabs = [
    {
        id: "company",
        label: "Unternehmen"
    },
    {
        id: "estimation",
        label: "Stundenschätzung",
        requiredFeature: "calculation"
    },
    {
        id: "hourlyRates",
        label: "Stundensätze",
        requiredFeature: "calculation",
        excludedFeature: "business-management"
    },
    {
        id: "ai",
        label: "AI",
        requiredFeature: "work-preparation"
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
        label: "Storage",
        requiredFeature: "work-preparation"
    },
    {
        id: "users",
        label: "Benutzer"
    },
    {
        id: "project",
        label: "Projekt",
        requiredFeature: "work-preparation"
    },
    {
        id: "cnc",
        label: "CNC",
        requiredFeature: "work-preparation"
    },
    {
        id: "shop",
        label: "Shop",
        requiredFeature: "shop"
    }
];

export default function SettingsBar({
    selected,
    onSelect
}) {

    const { user } = useAuth();
    const features = new Set(user?.features || []);
    const visibleTabs = tabs.filter(tab =>
        (!tab.requiredFeature || features.has(tab.requiredFeature))
        && (!tab.excludedFeature || !features.has(tab.excludedFeature))
    );

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

                {visibleTabs.map(tab => {

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
