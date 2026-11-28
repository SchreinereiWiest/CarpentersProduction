import { useId, useMemo } from "react";
import { evaluateMeasurementExpression } from "../../measurementExpressions.js";

const ToolButton = ({ active = false, children, className = "", ...props }) => (
    <button
        type="button"
        className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs transition ${active
            ? "border-amber-500 bg-amber-500/20 text-amber-200"
            : "border-white/10 bg-[#202326] text-gray-300 hover:border-white/20 hover:bg-[#292d31]"} ${className}`}
        {...props}
    >
        {children}
    </button>
);

const GuideFormulaInput = ({ guide, variables, onUpdateGuide }) => {
    const listId = useId();
    const draft = guide.expression ?? String(guide.position ?? 0);

    const availableVariables = useMemo(() => variables.filter(variable =>
        String(variable?.name).toLocaleUpperCase("de-DE") !== String(guide.name).toLocaleUpperCase("de-DE")
    ), [guide.name, variables]);
    const result = useMemo(
        () => evaluateMeasurementExpression(draft, availableVariables),
        [availableVariables, draft]
    );

    const commit = value => {
        const evaluation = evaluateMeasurementExpression(value, availableVariables);
        onUpdateGuide(guide.id, {
            expression: value,
            ...(evaluation.valid ? { position: evaluation.value } : {})
        });
    };

    return (
        <label className={`flex items-center rounded-md border bg-[#111315] pl-2 text-xs ${result.valid ? "border-white/10" : "border-red-700/70"}`} title={result.error ?? "Linienmaß oder Formel"}>
            <input
                type="text"
                value={draft}
                list={listId}
                onChange={event => {
                    commit(event.target.value);
                }}
                onBlur={() => commit(draft)}
                aria-label="Linienmaß oder Formel"
                className="w-36 bg-transparent px-1 py-1.5 text-right font-mono text-gray-200 outline-none"
            />
            <span className="pr-2 text-gray-500">mm</span>
            <datalist id={listId}>
                {availableVariables.map(variable => <option key={variable.name} value={variable.name}>{variable.value} mm</option>)}
            </datalist>
        </label>
    );
};

export default function CabinetWorkspaceToolbar({
    pages,
    activePageId,
    onSelectPage,
    guideLayer,
    onGuideLayerChange,
    activeGuideTool,
    setActiveGuideTool,
    selectedGuide,
    onUpdateGuide,
    onDeleteGuide,
    onApplyGuide,
    measurementVariables = [],
    actions = null
}) {
    const toolActive = orientation => activeGuideTool?.layer === guideLayer && activeGuideTool?.orientation === orientation;
    const modes = [
        ["front", "Fronten"],
        ["interior", "Innenraum"],
        ["dual", "Dual"]
    ];

    return (
        <div className="shrink-0 border-b border-white/10 bg-[#17191b]">
            <div className="flex h-11 items-center gap-2 border-b border-white/5 px-3">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Seite</span>
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                    {pages.map(page => (
                        <ToolButton key={page.id} active={page.id === activePageId} onClick={() => onSelectPage(page.id)}>
                            {page.name}
                        </ToolButton>
                    ))}
                </div>
                {actions && <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">{actions}</div>}
            </div>

            <div className="flex min-h-12 items-center gap-2 px-3 py-2">
                <div className="flex rounded-md border border-white/10 bg-[#111315] p-0.5">
                    {modes.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => {
                                onGuideLayerChange(value);
                                setActiveGuideTool(null);
                            }}
                            className={`rounded px-2.5 py-1 text-xs ${guideLayer === value
                                ? value === "interior" ? "bg-cyan-500/20 text-cyan-200" : value === "dual" ? "bg-violet-500/20 text-violet-200" : "bg-amber-500/20 text-amber-200"
                                : "text-gray-400"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Linien</span>
                <ToolButton
                    active={toolActive("horizontal")}
                    onClick={() => setActiveGuideTool(toolActive("horizontal") ? null : { layer: guideLayer, orientation: "horizontal" })}
                >
                    + Horizontal
                </ToolButton>
                <ToolButton
                    active={toolActive("vertical")}
                    onClick={() => setActiveGuideTool(toolActive("vertical") ? null : { layer: guideLayer, orientation: "vertical" })}
                >
                    + Vertikal
                </ToolButton>
                <span className="ml-auto text-[11px] text-gray-600">Horizontal: Maß ab Unterkante · Vertikal: Maß ab links</span>
            </div>

            {selectedGuide && (
                <div className="flex min-h-11 flex-wrap items-center gap-2 border-t border-white/5 bg-[#141618] px-3 py-1.5">
                    <span className="text-xs text-gray-500">Aktive Linie</span>
                    <input
                        type="text"
                        value={selectedGuide.name}
                        onChange={event => onUpdateGuide(selectedGuide.id, { name: event.target.value.replace(/[^\p{L}\p{N}_]/gu, "_") })}
                        aria-label="Variablenname der Hilfslinie"
                        className="w-32 rounded-md border border-white/10 bg-[#111315] px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-amber-500"
                    />
                    <GuideFormulaInput guide={selectedGuide} variables={measurementVariables} onUpdateGuide={onUpdateGuide} />
                    <span className="text-[11px] text-gray-500">= {Math.round(Number(selectedGuide.position) * 1000) / 1000} mm</span>
                    <ToolButton onClick={() => onApplyGuide(selectedGuide)} className="border-amber-700/70">Mit Linie trennen</ToolButton>
                    <ToolButton
                        active={!selectedGuide.hidden}
                        onClick={() => onUpdateGuide(selectedGuide.id, { hidden: !selectedGuide.hidden })}
                        aria-pressed={!selectedGuide.hidden}
                        title={selectedGuide.hidden ? "Linie hervorheben" : "Linie dezent anzeigen"}
                        className="px-2"
                    >
                        {selectedGuide.hidden ? "◌" : "👁"}
                    </ToolButton>
                    <ToolButton onClick={() => onDeleteGuide(selectedGuide.id)} className="text-red-300">Löschen</ToolButton>
                </div>
            )}
        </div>
    );
}
