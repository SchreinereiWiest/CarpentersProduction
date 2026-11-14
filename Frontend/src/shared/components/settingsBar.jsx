

import { useAuth } from '../../app/providers/AuthContext.js';
import { canAccessRequiredRole } from '../../app/routing/roleAuthorization.js';
import { primarySettingsTabs } from './settings-tabs.js';

export default function SettingsBar({
    selected,
    onSelect
}) {

    const { user } = useAuth();
    const features = new Set(user?.features || []);
    const visibleTabs = primarySettingsTabs.filter(tab =>
        (!tab.requiredFeature || features.has(tab.requiredFeature))
        && (!tab.excludedFeature || !features.has(tab.excludedFeature))
        && canAccessRequiredRole(user?.role, tab.requiredRole)
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

                    const active = selected === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                                onSelect(tab.id)
                            }
                            aria-current={active ? "page" : undefined}
                            className={`
                                h-11
                                rounded-lg
                                px-4
                                text-sm
                                transition
                                ${
                                    active
                                        ? `bg-gray-900 text-white`
                                        : `
                                            text-gray-400
                                            hover:bg-gray-700
                                            hover:text-gray-200
                                        `
                                }
                            `}
                        >
                            <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                    );
                })}

            </div>

        </nav>
    );
}
