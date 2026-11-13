import { useParams } from 'react-router';
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import TimeControls from "./timeControll.jsx";
import TimeHistory from "./timehistory.jsx";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectBar from "../../../shared/components/projectBar.jsx";
import useCompanySettings from "../../../shared/hooks/useCompanySettings.js";
import { getLocalProject } from "../../../shared/offline/local-projects.js";

export default function TimeTracking() {

    const { settings } = useCompanySettings();

    const [entries, setEntries] = useState([]);

    const [activeEntry, setActiveEntry] = useState(null);

    const [localOnly, setLocalOnly] = useState(false);

    const { projectId } = useParams();

    const loadEntries = useCallback(async () => {

        if (await getLocalProject(projectId)) {
            setLocalOnly(true);
            setEntries([]);
            setActiveEntry(null);
            return;
        }

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

        const timeoutId = window.setTimeout(() => {
            loadEntries().catch(error => {
                if (!mounted) return;
                console.error("Zeiteinträge konnten nicht geladen werden", error);
            });
        }, 0);

        return () => {
            mounted = false;
            window.clearTimeout(timeoutId);
        };
    }, [loadEntries]);

    return (

        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={7} />
        </div>

        <div className="
            m-2
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            space-y-3
            sm:m-4
            lg:grid
            lg:grid-cols-2
            lg:gap-6
            lg:space-y-0
        ">

            {localOnly ? (
                <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-5 text-sm text-amber-200">
                    Die Zeiterfassung ist verfügbar, sobald das lokale Projekt in den Projekteinstellungen einem Kunden zugewiesen und hochgeladen wurde.
                </div>
            ) : <TimeControls

                projectId={projectId}

                activeEntry={activeEntry}

                reload={loadEntries}

                workTypes={settings.workTypes}

            />}

            <TimeHistory

                entries={entries}

                workTypes={settings.workTypes}

            />

        </div>

        </main>

        </div>

    );

}
