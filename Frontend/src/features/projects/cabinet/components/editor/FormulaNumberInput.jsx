import { useEffect, useId, useMemo, useState } from "react";
import { evaluateMeasurementExpression } from "../../measurementExpressions.js";

export default function FormulaNumberInput({ label, value, expression, variables = [], onChange, min = 0.001, max = Number.POSITIVE_INFINITY, unit = "mm" }) {
    const listId = useId();
    const [draft, setDraft] = useState(() => expression ?? String(value ?? ""));
    const evaluation = useMemo(() => {
        const result = evaluateMeasurementExpression(draft, variables);
        if (result.valid && result.value < min) {
            return { ...result, valid: false, error: `Der Wert muss mindestens ${min}${unit ? ` ${unit}` : ""} betragen.` };
        }
        if (result.valid && result.value > max) return { ...result, valid: false, error: `Der Wert darf höchstens ${max}${unit ? ` ${unit}` : ""} betragen.` };
        return result;
    }, [draft, max, min, unit, variables]);

    useEffect(() => {
        setDraft(expression ?? String(value ?? ""));
    }, [expression, value]);

    const update = event => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        const result = evaluateMeasurementExpression(nextDraft, variables);
        onChange(nextDraft, result.valid && result.value >= min && result.value <= max
            ? result
            : { ...result, valid: false, error: result.error || `Der Wert muss zwischen ${min} und ${max}${unit ? ` ${unit}` : ""} liegen.` });
    };

    return (
        <label className="block">
            <span className="text-xs text-neutral-400">{label}</span>
            <div className="relative mt-1">
                <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck="false"
                    list={variables.length ? listId : undefined}
                    value={draft}
                    onChange={update}
                    className={`w-full rounded border bg-gray-800 px-3 py-1 pr-11 font-mono text-sm text-gray-100 outline-none ${evaluation.valid ? "border-neutral-700 focus:border-blue-500" : "border-red-700 focus:border-red-500"}`}
                    aria-invalid={!evaluation.valid}
                    aria-describedby={`${listId}-result`}
                />
                <span id={`${listId}-result`} className={`pointer-events-none absolute right-3 top-1.5 text-[10px] text-gray-500 ${evaluation.valid ? "text-emerald-400" : "text-red-400"}`}>
                {evaluation.valid
                    ? `${evaluation.identifiers?.length ? "Berechnet" : "Wert"}: ${evaluation.value}${unit ? ` ${unit}` : ""}`
                    : evaluation.error}
                </span>
            </div>
            
            {variables.length > 0 && (
                <datalist id={listId}>
                    {variables.map(variable => <option key={variable.name} value={variable.name}>{variable.value} {variable.unit}</option>)}
                </datalist>
            )}
        </label>
    );
}
