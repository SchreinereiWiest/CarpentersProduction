import { useParams } from 'react-router';
import { useEffect, useState } from "react";
import axios from "axios";

import TimeControls from "./timeControll.project";
import TimeHistory from "./timehistory.project";
import SideBar from "../../../../components/sideBar";
import ProjectBar from "../../../../components/projectBar";

export const workTypes = [

    {
        id: "cutting",
        label: "Zuschnitt"
    },

    {
        id: "edging",
        label: "Bekantung"
    },

    {
        id: "cnc",
        label: "CNC"
    },

    {
        id: "assembly",
        label: "Zusammenbau"
    },

    {
        id: "finishing",
        label: "Finalisierung"
    },

    {
        id: "installation",
        label: "Montage"
    }

];

export default function TimeTracking() {

    const [entries, setEntries] = useState([]);

    const [activeEntry, setActiveEntry] = useState(null);

    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    async function loadEntries() {

        const { data } = await axios.get(
            `/api/projects/time/${projectId}`
        );

        setEntries(data);

        const running = data.find(
            entry => !entry.endedAt
        );

        setActiveEntry(running ?? null);

    }

    useEffect(() => {
        const fetchProject = async () => {
            const { data } = await axios.get(`/api/projects/get/${projectId}`);
            const projectData = data.project;
            setProject(data.project);

            const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
            setCustomer(customerdata.data.customer);

        };

        fetchProject();
        loadEntries();
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
        ">

            <TimeControls

                projectId={projectId}

                activeEntry={activeEntry}

                reload={loadEntries}

            />

            <TimeHistory

                entries={entries}

            />

        </div>

        </main>

        </div>

    );

}