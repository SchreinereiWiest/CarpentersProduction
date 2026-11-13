

import { useState } from "react";
import { useSearchParams } from "react-router";

import SideBar from "../../shared/components/sideBar.jsx";
import SettingsBar from "../../shared/components/settingsBar.jsx";

import CompanySettingsPanel
    from "./panels/companySettingsPanel.jsx";

import CacheSettingsPanel
    from "./panels/cacheSettingsPanel.jsx";

import UserSettingsPanel
    from "./panels/userSettingsPanel.jsx";

import CabinetSettingsPanel
    from "./panels/cabinetSettingsPanel.jsx";

import CncSettingsPanel
    from "./panels/cncSettingsPanel.jsx";

import ShopSettingsPanel
    from "./panels/shopSettingsPanel.jsx";

import ProgramSettingsPanel
    from "./panels/programSettingsPanel.jsx";

import UserInterfaceSettingsPanel
    from "./panels/userInterfaceSettingsPanel.jsx";

import EstimationSettingsPanel
    from "./panels/estimationSettingsPanel.jsx";
import AttachmentSearchSettingsPanel
    from "./panels/attachmentSearchSettingsPanel.jsx";
import StorageSettingsPanel
    from "./panels/storageSettingsPanel.jsx";
import HourlyRatesSettingsPanel
    from "./panels/hourlyRatesSettingsPanel.jsx";
import { useAuth } from "../../app/providers/AuthContext.js";
import PaperlessSettingsPanel from "./panels/paperlessSettingsPanel.jsx";
import ContactHistorySettingsPanel from "./panels/contactHistorySettingsPanel.jsx";
import { advancedSettingsTabs } from "./advancedSettingsTabs.js";


export default function CompanySettings() {

    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const [
        selectedSection,
        setSelectedSection
    ] = useState(() => searchParams.get("section") === "advanced" ? "advanced" : "userInterface");

    const [selectedAdvancedSection, setSelectedAdvancedSection] = useState(() => searchParams.get("tab") || "estimation");
    const features = new Set(user?.features || []);
    const visibleAdvancedTabs = advancedSettingsTabs.filter(tab =>
        (!tab.requiredFeature || features.has(tab.requiredFeature))
        && (!tab.excludedFeature || !features.has(tab.excludedFeature))
    );

    const selectPrimarySection = section => {
        setSelectedSection(section);
        if (section === "advanced" && !visibleAdvancedTabs.some(tab => tab.id === selectedAdvancedSection)) {
            setSelectedAdvancedSection(visibleAdvancedTabs[0]?.id ?? "estimation");
        }
    };


    const renderSection = () => {

        const section = selectedSection === "advanced" ? selectedAdvancedSection : selectedSection;

        switch (section) {

            case "users":

                return (
                    <UserSettingsPanel />
                );


            case "project":

                return (
                    <CabinetSettingsPanel />
                );


            case "cnc":

                return (
                    <CncSettingsPanel />
                );


            case "cache":

                return (
                    <CacheSettingsPanel />
                );

            case "shop":

                return (
                    <ShopSettingsPanel />
                );


            case "company":
                return (
                    <CompanySettingsPanel />
                );

            case "estimation":
                return (
                    <EstimationSettingsPanel />
                );

            case "hourlyRates":
                return (
                    <HourlyRatesSettingsPanel />
                );

            case "ai":
                return (
                    <AttachmentSearchSettingsPanel />
                );

            case "documents":
                return (
                    <PaperlessSettingsPanel />
                );

            case "contactHistory":
                return (
                    <ContactHistorySettingsPanel />
                );

            case "programSettings":
                return (
                    <ProgramSettingsPanel />
                );

            case "userInterface":
                return (
                    <UserInterfaceSettingsPanel />
                );

            case "storage":
                return (
                    <StorageSettingsPanel />
                );


            default:

                return (
                    <CompanySettingsPanel />
                );
        }
    };


    return (
        <div className="
            bg-gray-900
            text-white
            h-dvh
            w-full
            flex
            overflow-hidden
        ">

            <SideBar
                selected={8}
            />


            <main className="
                flex-1
                flex
                flex-col
                min-w-0
                overflow-hidden
            ">

                {/* Settings Navigation */}

                <div className="
                    shrink-0
                ">

                    <SettingsBar
                        selected={
                            selectedSection
                        }
                        onSelect={
                            selectPrimarySection
                        }
                    />

                </div>

                {selectedSection === "advanced" && (
                    <nav aria-label="Advanced Settings" className="shrink-0 border-b border-gray-700 bg-gray-900">
                        <div className="flex h-12 items-end gap-1 overflow-x-auto px-4">
                            {visibleAdvancedTabs.map(tab => {
                                const active = selectedAdvancedSection === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-current={active ? "page" : undefined}
                                        onClick={() => setSelectedAdvancedSection(tab.id)}
                                        className={`h-full whitespace-nowrap border-b-2 px-4 text-sm font-medium transition ${active
                                            ? "border-blue-500 text-blue-400"
                                            : "border-transparent text-gray-500 hover:text-gray-300"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                )}


                {/* Content */}

                <div className="
                    flex-1
                    min-h-0
                    overflow-hidden
                ">

                    {renderSection()}

                </div>

            </main>

        </div>
    );
}
