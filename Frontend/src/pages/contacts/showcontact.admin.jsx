import { useEffect, useRef, useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { Link } from "react-router";

function ShowContacts() {
//Id aus Url params laden
const { userid } = useParams();
const navigate = useNavigate();

const [customer, setCustomer] = useState(null);
const [projects, setProjects] = useState([]);
const [showImport, setShowImport] = useState(false);
const [projectFile, setProjectFile] = useState(null);
const [importing, setImporting] = useState(false);
const [importError, setImportError] = useState("");
const fileInputRef = useRef(null);

useEffect(() => {
let active = true;
Promise.all([
    axios.get(`/api/customers/get/${userid}`),
    axios.get(`/api/projects/getAll/${userid}`)
]).then(([customerResponse, projectsResponse]) => {
    if (!active) return;
    setCustomer(customerResponse.data.customer);
    setProjects(projectsResponse.data.projects);
}).catch(error => {
    console.error("Kontakt konnte nicht geladen werden:", error);
});
return () => {
    active = false;
};
}, [userid]);

const closeImport = () => {
    if (importing) return;
    setShowImport(false);
    setProjectFile(null);
    setImportError("");
};

const handleImport = async event => {
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
        formData.append("customerId", userid);
        const { data } = await axios.post("/api/projects/import", formData);
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

        <SideBar selected={5} className="flex-1" />

        <main className="pt-10 h-full flex-1 overflow-y-auto">

            <div className="justify-left pl-8">
                <div className="relative flex items-left">
                    <h2 className="text-2xl font-bold mt-2">{customer?.firstName} {customer?.lastName}</h2>
                    <div className="relative left-8">
                        <Link to={`/Kontakte/edit/${userid}`}
                            className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        
                        <span className="ml-2 text-gray-300 font-medium">Edit</span>
                        </Link>
                    </div>
                    <div className="absolute left-1/3 mt-2">
                        <h2 className="text-2xl font-bold">Projekte:</h2>
                    </div>
                    <div className="absolute right-8 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowImport(true)}
                            className="bg-gray-700 text-white rounded-full h-12 px-5 flex items-center justify-center hover:bg-gray-600 transition duration-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                <path d="M12 2.25a.75.75 0 0 1 .75.75v10.19l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V3a.75.75 0 0 1 .75-.75Z" />
                                <path d="M3.75 15a.75.75 0 0 1 .75.75v3a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 1 1.5 0v3A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75v-3a.75.75 0 0 1 .75-.75Z" />
                            </svg>
                            <span className="ml-2 text-gray-300 font-medium">Import</span>
                        </button>

                         <Link to={`/Kontakte/NewProject/${userid}`}
                            className="bg-gray-700 text-white rounded-full h-12 px-5 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="size-6">
                            <path fillRule="evenodd"
                                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-gray-300 font-medium">New Project</span>
                        </Link>
                    </div>
                </div>
                <div className="relative flex items-left">
                    <div className="relative items-left w-2/5">
                        <p className="">{customer?.companyName}</p>
                        <p className="">{customer?.email}</p>
                        <p className="">{customer?.phoneMobile}</p>
                        <p className="">{customer?.phoneLandline}</p>
                        <p className="">{customer?.preferredContact}</p>
                        <p className="">{customer?.newsletterOptIn}</p>
                        <p className="">{customer?.customerStatus}</p>
                        <p className="">{customer?.customerRating}</p>
                        <p className="">{customer?.source}</p>

                        {customer?.addresses.map(address => (
                        <div key={address.id} className="mt-4">
                            <p className="">{address.street} {address.houseNumber}</p>
                            <p className="">{address.postalCode} {address.city}</p>
                            <p className="">{address.state}</p>
                            <p className="">{address.country}</p>
                            <p className="">{address.floor}</p>
                            <p className="">{address.parkingInfo}</p>
                        </div>
                    
                        ))}
                    </div> 

                    <div className="rounded-lg absolute left-1/3 mt-4 flex justify-left right-18 overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Title</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">StartDate</th>

                                </tr>
                            </thead>

                            <tbody>

                                {projects.map((project) => (
                                <tr key={project.id} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
                                    onClick={()=> {navigate(`/Projects/${project.id}`)}}
                                    >
                                    <td className="py-4 px-6">
                                        {project.title}
                                    </td>

                                    <td className="py-4 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                </tr>
                                ))}
                            </tbody>
                        </table>    
                    </div>

                </div>
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
                            <h2 className="text-xl font-semibold">Projekt für Kontakt importieren</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                Das Projekt wird {customer?.firstName} {customer?.lastName} zugeordnet.
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

export default ShowContacts;
