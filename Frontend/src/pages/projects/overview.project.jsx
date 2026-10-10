import { useEffect, useRef, useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';

function ProjectOverview() {

    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [showImport, setShowImport] = useState(false);
    const [projectFile, setProjectFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState("");
    const fileInputRef = useRef(null);

    const fetchProjects = async () => {
        const result = await axios.get(`/api/projects/getAll`);
        setProjects(result.data.projects);
    };

    useEffect(() => {
        let active = true;
        axios.get(`/api/projects/getAll`).then(result => {
            if (active) setProjects(result.data.projects);
        }).catch(error => {
            console.error("Projekte konnten nicht geladen werden:", error);
        });
        return () => {
            active = false;
        };
    }, []);

    const closeImport = () => {
        if (importing) return;
        setShowImport(false);
        setProjectFile(null);
        setImportError("");
    };

    const handleImport = async (event) => {
        event.preventDefault();
        if (!projectFile) {
            setImportError("Bitte wähle eine Projektdatei aus.");
            return;
        }

        setImporting(true);
        setImportError("");
        try {
            const formData = new FormData();
            formData.append("projectFile", projectFile);
            const { data } = await axios.post("/api/projects/import", formData);
            await fetchProjects();
            setShowImport(false);
            setProjectFile(null);
            navigate(`/Projects/${data.projectId}`);
        } catch (error) {
            console.error("Projekt konnte nicht importiert werden:", error);
            setImportError(error.response?.data?.message || "Die Projektdatei konnte nicht importiert werden.");
        } finally {
            setImporting(false);
        }
    };

    return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={2} className="flex-1" />

        <main className="xl:pt-10 pt-5 h-full flex-1 overflow-y-auto">

            <div className="ml-8 flex items-center gap-3">
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

            <div className="rounded-lg mt-4 flex justify-left ml-8 mr-8 overflow-hidden">
                        <table className="w-full table-fixed">
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
                                    <td className="xl:py-4 py-3 px-6">
                                        {project.title}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6">
                                        {project.customer.lastName}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.priority}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.status}
                                    </td>

                                </tr>
                                ))}
                            </tbody>
                        </table>    
                    </div>
        </main>

        {showImport && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                onMouseDown={event => {
                    if (event.target === event.currentTarget) closeImport();
                }}
            >
                <form
                    onSubmit={handleImport}
                    className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">Projekt importieren</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                Wähle ein zuvor exportiertes Projektarchiv aus.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeImport}
                            disabled={importing}
                            aria-label="Import schließen"
                            className="text-2xl leading-none text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="mt-6 flex min-h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 px-4 text-center hover:border-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="text-3xl text-blue-500">↑</span>
                        <span className="mt-2 text-gray-200">
                            {projectFile ? projectFile.name : "Projektdatei auswählen"}
                        </span>
                        <span className="mt-1 text-xs text-gray-500">Dateiformat: .cproject</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".cproject,application/gzip"
                        className="hidden"
                        onChange={event => {
                            setProjectFile(event.target.files?.[0] || null);
                            setImportError("");
                        }}
                    />

                    {importError && (
                        <p className="mt-3 text-sm text-red-400" role="alert">{importError}</p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeImport}
                            disabled={importing}
                            className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={!projectFile || importing}
                            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {importing ? "Projekt wird importiert..." : "Projekt importieren"}
                        </button>
                    </div>
                </form>
            </div>
        )}

    </div>
    </>
    );
}

export default ProjectOverview
