import { useParams } from 'react-router';
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import TimeControls from "./timeControll.project";
import TimeHistory from "./timehistory.project";
import SideBar from "../../../components/sideBar";
import ProjectBar from "../../../components/projectBar";
import useCompanySettings from "../../../hooks/useCompanySettings";

export default function TimeTracking() {

    const { settings } = useCompanySettings();

    const [entries, setEntries] = useState([]);

    const [activeEntry, setActiveEntry] = useState(null);

    const { projectId } = useParams();

    const loadEntries = useCallback(async () => {

        const { data } = await axios.get(
            `/api/projects/time/${projectId}`
        );

        setEntries(data);

        const running = data.find(
            entry => !entry.endedAt && entry.startedAt
        );

        setActiveEntry(running ?? null);

    }, [projectId]);

    useEffect(() => {
        let mounted = true;

        axios.get(`/api/projects/time/${projectId}`).then(({ data }) => {
            if (!mounted) return;

            setEntries(data);
            setActiveEntry(data.find(entry => !entry.endedAt && entry.startedAt) ?? null);
        });

        return () => {
            mounted = false;
        };
    }, [projectId]);

    return (

        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={7} />
        </div>

        <div className="
            m-4
            grid
            grid-cols-2
            gap-6
            h-full
            overflow-y-auto
        ">

            <TimeControls

                projectId={projectId}

                activeEntry={activeEntry}

                reload={loadEntries}

                workTypes={settings.workTypes}

            />

            <TimeHistory

                entries={entries}

                workTypes={settings.workTypes}

            />

        </div>

        </main>

        </div>

    );

}
