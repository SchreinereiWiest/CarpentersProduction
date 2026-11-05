import { createContext, useContext, useState } from "react";
import { MACHINING_KINDS } from "@Engine/postprocessor/index.js";
import FormulaNumberInput from "../../cabinet/components/editor/FormulaNumberInput.jsx";
import { evaluateMeasurementExpression } from "../../cabinet/measurementExpressions.js";
import { operationTitle } from "./manualCncModel.js";

const FormulaVariablesContext = createContext([]);

const clone = value => JSON.parse(JSON.stringify(value));

const getPath = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);

const setPath = (value, path, nextValue) => {
    const next = clone(value);
    const keys = path.split(".");
    let target = next;
    keys.slice(0, -1).forEach(key => {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        target = target[key];
    });
    target[keys.at(-1)] = nextValue;
    return next;
};

const numeric = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const numberPaths = operation => {
    const paths = ["diameter", "depth", "x", "y", "count", "columns", "rows", "stepX", "stepY", "spacing", "height", "width", "feed", "radius"];
    if (operation.kind === MACHINING_KINDS.MILL_GROOVE) paths.push("start.x", "start.y", "start.z", "end.x", "end.y", "end.z");
    if (operation.kind === MACHINING_KINDS.MILL_PATH) {
        paths.push("start.x", "start.y", "start.z", "target.x", "target.y", "target.z", "center.x", "center.y", "center.z");
    }
    return paths;
};

const normalizeOperationDraft = (draft, variables) => {
    let next = clone(draft);
    Object.entries(next.parameterExpressions ?? {}).forEach(([path, expression]) => {
        const result = evaluateMeasurementExpression(expression, variables);
        if (!result.valid) throw new Error(`${path}: ${result.error}`);
        next = setPath(next, path, result.value);
    });
    numberPaths(next).forEach(path => {
        if (getPath(next, path) !== undefined) next = setPath(next, path, numeric(getPath(next, path)));
    });
    if (next.kind === MACHINING_KINDS.DRILL_ROW) {
        next.start = numeric(next.start);
        next.end = numeric(next.end);
        next.crossPositions = parseNumberList(next.crossPositions);
    }
    if (next.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN) next.positions = parseNumberList(next.positions);
    return next;
};

