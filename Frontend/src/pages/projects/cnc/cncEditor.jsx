import CncPartSidebar from "./cncPartsSidebar";
import CncViewport from "./cncViewport";
import CncPropertiesSidebar from "./cncPropertiesSidebar";
import { groupCncParts } from "./groupCncParts.js";
import React, {useState, useEffect,} from "react";
import { useLocation, useParams } from "react-router";
import ProjectBar from '../../../components/projectBar.jsx';
import SideBar from '../../../components/sideBar.jsx';
import axios from "axios";

export default function CncEditor() {

    const { projectId } = useParams();

    const [partList, setPartList] =
        useState([]);

    const [groups, setGroups] =
        useState([]);

    const [selectedGroupId, setSelectedGroupId] =
        useState(null);

    const [selectedPart, setSelectedPart] =
        useState(null);

    const selectedGroup =
        groups.find(
            group =>
                group.id === selectedGroupId
    );

    const [
    selectedOperation,
    setSelectedOperation
    ] = useState(null);

        const handleSelectPart = (part) => {

        setSelectedPart(part);

        setSelectedOperation(null);
    };

    const handleSelectOperation = (
        operation
    ) => {

        setSelectedOperation(
            operation
        );
    };
    useEffect(() => {

    if (!projectId) {
        return;
    }

    const loadPartList = async () => {

        try {

            const response = await axios.get(

                    `/api/projects/generated/${projectId}/list`,

                    {
                        withCredentials: true
                    }

                );

                const {

                    exists,

                    downloadUrl,

                } = response.data;

                console.log(response.data);


                // Datei existiert bereits
                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();

                        setPartList(data);

                        const grouped =
                groupCncParts(data);

            setGroups(grouped);

            if (grouped.length > 0) {

                setSelectedGroupId(
                    grouped[0].id
                );

                if (
                    grouped[0].parts.length > 0
                ) {
                    setSelectedPart(
                        grouped[0].parts[0]
                    );
                }
            }

                        return;
                    } catch (error) {
                        console.warn("cant fetch data, try new upload", error);
                    }

                }

        } catch (error) {

            console.error(
                "PartList konnte nicht geladen werden:",
                error
            );
        }
    };

    loadPartList();

    }, [projectId]);

    return (
    <div className="
        bg-gray-900
        text-white
        h-screen
        flex
        overflow-hidden
    ">

        <SideBar selected={2} />

        <main className="
            flex-1
            flex
            flex-col
            min-w-0
            overflow-hidden
        ">

            {/* Project Bar */}

            <div className="
                shrink-0
                bg-gray-900
                border-b
                border-gray-700
            ">
                <ProjectBar selected={6} />
            </div>


            {/* Hauptbereich */}

            <div className="
                flex-1
                min-h-0
            ">

                <div className="
                    grid
                    h-full
                    min-h-0
                    grid-cols-[280px_minmax(0,1fr)]
                ">

                    {/* ================================================= */}
                    {/* LINKE SIDEBAR */}
                    {/* ================================================= */}

                    <CncPartSidebar
                        groups={groups}
                        selectedGroupId={selectedGroupId}
                        setSelectedGroupId={
                            setSelectedGroupId
                        }
                        selectedPart={selectedPart}
                        setSelectedPart={
                            handleSelectPart
                        }
                    />


                    {/* ================================================= */}
                    {/* ARBEITSBEREICH */}
                    {/* ================================================= */}

                    <main className="
                        min-w-0
                        min-h-0
                        grid
                        grid-rows-[minmax(0,1fr)_minmax(0,1fr)]
                        bg-gray-900
                    ">


                        {/* ============================================= */}
                        {/* OBEN: VIEWPORT */}
                        {/* ============================================= */}

                        <section className="
                            min-w-0
                            min-h-0
                            flex
                            flex-col
                            overflow-hidden
                            border-b
                            border-gray-700
                        ">

                            {/* Toolbar */}

                            <div className="
                                h-14
                                shrink-0
                                border-b
                                border-gray-700
                                bg-gray-900
                                flex
                                items-center
                                gap-2
                                px-3
                            ">

                                <div className="
                                    text-sm
                                    text-gray-300
                                ">
                                    CNC Bearbeitung
                                </div>

                            </div>


                            {/* SVG */}

                            <div className="
                                flex-1
                                min-h-0
                            ">

                                <div className="
                                    relative
                                    h-full
                                    w-full
                                    overflow-hidden
                                ">

                                    <CncViewport
                                        part={selectedPart}
                                        selectedOperationId={
                                            selectedOperation?.id
                                        }
                                        onSelectPart={
                                            handleSelectPart
                                        }
                                        onSelectOperation={
                                            handleSelectOperation
                                        }
                                    />

                                </div>

                            </div>

                        </section>


                        {/* ============================================= */}
                        {/* UNTEN: PROPERTIES */}
                        {/* ============================================= */}

                        <section className="
                            min-w-0
                            min-h-0
                            overflow-hidden
                        ">

                            <CncPropertiesSidebar
                                part={selectedPart}
                                group={selectedGroup}
                                selectedOperation={
                                    selectedOperation
                                }
                            />

                        </section>

                    </main>

                </div>

            </div>

        </main>

    </div>
);

}