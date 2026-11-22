import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import SideBar from '../../shared/components/sideBar.jsx'
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../app/providers/AuthContext.js';
import ProjectImportDialog from './import/ProjectImportDialog.jsx';
import { getProjectRecords } from '../../shared/projects/project-records.js';
import { formatGermanDate } from '../../shared/utils/date.js';
import {
    ensureGuidedTourDemoProject,
    isGuidedTourDemoProject
} from '../guided-help/guidedTourDemoProject.js';

function ProjectOverview() {

    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [projects, setProjects] = useState([]);
    const [showImport, setShowImport] = useState(false);
    const [loadError, setLoadError] = useState("");
    const onboardingTour = new URLSearchParams(location.search).get("guidedTour") === "onboarding";
    const projectsEndpoint = user?.role === "user"
        ? "/api/projects/getActive"
        : "/api/projects/getAll";

    const prepareProjects = useCallback(async records => {
        const realProjects = (records ?? []).filter(project => !isGuidedTourDemoProject(project));
        if (!onboardingTour || realProjects.length > 0) return realProjects;
        return [await ensureGuidedTourDemoProject()];
    }, [onboardingTour]);

    const fetchProjects = async () => {
        try {
            setProjects(await prepareProjects(await getProjectRecords(projectsEndpoint)));
            setLoadError("");
        } catch (error) {
            console.error("Projekte konnten nicht geladen werden:", error);
            setLoadError("Die Projekte konnten nicht geladen werden. Bitte die Verbindung zum Backend prüfen.");
        }
    };

    useEffect(() => {
        let active = true;
        getProjectRecords(projectsEndpoint).then(prepareProjects).then(projects => {
            if (active) {
                setProjects(projects);
                setLoadError("");
            }
        }).catch(async error => {
            console.error("Projekte konnten nicht geladen werden:", error);
            if (!active) return;
            if (onboardingTour) {
                try {
                    setProjects([await ensureGuidedTourDemoProject()]);
                    setLoadError("");
                    return;
                } catch (demoError) {
                    console.error("Temporäres Rundgangsprojekt konnte nicht angelegt werden:", demoError);
                }
            }
            setLoadError("Die Projekte konnten nicht geladen werden. Bitte die Verbindung zum Backend prüfen.");
        });
        return () => {
            active = false;
        };
    }, [projectsEndpoint, onboardingTour, prepareProjects]);

    const groupedProjects = useMemo(() => {
        const commissions = new Map();
        const standalone = [];
        for (const project of projects ?? []) {
            if (!project.commission?.id) {
                standalone.push(project);
                continue;
            }
            if (!commissions.has(project.commission.id)) {
                commissions.set(project.commission.id, { ...project.commission, projects: [] });
            }
            commissions.get(project.commission.id).projects.push(project);
        }
        return { commissions: [...commissions.values()], standalone };
    }, [projects]);

    const projectRow = project => (
        <tr key={project.id} data-tour-project-route={`/Projects/${project.id}`} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
            onClick={() => {navigate(`/Projects/${project.id}`)}}
        >
            <td data-label="Titel" className="xl:py-4 py-3 px-6">{project.title}</td>
            <td data-label="Kunde" className="xl:py-4 py-3 px-6">
                {project.customer?.id ? (
                    <button
                        type="button"
                        onClick={event => {
                            event.stopPropagation();
                            navigate(`/Kontakte/${project.customer.id}`);
                        }}
                        className="rounded text-left font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        {[project.customer.firstName, project.customer.lastName].filter(Boolean).join(" ") || project.customer.companyName || "Kunde"}
                    </button>
                ) : (project.localOnly ? "Ohne Kunde (lokal)" : "—")}
            </td>
            <td data-label="Start" className="xl:py-4 py-3 px-6 truncate">{formatGermanDate(project.startDate)}</td>
            <td data-label="Priorität" className="xl:py-4 py-3 px-6 truncate">{project.priority}</td>
            <td data-label="Status" className="xl:py-4 py-3 px-6 truncate">{project.status}</td>
        </tr>
    );

    return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={2} className="flex-1" />

        <main className="h-full min-w-0 flex-1 overflow-y-auto pt-4 sm:pt-5 xl:pt-10">

            <div data-tour="projects-actions" className="mx-4 flex flex-wrap items-center gap-3 sm:mx-8">
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

            <div data-tour="projects-list" className="mx-4 mt-4 overflow-hidden rounded-lg sm:mx-8">
                        {loadError && <div role="alert" className="mb-3 rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{loadError}</div>}
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

                                {groupedProjects.commissions.map(commission => (
                                    <Fragment key={commission.id}>
                                        <tr className="border-y border-blue-800/70 bg-blue-950/60">
                                            <td colSpan={5} className="px-6 py-3">
                                                <button type="button" onClick={() => navigate(`/Kommissionen/${commission.id}`)} className="flex w-full items-center justify-between gap-4 text-left hover:text-blue-200">
                                                    <span><span className="font-semibold">Kommission · {commission.title}</span><span className="ml-2 text-xs text-blue-300/70">{commission.commissionNumber || `${commission.projects.length} Projekte`}</span></span>
                                                    <span aria-hidden="true">→</span>
                                                </button>
                                            </td>
                                        </tr>
                                        {commission.projects.map(projectRow)}
                                    </Fragment>
                                ))}
                                {groupedProjects.commissions.length > 0 && groupedProjects.standalone.length > 0 && (
                                    <tr className="border-y border-slate-700 bg-slate-800/90"><td colSpan={5} className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Einzelprojekte</td></tr>
                                )}
                                {groupedProjects.standalone.map(projectRow)}
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
