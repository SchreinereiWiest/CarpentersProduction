import { useId, useMemo, useState } from "react";
import { CabinetList } from "../../view/cabinetList.view.jsx";
import { evaluateMeasurementExpression } from "../../../measurementExpressions.js";

const SmallButton = ({ children, className = "", ...props }) => (
    <button
        type="button"
        className={`rounded-md border border-white/10 bg-[#222528] px-2 py-1.5 text-xs text-gray-300 hover:border-white/20 hover:bg-[#2a2e32] disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
        {...props}
    >
        {children}
    </button>
);

const PositionInput = ({ axis, expression, variables, onChange }) => {
    const listId = useId();
    const evaluation = useMemo(
        () => evaluateMeasurementExpression(expression, variables),
        [expression, variables]
    );
    return (
        <label className="min-w-0 text-[11px] text-gray-500">
            {axis.toUpperCase()}-Position
            <div className={`mt-1 flex items-center rounded-md border bg-[#111315] ${evaluation.valid ? "border-white/10 focus-within:border-amber-500" : "border-red-700/70"}`}>
                <input
                    type="text"
                    value={expression}
                    list={listId}
                    onChange={event => onChange(axis, event.target.value, evaluateMeasurementExpression(event.target.value, variables))}
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs text-gray-200 outline-none"
                    aria-label={`${axis.toUpperCase()}-Position des aktiven Korpus`}
                    title={evaluation.error ?? `${evaluation.value} mm`}
                />
                <span className="pr-2 text-[10px] text-gray-600">mm</span>
            </div>
            <datalist id={listId}>
                {variables.map(variable => <option key={variable.name} value={variable.name}>{variable.value} mm</option>)}
            </datalist>
        </label>
    );
};

export default function CabinetSidebar({
    cabinets,
    activeCabinetId,
    addCabinet,
    duplicateCabinet,
    selectCabinet,
    deleteCabinet,
    updateCabinetQuantity,
    saveCabinetAsPreset,
    selectedCabinetIds,
    onToggleCabinetSelection,
    workspace,
    position,
    positionVariables,
    onPositionChange,
    onSwapPosition,
    onAssignSelectionToPage,
    onSelectPage,
    onAddPage,
    onRenamePage,
    onDeletePage
}) {
    const [targetPageId, setTargetPageId] = useState(workspace.activePageId);
    const pageNames = Object.fromEntries(cabinets.map(cabinet => {
        const pageId = workspace.placements?.[cabinet.id]?.pageId;
        return [cabinet.id, workspace.pages.find(page => page.id === pageId)?.name ?? ""];
    }));
    const hasSelection = selectedCabinetIds.length > 0;

    return (
        <aside data-tour="project-cabinet-list" className="flex h-full min-h-0 flex-col border-r border-white/10 bg-[#17191b]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Korpusse</h2>
                <button
                    type="button"
                    onClick={addCabinet}
                    aria-label="Korpus hinzufügen"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#24272a] text-lg text-gray-200 hover:border-amber-600/60 hover:text-amber-200"
                >
                    +
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
                <CabinetList
                    cabinets={cabinets}
                    activeCabinetId={activeCabinetId}
                    selectedCabinetIds={selectedCabinetIds}
                    pageNames={pageNames}
                    onSelect={selectCabinet}
                    onToggleSelection={onToggleCabinetSelection}
                    onDuplicate={duplicateCabinet}
                    onQuantityChange={updateCabinetQuantity}
                    onSaveAsPreset={saveCabinetAsPreset}
                />
            </div>

            <section className="shrink-0 border-t border-white/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Anordnung</h3>
                    <span className="text-[11px] text-gray-600">{position.selectionCount > 1 ? `Aktiver Korpus + ${position.selectionCount - 1} angehakt` : "Aktiver Korpus · unten links"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <PositionInput axis="x" expression={position.xExpression} variables={positionVariables} onChange={onPositionChange} />
                    <PositionInput axis="y" expression={position.yExpression} variables={positionVariables} onChange={onPositionChange} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <SmallButton disabled={!activeCabinetId} onClick={() => onSwapPosition("left")} title="Mit dem linken Korpus tauschen">← Tauschen</SmallButton>
                    <SmallButton disabled={!activeCabinetId} onClick={() => onSwapPosition("right")} title="Mit dem rechten Korpus tauschen">Tauschen →</SmallButton>
                </div>
                <div className="mt-2 flex gap-2">
                    <select
                        value={targetPageId}
                        onChange={event => setTargetPageId(event.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#111315] px-2 py-1.5 text-xs text-gray-300 outline-none"
                    >
                        {workspace.pages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
                    </select>
                    <SmallButton disabled={!hasSelection} onClick={() => onAssignSelectionToPage(targetPageId)}>Verschieben</SmallButton>
                </div>
            </section>

            <section className="max-h-52 shrink-0 overflow-y-auto border-t border-white/10 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Seiten / Layout</h3>
                    <SmallButton onClick={onAddPage} aria-label="Seite hinzufügen">+</SmallButton>
                </div>
                <div className="space-y-1">
                    {workspace.pages.map(page => {
                        const count = cabinets.filter(cabinet => workspace.placements?.[cabinet.id]?.pageId === page.id).length;
                        const active = workspace.activePageId === page.id;
                        return (
                            <div key={page.id} className={`flex items-center gap-1 rounded-md border px-1 py-1 ${active ? "border-amber-700/60 bg-amber-950/30" : "border-transparent hover:bg-white/5"}`}>
                                <button type="button" onClick={() => onSelectPage(page.id)} className="min-w-0 flex-1 px-1 text-left">
                                    <input
                                        value={page.name}
                                        onClick={event => event.stopPropagation()}
                                        onChange={event => onRenamePage(page.id, event.target.value)}
                                        className="w-full bg-transparent text-xs text-gray-200 outline-none"
                                        aria-label={`Name von ${page.name}`}
                                    />
                                </button>
                                <span className="rounded bg-black/30 px-1.5 text-[10px] text-gray-500">{count}</span>
                                <button
                                    type="button"
                                    disabled={workspace.pages.length <= 1}
                                    onClick={() => onDeletePage(page.id)}
                                    className="h-6 w-6 rounded text-xs text-gray-600 hover:bg-red-950 hover:text-red-300 disabled:opacity-20"
                                    aria-label={`${page.name} löschen`}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="shrink-0 border-t border-white/10 p-3">
                <button
                    type="button"
                    onClick={deleteCabinet}
                    disabled={cabinets.length <= 1}
                    className="w-full rounded-md border border-red-900/70 px-3 py-2 text-xs text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    Aktuellen Korpus löschen
                </button>
            </div>
        </aside>
    );
}
