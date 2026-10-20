import { useId, useMemo, useState } from "react";


const defaultMaterialLabel = material => {
    const number = String(material?.materialNumber ?? "").trim();
    const name = String(material?.name ?? "").trim();
    const thickness = Number(material?.thickness);
    const description = [number, name].filter(Boolean).join(" · ");

    return Number.isFinite(thickness)
        ? `${description || "Material"} (${thickness} mm)`
        : description || "Material";
};


export default function MaterialSelect({
    label,
    ariaLabel,
    value,
    materials = [],
    loading = false,
    error = null,
    emptyLabel = "Kein Material",
    getOptionLabel = defaultMaterialLabel,
    isOptionDisabled = () => false,
    onChange,
    onClick,
    className = ""
}) {
    const inputId = useId();
    const listboxId = useId();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const selectedMaterial = materials.find(
        material => String(material.id) === String(value ?? "")
    );
    const selectedLabel = selectedMaterial
        ? getOptionLabel(selectedMaterial)
        : "";

    const suggestions = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

        return materials
            .filter(material => {
                if (!normalizedQuery) return true;

                return [
                    getOptionLabel(material),
                    material?.name,
                    material?.materialNumber,
                    material?.manufacturer,
                    material?.thickness
                ]
                    .filter(valuePart => valuePart !== null && valuePart !== undefined)
                    .join(" ")
                    .toLocaleLowerCase("de-DE")
                    .includes(normalizedQuery);
            })
            .slice(0, 10);
    }, [getOptionLabel, materials, query]);

    const selectMaterial = material => {
        if (isOptionDisabled(material)) return;
        onChange(String(material.id));
        setQuery("");
        setOpen(false);
        setActiveIndex(0);
    };

    return (
        <div
            className={`relative ${className}`}
            onClick={onClick}
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpen(false);
                    setQuery("");
                }
            }}
        >
            {label && (
                <label htmlFor={inputId} className="text-xs text-gray-400">
                    {label}
                </label>
            )}

            <div className="relative mt-1">
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    aria-label={ariaLabel || label}
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-expanded={open}
                    aria-activedescendant={
                        open && suggestions[activeIndex]
                            ? `${listboxId}-${suggestions[activeIndex].id}`
                            : undefined
                    }
                    autoComplete="off"
                    disabled={loading}
                    placeholder={loading ? "Materialien werden geladen ..." : emptyLabel}
                    value={open ? query : selectedLabel}
                    onFocus={event => {
                        setQuery(selectedLabel);
                        setOpen(true);
                        setActiveIndex(0);
                        event.currentTarget.select();
                    }}
                    onChange={event => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setActiveIndex(0);
                    }}
                    onKeyDown={event => {
                        if (event.key === "Escape") {
                            setOpen(false);
                            setQuery("");
                            return;
                        }

                        if (!suggestions.length) return;

                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setOpen(true);
                            setActiveIndex(index =>
                                Math.min(index + 1, suggestions.length - 1)
                            );
                        }

                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveIndex(index => Math.max(index - 1, 0));
                        }

                        if (event.key === "Enter" && open) {
                            event.preventDefault();
                            selectMaterial(suggestions[activeIndex]);
                        }
                    }}
                    className="
                        w-full
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        pr-16
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                    "
                />

                {value && !loading && (
                    <button
                        type="button"
                        aria-label={`${label || ariaLabel || "Material"} entfernen`}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => {
                            onChange("");
                            setQuery("");
                            setOpen(false);
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 px-1 text-gray-500 hover:text-red-300"
                    >
                        ×
                    </button>
                )}

                <button
                    type="button"
                    aria-label={`${label || ariaLabel || "Material"} Vorschläge öffnen`}
                    disabled={loading}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                        setQuery("");
                        setOpen(current => !current);
                        setActiveIndex(0);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 disabled:opacity-50"
                >
                    ▾
                </button>
            </div>

            {open && !loading && (
                <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-1 shadow-xl"
                >
                    {suggestions.map((material, index) => {
                        const disabled = isOptionDisabled(material);

                        return (
                            <button
                                id={`${listboxId}-${material.id}`}
                                key={material.id}
                                type="button"
                                role="option"
                                aria-selected={String(material.id) === String(value ?? "")}
                                disabled={disabled}
                                onMouseDown={event => event.preventDefault()}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => selectMaterial(material)}
                                className={`block w-full rounded px-3 py-2 text-left text-sm ${
                                    index === activeIndex
                                        ? "bg-blue-900 text-blue-100"
                                        : "text-gray-200 hover:bg-gray-800"
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                {getOptionLabel(material)}
                            </button>
                        );
                    })}

                    {suggestions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            Keine Materialien gefunden
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="mt-1 text-xs text-gray-500">
                    Materialien werden geladen ...
                </div>
            )}

            {!loading && error && (
                <div className="mt-1 text-xs text-red-400">
                    {error}
                </div>
            )}
        </div>
    );
}
