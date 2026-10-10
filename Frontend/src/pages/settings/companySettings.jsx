

import { useState } from "react";

import SideBar from "../../components/sideBar.jsx";
import SettingsBar from "../../components/settingsBar.jsx";

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


export default function CompanySettings() {

    const [
        selectedSection,
        setSelectedSection
    ] = useState("company");


    const renderSection = () => {

        switch (selectedSection) {

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


            case "company":
                return (
                    <CompanySettingsPanel />
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
                            setSelectedSection
                        }
                    />

                </div>


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