const parseNumberList = value => (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map(entry => Number(String(entry).trim()))
    .filter(Number.isFinite);

function NumberField({ label, path, draft, onChange, unit = "mm", min, step = "any" }) {
    const variables = useContext(FormulaVariablesContext);
    const expression = draft.parameterExpressions?.[path];
    const numericMin = min === undefined ? -Number.MAX_VALUE : Number(min);
    const updateFormula = (nextExpression, evaluation) => {
        let next = clone(draft);
        next.parameterExpressions = {
            ...(next.parameterExpressions ?? {}),
            [path]: nextExpression
        };
        if (evaluation.valid) next = setPath(next, path, evaluation.value);
        onChange(next);
    };
    return (
        <div data-step={step}>
            <FormulaNumberInput
                label={label}
                value={getPath(draft, path) ?? ""}
                expression={expression}
                variables={variables}
                min={numericMin}
                unit={unit}
                onChange={updateFormula}
            />
        </div>
    );
}

function SelectField({ label, path, draft, onChange, options }) {
    return (
        <label>
            <span className="mb-1 block text-[11px] text-gray-500">{label}</span>
            <select value={getPath(draft, path) ?? ""} onChange={event => onChange(setPath(draft, path, event.target.value))} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white">
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>
    );
}

function PointFields({ label, path, draft, onChange, onPickRequest }) {
    return (
        <fieldset className="rounded border border-gray-700 p-3">
            <legend className="px-1 text-xs text-gray-400">{label}</legend>
            <div className="grid grid-cols-3 gap-2">
                <NumberField label="X" path={`${path}.x`} draft={draft} onChange={onChange} />
                <NumberField label="Y" path={`${path}.y`} draft={draft} onChange={onChange} />
                <NumberField label="Z / Tiefe" path={`${path}.z`} draft={draft} onChange={onChange} />
            </div>
            <button type="button" onClick={() => onPickRequest(path)} className="mt-2 rounded border border-violet-800 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-950/60">
                X/Y aus Zeichnung übernehmen
            </button>
        </fieldset>
    );
}

function NumberListField({ label, path, draft, onChange }) {
    const value = getPath(draft, path);
    return (
        <label className="md:col-span-2">
            <span className="mb-1 block text-[11px] text-gray-500">{label}</span>
            <input value={Array.isArray(value) ? value.join(", ") : value ?? ""} onChange={event => onChange(setPath(draft, path, event.target.value))} placeholder="z. B. 37, 69, 101" className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white outline-none focus:border-blue-500" />
        </label>
    );
}

export default function ManualOperationDialog({ draft, onChange, onCancel, onSave, tools, variables = [], onPickRequest, pickingPath }) {
    const [saveError, setSaveError] = useState("");
    const milling = draft.kind === MACHINING_KINDS.MILL_GROOVE || draft.kind === MACHINING_KINDS.MILL_PATH;
    const compatibleTools = (Array.isArray(tools) ? tools : []).filter(tool => tool.category === (milling ? "milling" : "drilling"));
    const isPath = draft.kind === MACHINING_KINDS.MILL_PATH;

    const save = () => {
        try {
            onSave(normalizeOperationDraft(draft, variables));
        } catch (error) {
            setSaveError(error.message);
        }
    };

    return (
        <FormulaVariablesContext.Provider value={variables}>
        <section role="dialog" aria-modal="false" aria-label="Bearbeitung bearbeiten" className="fixed bottom-6 right-6 top-20 z-50 flex w-[440px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-blue-800 bg-gray-900 shadow-2xl shadow-black/60">
            <header className="flex shrink-0 items-start justify-between border-b border-gray-700 px-4 py-3">
                <div>
                    <h2 className="font-semibold text-white">{operationTitle(draft)}</h2>
                    <p className="text-xs text-gray-500">Neutrale Bearbeitungsparameter</p>
                </div>
                <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">×</button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded border border-gray-700 bg-gray-950/70 px-3 py-2 text-[11px] text-gray-400">
                    Formeln sind direkt in allen Zahlenfeldern möglich: <span className="font-mono text-blue-300">DX</span> = {variables.find(variable => variable.name === "DX")?.value}, <span className="font-mono text-blue-300">DY</span> = {variables.find(variable => variable.name === "DY")?.value}, <span className="font-mono text-blue-300">DZ</span> = {variables.find(variable => variable.name === "DZ")?.value}. Beispiel: <span className="font-mono text-gray-200">DX / 2 - 16</span>
                </div>
                {saveError && <div className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">{saveError}</div>}
                {pickingPath && <div className="rounded border border-violet-700 bg-violet-950/50 px-3 py-2 text-xs text-violet-200">Punkt im Bauteil anklicken. Die Auswahl bleibt geöffnet.</div>}
                <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Bauteilseite" path="face" draft={draft} onChange={onChange} options={[{ value: "A", label: "Seite A" }, { value: "B", label: "Seite B" }]} />
                    <label>
                        <span className="mb-1 block text-[11px] text-gray-500">Werkzeug</span>
                        <select value={draft.toolId ?? ""} onChange={event => onChange({ ...draft, toolId: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white">
                            <option value="">Postprozessor-Standard</option>
                            {compatibleTools.map(tool => <option key={tool.id} value={tool.id}>{tool.name} · Ø {tool.diameter}</option>)}
                        </select>
                    </label>
                </div>

                {(draft.kind === MACHINING_KINDS.DRILL_POINT || draft.kind === MACHINING_KINDS.DRILL_PATTERN || draft.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN) && <>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Position X" path="x" draft={draft} onChange={onChange} />
                        <NumberField label="Position Y" path="y" draft={draft} onChange={onChange} />
                        <NumberField label="Durchmesser" path="diameter" draft={draft} onChange={onChange} min="0" />
                        <NumberField label="Tiefe" path="depth" draft={draft} onChange={onChange} />
                    </div>
                    <button type="button" onClick={() => onPickRequest("$root")} className="rounded border border-violet-800 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-950/60">X/Y aus Zeichnung übernehmen</button>
                    {draft.kind === MACHINING_KINDS.DRILL_PATTERN && <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Spalten" path="columns" draft={draft} onChange={onChange} unit="" min="1" step="1" />
                        <NumberField label="Zeilen" path="rows" draft={draft} onChange={onChange} unit="" min="1" step="1" />
                        <NumberField label="Spaltenraster X" path="stepX" draft={draft} onChange={onChange} />
                        <NumberField label="Zeilenraster Y" path="stepY" draft={draft} onChange={onChange} />
                    </div>}
                    {draft.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN && <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Anzahl" path="count" draft={draft} onChange={onChange} unit="" min="1" step="1" />
                        <NumberField label="Raster" path="spacing" draft={draft} onChange={onChange} min="0" />
                    </div>}
                </>}

                {draft.kind === MACHINING_KINDS.DRILL_ROW && <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Start" path="start" draft={draft} onChange={onChange} />
                    <NumberField label="Ende" path="end" draft={draft} onChange={onChange} />
                    <NumberField label="Raster" path="spacing" draft={draft} onChange={onChange} min="0" />
                    <NumberField label="Durchmesser" path="diameter" draft={draft} onChange={onChange} min="0" />
                    <NumberField label="Tiefe" path="depth" draft={draft} onChange={onChange} />
                    <NumberListField label="Querpositionen" path="crossPositions" draft={draft} onChange={onChange} />
                </div>}

                {draft.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN && <div className="grid grid-cols-2 gap-3">
                    <SelectField label="Kante" path="edge" draft={draft} onChange={onChange} options={[{ value: "left", label: "Links" }, { value: "right", label: "Rechts" }]} />
                    <NumberField label="Bohrhöhe" path="height" draft={draft} onChange={onChange} />
                    <NumberField label="Durchmesser" path="diameter" draft={draft} onChange={onChange} min="0" />
                    <NumberField label="Tiefe" path="depth" draft={draft} onChange={onChange} />
                    <NumberListField label="Positionen an der Kante" path="positions" draft={draft} onChange={onChange} />
                </div>}

                {draft.kind === MACHINING_KINDS.MILL_GROOVE && <>
                    <PointFields label="Nutanfang" path="start" draft={draft} onChange={onChange} onPickRequest={onPickRequest} />
                    <PointFields label="Nutende" path="end" draft={draft} onChange={onChange} onPickRequest={onPickRequest} />
                    <NumberField label="Nutbreite" path="width" draft={draft} onChange={onChange} min="0" />
                </>}

                {isPath && <>
                    {draft.motion !== "rapid" && <PointFields label="Startpunkt" path="start" draft={draft} onChange={onChange} onPickRequest={onPickRequest} />}
                    <PointFields label={draft.motion === "rapid" ? "G0 Zielpunkt" : "Endpunkt"} path="target" draft={draft} onChange={onChange} onPickRequest={onPickRequest} />
                    {draft.motion === "arc" && <>
                        <PointFields label="Kreismittelpunkt" path="center" draft={draft} onChange={onChange} onPickRequest={onPickRequest} />
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField label="Radius" path="radius" draft={draft} onChange={onChange} min="0" />
                            <SelectField label="Richtung" path="direction" draft={draft} onChange={onChange} options={[{ value: "clockwise", label: "Im Uhrzeigersinn" }, { value: "counterclockwise", label: "Gegen Uhrzeigersinn" }]} />
                        </div>
                    </>}
                    <div className="grid grid-cols-2 gap-3">
                        <SelectField label="Radiuskorrektur" path="compensation" draft={draft} onChange={onChange} options={[{ value: "center", label: "Auf Kontur" }, { value: "left", label: "Links der Kontur" }, { value: "right", label: "Rechts der Kontur" }]} />
                        {draft.motion !== "rapid" && <NumberField label="Vorschub" path="feed" draft={draft} onChange={onChange} unit="" min="0" />}
                    </div>
                </>}
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-700 p-3">
                <button type="button" onClick={onCancel} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Abbrechen</button>
                <button type="button" onClick={save} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Übernehmen</button>
            </footer>
        </section>
        </FormulaVariablesContext.Provider>
    );
}

export function FilletDialog({ onCancel, onSave }) {
    const [radius, setRadius] = useState("10");
    const [direction, setDirection] = useState("auto");
    return (
        <section role="dialog" className="fixed right-6 top-24 z-50 w-96 rounded-xl border border-blue-800 bg-gray-900 p-4 shadow-2xl">
            <h2 className="font-semibold text-white">Radius zwischen zwei Fräsgeraden</h2>
            <p className="mt-1 text-xs text-gray-500">Die ausgewählte Gerade und die direkt folgende Gerade werden tangential gekürzt.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <label><span className="mb-1 block text-xs text-gray-500">Radius</span><input type="number" value={radius} onChange={event => setRadius(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white" /></label>
                <label><span className="mb-1 block text-xs text-gray-500">Richtung</span><select value={direction} onChange={event => setDirection(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-white"><option value="auto">Automatisch</option><option value="clockwise">Uhrzeigersinn</option><option value="counterclockwise">Gegenuhrzeigersinn</option></select></label>
            </div>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-300">Abbrechen</button><button type="button" onClick={() => onSave(Number(radius), direction)} className="rounded bg-blue-600 px-3 py-2 text-sm text-white">Radius einfügen</button></div>
        </section>
    );
}
