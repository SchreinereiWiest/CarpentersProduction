import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useManagement } from "../hooks/useManagement.js";

const customerName = customer => customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Ohne Kundenname";

export default function ManagementBoard() {
  const { workspace, companySettings, busy, request } = useManagement();
  const stages = companySettings.management.workflowStates;
  const [draggedProjectId, setDraggedProjectId] = useState(null);
  const stageByProject = useMemo(() => Object.fromEntries(workspace.projectStages.map(item => [item.projectId, item.stageId])), [workspace.projectStages]);
  const firstStageId = stages[0]?.id;
  const projectsByStage = useMemo(() => Object.fromEntries(stages.map(stage => [
    stage.id,
    workspace.projects.filter(project => (stages.some(item => item.id === stageByProject[project.id]) ? stageByProject[project.id] : firstStageId) === stage.id)
  ])), [stages, workspace.projects, stageByProject, firstStageId]);

  const move = (projectId, stageId) => request("put", `/projects/${projectId}/stage`, { stageId, position: 0 }, "Management-Status aktualisiert.");

  if (!stages.length) return <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8 text-center">
    <h1 className="text-xl font-semibold">Keine Statusspalten konfiguriert</h1>
    <Link to="/CompanySettings?section=advanced&tab=management" className="mt-4 inline-block text-blue-300 underline">Management-Einstellungen öffnen</Link>
  </div>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Projektstatus</h1><p className="mt-1 text-sm text-gray-400">Management-Ablauf wie in einem Projects-Board. Der allgemeine Projektstatus active/inactive/archive wird hier nicht verändert.</p></div>
      <Link to="/CompanySettings?section=advanced&tab=management" className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">Spalten konfigurieren</Link>
    </div>
    <div className="flex min-h-[560px] gap-4 overflow-x-auto pb-4">
      {stages.map((stage, stageIndex) => <section
        key={stage.id}
        onDragOver={event => event.preventDefault()}
        onDrop={() => {
          if (draggedProjectId) move(draggedProjectId, stage.id);
          setDraggedProjectId(null);
        }}
        className="w-[310px] shrink-0 rounded-2xl border border-gray-700 bg-gray-800/70 p-3"
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold">{stage.label}</h2>
          <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs text-gray-400">{projectsByStage[stage.id]?.length || 0}</span>
        </div>
        <div className="space-y-3">
          {(projectsByStage[stage.id] || []).map(project => <article
            key={project.id}
            draggable={!busy}
            onDragStart={() => setDraggedProjectId(project.id)}
            onDragEnd={() => setDraggedProjectId(null)}
            className="cursor-grab rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-sm active:cursor-grabbing"
          >
            <div className="flex items-start justify-between gap-2">
              <Link to={`/Projects/${project.id}`} className="font-medium text-gray-100 hover:text-blue-300 hover:underline">{project.title}</Link>
              <span className={`rounded px-2 py-0.5 text-[11px] ${project.status === "active" ? "bg-green-950 text-green-300" : "bg-gray-800 text-gray-400"}`}>{project.status}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{project.projectNumber || "Ohne Projektnummer"}</p>
            <p className="mt-1 text-sm text-gray-400">{customerName(project.customer)}</p>
            <div className="mt-4 flex items-center justify-between">
              <button type="button" aria-label="Eine Spalte nach links" disabled={busy || stageIndex === 0} onClick={() => move(project.id, stages[stageIndex - 1].id)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-25">←</button>
              <span className="text-[11px] uppercase tracking-wider text-gray-600">Verschieben</span>
              <button type="button" aria-label="Eine Spalte nach rechts" disabled={busy || stageIndex === stages.length - 1} onClick={() => move(project.id, stages[stageIndex + 1].id)} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-25">→</button>
            </div>
          </article>)}
          {!projectsByStage[stage.id]?.length && <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-xs text-gray-600">Projekt hierher ziehen</div>}
        </div>
      </section>)}
    </div>
  </div>;
}
