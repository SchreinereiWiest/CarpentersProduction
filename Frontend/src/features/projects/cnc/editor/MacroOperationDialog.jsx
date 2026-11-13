import { useState } from "react";

import FormulaNumberInput from "../../cabinet/components/editor/FormulaNumberInput.jsx";
import { evaluateMeasurementExpression } from "../../cabinet/measurementExpressions.js";

const clone = value => JSON.parse(JSON.stringify(value));

export default function MacroOperationDialog({ macro, draft, variables = [], onChange, onCancel, onSave }) {
    const [saveError, setSaveError] = useState("");

    const updateNumber = (field, expression, evaluation) => {
        const next = clone(draft);
        next.parameterExpressions = { ...(next.parameterExpressions ?? {}), [field.key]: expression };
        if (evaluation.valid) next.values[field.key] = evaluation.value;
        onChange(next);
    };

    const save = () => {
        try {
            const next = clone(draft);
            macro.fields.filter(field => field.type === "number").forEach(field => {
                const expression = next.parameterExpressions?.[field.key];
                if (!expression) return;
                const evaluation = evaluateMeasurementExpression(expression, variables);
                if (!evaluation.valid) throw new Error(`${field.label}: ${evaluation.error}`);
                next.values[field.key] = evaluation.value;
            });
            onSave(next);
        } catch (error) {
            setSaveError(error.message);
        }
    };

    return (
        <section role="dialog" aria-modal="false" aria-label={`${macro.label} einfügen`} className="fixed bottom-6 right-6 top-20 z-50 flex w-[420px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-amber-700 bg-gray-900 shadow-2xl shadow-black/60">
            <header className="flex shrink-0 items-start justify-between border-b border-gray-700 px-4 py-3">
                <div>
                    <h2 className="font-semibold text-white">{macro.label}</h2>
                    <p className="mt-1 text-xs text-gray-500">{macro.description}</p>
                </div>
                <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white">×</button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div className="rounded border border-gray-700 bg-gray-950/70 px-3 py-2 text-[11px] text-gray-400">
                    Die vollständige Bearbeitungsgeometrie kommt aus den zentralen CNC-Parametern. Formeln mit <span className="font-mono text-blue-300">DX</span>, <span className="font-mono text-blue-300">DY</span> und <span className="font-mono text-blue-300">DZ</span> sind möglich.
                </div>
                {saveError && <div className="rounded border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">{saveError}</div>}
                <label>
                    <span className="mb-1 block text-[11px] text-gray-500">Bauteilseite</span>
                    <select value={draft.face ?? "A"} onChange={event => onChange({ ...draft, face: event.target.value })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white">
                        <option value="A">Seite A</option>
                        <option value="B">Seite B</option>
                    </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {macro.fields.map(field => field.type === "select" ? (
                        <label key={field.key}>
                            <span className="mb-1 block text-[11px] text-gray-500">{field.label}</span>
                            <select value={draft.values[field.key] ?? ""} onChange={event => onChange({ ...draft, values: { ...draft.values, [field.key]: event.target.value } })} className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-white">
                                {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </label>
                    ) : (
                        <FormulaNumberInput
                            key={field.key}
                            label={field.label}
                            value={draft.values[field.key] ?? ""}
                            expression={draft.parameterExpressions?.[field.key]}
                            variables={variables}
                            min={-Number.MAX_VALUE}
                            unit={field.unit ?? ""}
                            onChange={(expression, evaluation) => updateNumber(field, expression, evaluation)}
                        />
                    ))}
                </div>
            </div>

            <footer className="flex shrink-0 justify-end gap-2 border-t border-gray-700 p-3">
                <button type="button" onClick={onCancel} className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300">Abbrechen</button>
                <button type="button" onClick={save} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">Makro einfügen</button>
            </footer>
        </section>
    );
}
