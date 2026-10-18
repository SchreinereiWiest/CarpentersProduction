import { Link, useParams } from "react-router";

/**
 * Replaces dense production editors on phone-sized screens with a useful,
 * navigable explanation. Tablet landscape and desktop views remain untouched.
 */
export default function MobileWorkspaceGuard({ title = "Bearbeitungsansicht" }) {
    const { projectId } = useParams();
    const backTarget = projectId ? `/Projects/${projectId}` : "/Projects";

    return (
        <section className="mobile-workspace-guard" aria-labelledby="mobile-workspace-title">
            <div className="mobile-workspace-guard__card">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-10 text-blue-400">
                    <path fillRule="evenodd" d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v7.5a2.25 2.25 0 0 1-2.25 2.25H13.5v1.5h3a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1 0-1.5h3v-1.5H5.25A2.25 2.25 0 0 1 3 14.25v-7.5Zm1.5 0a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75v-7.5Z" clipRule="evenodd" />
                </svg>
                <h1 id="mobile-workspace-title" className="mt-4 text-xl font-semibold text-white">{title}</h1>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                    Diese Produktionsansicht benötigt mehr Arbeitsfläche. Bitte verwende ein Tablet im Querformat oder einen Laptop.
                </p>
                <p className="mt-2 text-sm text-gray-400">
                    Projekt-, Zeit- und Materialdaten kannst du weiterhin in der Handyansicht nachlesen.
                </p>
                <Link to={backTarget} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500">
                    Zur Projektübersicht
                </Link>
            </div>
        </section>
    );
}
