import { useEffect, useState } from 'react'
import SideBar from '../../shared/components/sideBar.jsx'
import { useNavigate } from 'react-router';
import { useAuth } from '../../app/providers/AuthContext.js';
import ProjectImportDialog from './import/ProjectImportDialog.jsx';
import { getProjectRecords } from '../../shared/projects/project-records.js';

function ProjectOverview() {

    const navigate = useNavigate();
    const { user } = useAuth();

    const [projects, setProjects] = useState([]);
    const [showImport, setShowImport] = useState(false);
    const projectsEndpoint = user?.role === "user"
        ? "/api/projects/getActive"
        : "/api/projects/getAll";

    const fetchProjects = async () => {
        setProjects(await getProjectRecords(projectsEndpoint));
    };

    useEffect(() => {
        let active = true;
        getProjectRecords(projectsEndpoint).then(projects => {
            if (active) setProjects(projects);
        }).catch(error => {
            console.error("Projekte konnten nicht geladen werden:", error);
        });
        return () => {
            active = false;
        };
    }, [projectsEndpoint]);

    return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={2} className="flex-1" />

        <main className="h-full min-w-0 flex-1 overflow-y-auto pt-4 sm:pt-5 xl:pt-10">

            <div className="mx-4 flex flex-wrap items-center gap-3 sm:mx-8">
            <button
             onClick={() => navigate(`/projects/create`, {
                    state: {
                        mode: "create",
                    }
                })}
            className="
                flex
                items-center
                gap-3
                rounded-lg
                border
                border-gray-700
                bg-gray-800
                px-4
                py-2
                whitespace-nowrap
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-700
                hover:text-white
            "
        >
            Create Project
        </button>

        <button
            type="button"
            onClick={() => setShowImport(true)}
            className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 whitespace-nowrap text-gray-400 transition-all duration-200 hover:bg-gray-700 hover:text-white"
        >
            Import Project
        </button>
        </div>

            <div className="mx-4 mt-4 overflow-hidden rounded-lg sm:mx-8">
                        <table className="responsive-card-table w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Title</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Customer</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">StartDate</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">priority</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Status</th>

                                </tr>
                            </thead>

                            <tbody>

                                {projects?.map((project) => (
                                <tr key={project.id} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
                                    onClick={()=> {navigate(`/Projects/${project.id}`)}}
                                    >
                                    <td data-label="Titel" className="xl:py-4 py-3 px-6">
                                        {project.title}
                                    </td>

                                    <td data-label="Kunde" className="xl:py-4 py-3 px-6">
                                        {project.customer?.lastName ?? (project.localOnly ? "Ohne Kunde (lokal)" : "—")}
                                    </td>

                                    <td data-label="Start" className="xl:py-4 py-3 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                    <td data-label="Priorität" className="xl:py-4 py-3 px-6 truncate">
                                        {project.priority}
                                    </td>

                                    <td data-label="Status" className="xl:py-4 py-3 px-6 truncate">
                                        {project.status}
                                    </td>

                                </tr>
                                ))}
                            </tbody>
                        </table>    
                    </div>
        </main>

        <ProjectImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            onImported={async projectId => {
                await fetchProjects();
                setShowImport(false);
                navigate(`/Projects/${projectId}`);
            }}
        />

    </div>
    </>
    );
}

export default ProjectOverview
