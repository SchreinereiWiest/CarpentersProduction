import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router";

import { useAuth } from "../../../app/providers/AuthContext.js";
import SideBar from "../../../shared/components/sideBar.jsx";
import { loadCompanySettings } from "../../../shared/settings/company-settings.js";
import { HOME_MODULES, normalizeHomePreferences } from "@Engine/dashboard/home.mjs";

const roleLabels = { user: "Mitarbeiter", manager: "Manager", admin: "Administrator" };
const dayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const timeFormatter = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const currencyFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const dateKey = value => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(value));
const addDays = (value, amount) => {
    const date = new Date(`${value}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
};
const projectLabel = project => `${project?.projectNumber ? `${project.projectNumber} · ` : ""}${project?.title || "Projekt"}`;
const eventLabel = event => event.project ? `${event.title} · ${projectLabel(event.project)}` : event.title;

function EmptyState({ children }) {
    return <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">{children}</p>;
}

function Module({ title, eyebrow, action, children }) {
    return <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-800/55 p-5 shadow-lg shadow-black/10">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">{eyebrow}</p><h2 className="mt-1 text-lg font-semibold text-slate-100">{title}</h2></div>
            {action}
        </header>
        {children}
    </section>;
}

function AssignmentModule({ assignments }) {
    return <Module title="Meine Aufträge" eyebrow="Zuweisungen" action={<Link to="/Projects" className="text-xs text-blue-300 hover:underline">Alle Projekte</Link>}>
        {!assignments.length ? <EmptyState>Dir sind aktuell keine Aufträge zugewiesen.</EmptyState> : <div className="space-y-3">
            {assignments.map(assignment => <Link key={assignment.id} to={`/Projects/${assignment.project.id}`} className="block rounded-xl border border-slate-700 bg-slate-900/65 p-4 transition hover:border-blue-700 hover:bg-slate-900">
                <div className="flex items-start justify-between gap-3"><strong className="text-sm text-blue-200">{projectLabel(assignment.project)}</strong><span className="rounded-full bg-blue-950 px-2 py-1 text-[10px] uppercase text-blue-300">{assignment.project.status}</span></div>
                {assignment.info && <p className="mt-2 text-sm leading-5 text-slate-300">{assignment.info}</p>}
                {assignment.calendarEvent && <p className="mt-2 text-xs text-slate-500">Geplant: {dateTimeFormatter.format(new Date(assignment.calendarEvent.startAt))} – {dateTimeFormatter.format(new Date(assignment.calendarEvent.endAt))}</p>}
            </Link>)}
        </div>}
    </Module>;
}

function AppointmentModule({ events, admin }) {
    return <Module title={admin ? "Alle Termine dieser Woche" : "Meine Termine dieser Woche"} eyebrow="Kalender" action={<Link to="/Calendar" className="text-xs text-blue-300 hover:underline">Kalender öffnen</Link>}>
        {!events.length ? <EmptyState>Für diese Woche sind keine Termine eingetragen.</EmptyState> : <div className="space-y-2">
            {events.map(event => <div key={event.id} className="flex gap-3 rounded-xl bg-slate-900/65 p-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-400" />
                <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{eventLabel(event)}</p><p className="mt-1 text-xs text-slate-500">{event.allDay ? dayFormatter.format(new Date(event.startAt)) : dateTimeFormatter.format(new Date(event.startAt))}</p></div>
            </div>)}
        </div>}
    </Module>;
}

function WeekModule({ start, events }) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    const today = dateKey(new Date());
    return <Module title="Kompakte Wochenübersicht" eyebrow="Diese Woche" action={<Link to="/Calendar" className="text-xs text-blue-300 hover:underline">Details im Kalender</Link>}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {days.map(day => {
                const dayEvents = events.filter(event => dateKey(event.startAt) <= day && dateKey(new Date(new Date(event.endAt).getTime() - 1)) >= day);
                return <div key={day} className={`min-h-32 rounded-xl border p-3 ${day === today ? "border-blue-500 bg-blue-950/30" : "border-slate-700 bg-slate-900/55"}`}>
                    <p className={`text-xs font-semibold ${day === today ? "text-blue-300" : "text-slate-400"}`}>{dayFormatter.format(new Date(`${day}T12:00:00Z`))}</p>
                    <div className="mt-3 space-y-2">{dayEvents.length ? dayEvents.slice(0, 4).map(event => <div key={event.id} title={eventLabel(event)} className="rounded-lg border-l-2 border-blue-500 bg-slate-800 px-2 py-1.5"><p className="truncate text-[11px] font-medium text-slate-200">{event.title}</p><p className="text-[10px] text-slate-500">{event.allDay ? "Ganztägig" : timeFormatter.format(new Date(event.startAt))}</p></div>) : <p className="text-[11px] text-slate-600">Frei</p>}</div>
                </div>;
            })}
        </div>
    </Module>;
}

function ManagerDocumentsModule({ documents }) {
    return <Module title="Zu bearbeitende Dokumente" eyebrow="DMS" action={<Link to="/Documents" className="text-xs text-blue-300 hover:underline">Dokumente öffnen</Link>}>
        {!documents.length ? <EmptyState>Dir sind keine Dokumente zur Bearbeitung zugewiesen.</EmptyState> : <div className="space-y-2">{documents.map(document => <Link key={document.id} to={`/Documents?document=${document.id}`} className="block rounded-xl bg-slate-900/65 p-3 hover:bg-slate-900"><p className="truncate text-sm font-medium text-violet-200">{document.title}</p><p className="mt-1 truncate text-xs text-slate-500">{document.documentType || "Dokument"}{document.project ? ` · ${projectLabel(document.project)}` : ""}</p></Link>)}</div>}
    </Module>;
}

function PurchasesModule({ purchases }) {
    const total = purchases.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.netPrice) || 0), 0);
    return <Module title="Freigegebene Einkäufe" eyebrow="Shop" action={<Link to="/Purchasing" className="text-xs text-blue-300 hover:underline">Zum Einkauf</Link>}>
        {!purchases.length ? <EmptyState>Keine freigegebenen Einkäufe warten auf Bestellung.</EmptyState> : <><div className="space-y-2">{purchases.slice(0, 8).map(item => <div key={item.sourceKey} className="rounded-xl bg-slate-900/65 p-3"><div className="flex justify-between gap-3"><p className="truncate text-sm text-slate-200">{item.name}</p><span className="shrink-0 text-xs text-slate-400">{item.quantity} {item.unit}</span></div><p className="mt-1 truncate text-xs text-slate-500">{item.supplierName}{item.project ? ` · ${projectLabel(item.project)}` : " · Allgemeiner Einkauf"}</p></div>)}</div><p className="mt-3 text-right text-xs text-slate-400">Erfasster Nettowert: <strong className="text-slate-200">{currencyFormatter.format(total)}</strong></p></>}
    </Module>;
}

function DeliveriesModule({ deliveries }) {
    return <Module title="Offene Lieferungen" eyebrow="Bestellungen & DMS" action={<Link to="/Documents" className="text-xs text-blue-300 hover:underline">Auftragsbestätigungen</Link>}>
        {!deliveries.length ? <EmptyState>Keine offenen Lieferungen mit verknüpfter Auftragsbestätigung.</EmptyState> : <div className="space-y-3">{deliveries.map(delivery => <div key={delivery.project.id} className="rounded-xl border border-slate-700 bg-slate-900/65 p-4"><p className="font-medium text-slate-200">{projectLabel(delivery.project)}</p><p className="mt-1 text-xs text-slate-500">{delivery.items.length} offene Position{delivery.items.length === 1 ? "" : "en"}</p><Link to={`/Documents?document=${delivery.confirmation.id}`} className="mt-3 block truncate text-xs text-violet-300 hover:underline">Auftragsbestätigung: {delivery.confirmation.title} →</Link></div>)}</div>}
    </Module>;
}

function DocumentInboxModule({ documents, tags }) {
    const accepted = new Set(tags.map(tag => tag.trim().toLocaleLowerCase("de-DE")).filter(Boolean));
    const visible = documents.filter(document => [document.documentType, ...(document.tags || [])].some(value => accepted.has(String(value || "").trim().toLocaleLowerCase("de-DE"))));
    return <Module title="Dokumenteingang" eyebrow="Konfigurierte DMS-Tags" action={<Link to="/Documents" className="text-xs text-blue-300 hover:underline">Eingang öffnen</Link>}>
        {!visible.length ? <EmptyState>Keine passenden Dokumente im Eingang.</EmptyState> : <div className="space-y-2">{visible.map(document => <Link key={document.id} to={`/Documents?document=${document.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/65 p-3 hover:bg-slate-900"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{document.title}</p><p className="mt-1 truncate text-xs text-slate-500">{document.correspondent || "Ohne Korrespondent"}</p></div><span className="shrink-0 rounded-full bg-violet-950 px-2 py-1 text-[10px] text-violet-300">{document.documentType || document.tags?.find(tag => accepted.has(String(tag).trim().toLocaleLowerCase("de-DE"))) || "Dokument"}</span></Link>)}</div>}
    </Module>;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [companySettings, setCompanySettings] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([axios.get("/api/dashboard"), loadCompanySettings()])
            .then(([dashboardResponse, settings]) => {
                if (!active) return;
                setDashboard(dashboardResponse.data);
                setCompanySettings(settings);
            })
            .catch(requestError => active && setError(requestError.response?.data?.message || "Die Startseite konnte nicht geladen werden."));
        return () => { active = false; };
    }, []);

    const preferences = useMemo(() => normalizeHomePreferences(dashboard?.preferences?.home, user?.role), [dashboard?.preferences?.home, user?.role]);
    const moduleLabels = new Map(HOME_MODULES.map(module => [module.id, module.label]));
    const renderModule = id => ({
        assignments: <AssignmentModule assignments={dashboard.assignments || []} />,
        appointments: <AppointmentModule events={dashboard.events || []} admin={user?.role === "admin"} />,
        week: <WeekModule start={dashboard.week.start} events={dashboard.events || []} />,
        managerDocuments: <ManagerDocumentsModule documents={dashboard.assignedDocuments || []} />,
        approvedPurchases: <PurchasesModule purchases={dashboard.releasedPurchases || []} />,
        openDeliveries: <DeliveriesModule deliveries={dashboard.openDeliveries || []} />,
        documentInbox: <DocumentInboxModule documents={dashboard.inboxDocuments || []} tags={companySettings?.userInterface?.home?.documentTags || []} />
    })[id];

    return <div className="flex h-dvh w-full overflow-hidden bg-slate-950 text-white">
        <SideBar selected={0} />
        <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1600px] p-5 sm:p-7 lg:p-9">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{roleLabels[user?.role] || "Startseite"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Arbeitsübersicht</h1><p className="mt-2 text-sm text-slate-400">Aufträge, Termine und offene Vorgänge an einem Ort.</p></div>
                    <Link to="/CompanySettings?section=userInterface&uitab=home" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:border-blue-700 hover:text-white">Startseite bearbeiten</Link>
                </header>

                {error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/35 p-4 text-sm text-red-300">{error}</p>}
                {!dashboard && !error && <p className="mt-10 text-sm text-slate-500">Arbeitsübersicht wird geladen …</p>}

                {dashboard && <>
                    {(dashboard.assignments || []).length > 0 && <div role="status" className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-800 bg-blue-950/45 p-4"><div><p className="font-semibold text-blue-100">Neue Arbeitszuweisung</p><p className="mt-1 text-sm text-blue-300">{dashboard.assignments.length} zugewiesene{dashboard.assignments.length === 1 ? "r Auftrag" : " Aufträge"} auf deiner Startseite.</p></div><span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold">Notification</span></div>}
                    <div className="mt-7 grid gap-5 xl:grid-cols-2">
                        {preferences.order.filter(id => !preferences.hidden.includes(id)).map(id => <div key={id} className={id === "week" ? "xl:col-span-2" : ""} aria-label={moduleLabels.get(id)}>{renderModule(id)}</div>)}
                    </div>
                </>}
            </div>
        </main>
    </div>;
}
