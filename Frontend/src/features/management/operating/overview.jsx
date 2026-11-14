import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getWorkTypeLabel } from "../../../shared/settings/company-settings.js";
import { useManagement } from "../hooks/useManagement.js";
import { buildEmployeeMetrics } from "../utils/workforceMetrics.js";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
const plusDays = (value, days) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};
const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Ohne Kundenname";
const inputClass = "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-blue-500";
const displayDate = value => new Date(value).toLocaleDateString("de-DE");
const displayInclusiveEnd = value => {
  const date = new Date(value);
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString("de-DE");
};
const hours = minutes => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format((minutes || 0) / 60)} h`;
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export default function ManagementOverview() {
  const { workspace, companySettings, year, busy, request } = useManagement();
  const navigate = useNavigate();
  const [form, setForm] = useState({ assigneeId: "", projectId: "", info: "" });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => workspace.employees.find(item => item.isActive)?.id || workspace.employees[0]?.id || "");
  const assignmentByEmployee = useMemo(() => workspace.assignments.reduce((groups, item) => {
    (groups[item.assigneeId] ||= []).push(item);
    return groups;
  }, {}), [workspace.assignments]);
  const assignedProjectIds = new Set(workspace.assignments.map(item => item.projectId));
  const activeEmployees = workspace.employees.filter(item => item.isActive);
  const profile = (workspace.employeeProfiles || []).find(item => item.userId === selectedEmployeeId);
  const profileKey = `${selectedEmployeeId}:${profile?.updatedAt || "new"}`;
  const [profileState, setProfileState] = useState(() => ({ key: profileKey, vacationDays: profile?.vacationDays ?? 30, annualSalary: profile?.annualSalary ?? 0 }));
  const profileDraft = profileState.key === profileKey
    ? profileState
    : { key: profileKey, vacationDays: profile?.vacationDays ?? 30, annualSalary: profile?.annualSalary ?? 0 };
  const selectedEmployee = workspace.employees.find(item => item.id === selectedEmployeeId);
  const metrics = useMemo(() => buildEmployeeMetrics({
    employeeId: selectedEmployeeId,
    year,
    settings: companySettings,
    timeSummary: workspace.timeSummary || [],
    vacationEvents: workspace.vacationEvents || [],
    vacationDays: profileDraft.vacationDays
  }), [companySettings, profileDraft.vacationDays, selectedEmployeeId, workspace.timeSummary, workspace.vacationEvents, year]);
  const setProfileValue = (key, value) => setProfileState({ ...profileDraft, key: profileKey, [key]: value });

  const editAssignment = assignment => setForm({
    assigneeId: assignment.assigneeId,
    projectId: assignment.projectId,
    info: assignment.info || ""
  });
  const save = async event => {
    event.preventDefault();
    if (await request("post", "/assignments", form, "Auftrag wurde zugewiesen.")) {
      setForm({ assigneeId: form.assigneeId, projectId: "", info: "" });
    }
  };
  const openCalendarPlanning = (assignment, project, employee) => {
    const schedule = (workspace.projectSchedules || []).find(item => item.projectId === project.id);
    const preliminaryStart = String(schedule?.plannedStart || project.startDate || today()).slice(0, 10);
    const preliminaryEnd = String(schedule?.plannedEnd || project.installationDate || plusDays(preliminaryStart, 7)).slice(0, 10);
    navigate(`/Calendar?view=month&date=${preliminaryStart}`, { state: { projectPeriod: {
      assignmentId: assignment.id,
      projectId: project.id,
      projectTitle: project.title,
      assigneeId: employee.id,
      assigneeName: employee.name,
      info: assignment.info || "",
      preliminaryStart,
      preliminaryEnd
    } } });
  };

  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric label="Aktive Mitarbeitende" value={activeEmployees.length} />
      <Metric label="Laufende Zuweisungen" value={workspace.assignments.length} />
      <Metric label="Noch nicht zugewiesene Projekte" value={workspace.projects.filter(item => !assignedProjectIds.has(item.id)).length} />
    </div>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Auftrag zuweisen</h1>
        <p className="mt-1 text-sm text-gray-400">Ein Projekt kann mehreren Mitarbeitenden zugewiesen werden. Das Infofeld dokumentiert Umfang, Übergaben oder bereits erledigte Arbeiten.</p>
      </div>
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1fr)_minmax(280px,2fr)_auto] lg:items-end">
        <Field label="Mitarbeiter">
          <select required value={form.assigneeId} onChange={event => setForm(current => ({ ...current, assigneeId: event.target.value }))} className={inputClass}>
            <option value="">Auswählen …</option>
            {activeEmployees.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Auftrag / Projekt">
          <select required value={form.projectId} onChange={event => setForm(current => ({ ...current, projectId: event.target.value }))} className={inputClass}>
            <option value="">Auswählen …</option>
            {workspace.projects.map(item => <option key={item.id} value={item.id}>{item.projectNumber ? `${item.projectNumber} · ` : ""}{item.title}</option>)}
          </select>
        </Field>
        <Field label="Info und erledigte Arbeiten">
          <textarea rows="2" value={form.info} onChange={event => setForm(current => ({ ...current, info: event.target.value }))} placeholder="z. B. Zuschnitt abgeschlossen, Montageunterlagen liegen bereit" className={`${inputClass} resize-y`} />
        </Field>
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 disabled:opacity-50">Zuweisen</button>
      </form>
    </section>

    <div className="grid gap-4 xl:grid-cols-2">
      {workspace.employees.map(employee => {
        const assignments = assignmentByEmployee[employee.id] || [];
        return <section key={employee.id} className={`rounded-2xl border bg-gray-800 p-5 ${employee.isActive ? "border-gray-700" : "border-gray-800 opacity-65"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{employee.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{employee.role} · {employee.isActive ? "aktiv" : "deaktiviert"}</p>
            </div>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-sm text-blue-300">{assignments.length} {assignments.length === 1 ? "Auftrag" : "Aufträge"}</span>
          </div>
          <div className="mt-4 space-y-3">
            {!assignments.length && <div className="rounded-xl border border-dashed border-gray-700 p-5 text-center text-sm text-gray-500">Noch kein Auftrag zugewiesen.</div>}
            {assignments.map(assignment => {
              const project = workspace.projects.find(item => item.id === assignment.projectId);
              if (!project) return null;
              return <article key={assignment.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/Projects/${project.id}`} className="font-semibold text-blue-300 hover:underline">{project.title}</Link>
                    <p className="mt-1 text-xs text-gray-500">{customerName(project.customer)} · Projektstatus {project.status}</p>
                  </div>
                  {assignment.calendarEvent && <span className="rounded-full bg-green-950 px-2.5 py-1 text-xs text-green-300">{displayDate(assignment.calendarEvent.startAt)} – {displayInclusiveEnd(assignment.calendarEvent.endAt)}</span>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">{assignment.info || "Keine Zusatzinformation hinterlegt."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editAssignment(assignment)} className="rounded-lg border border-gray-700 px-3 py-2 text-xs hover:bg-gray-800">Info bearbeiten</button>
                  <button type="button" onClick={() => openCalendarPlanning(assignment, project, employee)} className="rounded-lg border border-blue-800 px-3 py-2 text-xs text-blue-300 hover:bg-blue-950">{assignment.calendarEvent ? "Zeitraum ändern" : "Projektzeitraum im Kalender"}</button>
                  <button type="button" disabled={busy} onClick={() => request("delete", `/assignments/${assignment.id}`, undefined, "Zuweisung entfernt.")} className="rounded-lg border border-red-950 px-3 py-2 text-xs text-red-300 hover:bg-red-950">Entfernen</button>
                </div>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>

    <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Mitarbeiterdaten {year}</h2>
          <p className="mt-1 text-sm text-gray-400">Produktive Zeit, Jahreskapazität, Urlaub und Gehalt je Mitarbeiter getrennt auswerten.</p>
        </div>
        <Field label="Mitarbeiter auswählen">
          <select value={selectedEmployeeId} onChange={event => setSelectedEmployeeId(event.target.value)} className={`${inputClass} min-w-64`}>
            {workspace.employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </Field>
      </div>

      {selectedEmployee && <div className="mt-5 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Produktive Stunden" value={hours(metrics.productiveMinutes)} />
          <Metric label="Maximale Jahresarbeitszeit" value={hours(metrics.maximumMinutes)} />
          <Metric label="Nach erfasstem Urlaub verfügbar" value={hours(Math.max(0, metrics.maximumMinutes - metrics.vacationMinutes))} />
          <Metric label="Erfasstes Jahresgehalt" value={money.format(Number(profileDraft.annualSalary || 0))} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Kostenstelle / Tätigkeit</th><th className="px-4 py-3 text-right">Produktive Zeit</th></tr></thead>
              <tbody className="divide-y divide-gray-700">
                {metrics.productiveRows.map((row, index) => <tr key={`${row.workType}:${row.customWorkType || ""}:${index}`}><td className="px-4 py-3">{getWorkTypeLabel(companySettings.workTypes, row.workType, row.customWorkType)}</td><td className="px-4 py-3 text-right font-medium text-blue-300">{hours(row.minutes)}</td></tr>)}
                {!metrics.productiveRows.length && <tr><td colSpan="2" className="px-4 py-8 text-center text-gray-500">Für dieses Jahr wurden noch keine produktiven Stunden erfasst.</td></tr>}
              </tbody>
              <tfoot className="bg-gray-900/60 font-semibold"><tr><td className="px-4 py-3">Summe</td><td className="px-4 py-3 text-right">{hours(metrics.productiveMinutes)} / {hours(metrics.maximumMinutes)}</td></tr></tfoot>
            </table>
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <h3 className="font-semibold">Urlaub und Gehalt</h3>
            <p className="mt-1 text-xs text-gray-500">Urlaub wird gegen die Arbeitsblöcke des jeweiligen Tages gerechnet. Kurze Freitage und untertägige Abwesenheiten belasten nur die tatsächlich fehlenden Stunden.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Verfügbare Urlaubstage"><input type="number" min="0" max="366" step="0.5" value={profileDraft.vacationDays} onChange={event => setProfileValue("vacationDays", event.target.value)} className={inputClass} /></Field>
              <Field label="Jahresgehalt"><div className="flex items-center gap-2"><input type="number" min="0" step="0.01" value={profileDraft.annualSalary} onChange={event => setProfileValue("annualSalary", event.target.value)} className={inputClass} /><span className="text-gray-500">€</span></div></Field>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">Urlaubsanspruch</dt><dd className="mt-1 font-medium">{hours(metrics.entitlementMinutes)}</dd></div>
              <div><dt className="text-gray-500">Kalenderverbrauch</dt><dd className="mt-1 font-medium text-amber-300">{hours(metrics.vacationMinutes)}</dd></div>
              <div><dt className="text-gray-500">Verbleibend</dt><dd className="mt-1 font-medium text-green-300">{hours(metrics.remainingVacationMinutes)}</dd></div>
              <div><dt className="text-gray-500">Ø Regelarbeitstag</dt><dd className="mt-1 font-medium">{hours(metrics.regularDayMinutes)}</dd></div>
            </dl>
            <button type="button" disabled={busy} onClick={() => request("put", `/employees/${selectedEmployeeId}/profile`, { vacationDays: profileDraft.vacationDays, annualSalary: profileDraft.annualSalary }, "Mitarbeiterdaten gespeichert.")} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50">Urlaub und Gehalt speichern</button>
          </div>
        </div>
      </div>}
    </section>
  </div>;
}

function Metric({ label, value }) {
  return <div className="rounded-2xl border border-gray-700 bg-gray-800 p-5"><p className="text-sm text-gray-400">{label}</p><p className="mt-2 text-3xl font-semibold text-blue-300">{value}</p></div>;
}

function Field({ label, children }) {
  return <label className="block text-sm text-gray-400"><span className="mb-1.5 block">{label}</span>{children}</label>;
}
