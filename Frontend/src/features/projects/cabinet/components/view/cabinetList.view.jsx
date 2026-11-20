
import { useEffect, useRef } from "react";
import { getCabinetVariantCount } from "../../workspace/cabinetVariants.js";


export function CabinetList({
    cabinets,
    activeCabinetId,
    selectedCabinetIds = [],
    pageNames = {},
    onSelect,
    onToggleSelection,
    onDuplicate,
    onQuantityChange,
    onSaveAsPreset,
}) {

    return (
        <div className="">


            <div className="px-2 pb-3">

                {cabinets.map(
                    cabinet => {

                        const active =
                            cabinet.id ===
                            activeCabinetId;


                        return (
                            <CabinetListItem
                                key={cabinet.id}
                                cabinet={cabinet}
                                cabinets={cabinets}
                                active={active}
                                selected={selectedCabinetIds.includes(cabinet.id)}
                                pageName={pageNames[cabinet.id]}
                                onSelect={onSelect}
                                onToggleSelection={onToggleSelection}
                                onDuplicate={onDuplicate}
                                onQuantityChange={onQuantityChange}
                                onSaveAsPreset={onSaveAsPreset}
                            />
                        );

                    }
                )}

            </div>

        </div>
    );
}

function CabinetListItem({
    cabinet,
    cabinets,
    active,
    selected,
    pageName,
    onSelect,
    onToggleSelection,
    onDuplicate,
    onQuantityChange,
    onSaveAsPreset
}) {
    const longPressTimer = useRef(null);
    const suppressResetTimer = useRef(null);
    const suppressClick = useRef(false);
    const variantCount = getCabinetVariantCount(cabinet, cabinets);

    useEffect(() => () => {
        clearTimeout(longPressTimer.current);
        clearTimeout(suppressResetTimer.current);
    }, []);

    const startLongPress = event => {
        if (event.button !== 0 || !onSaveAsPreset) return;

        clearTimeout(longPressTimer.current);
        clearTimeout(suppressResetTimer.current);
        suppressClick.current = false;
        longPressTimer.current = setTimeout(() => {
            suppressClick.current = true;
            suppressResetTimer.current = setTimeout(() => {
                suppressClick.current = false;
            }, 1000);
            onSaveAsPreset(cabinet);
        }, 700);
    };

    const cancelLongPress = () => {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    };

    return (
        <div className={`flex items-center gap-1 rounded-md border transition ${active ? "border-amber-700/70 bg-amber-950/30" : "border-transparent hover:bg-gray-800/60"}`}>
            <label className="ml-2 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center" title="Mit dem aktiven Korpus transformieren">
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelection?.(cabinet.id)}
                    aria-label={`${cabinet.name} gemeinsam mit dem aktiven Korpus transformieren`}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 accent-amber-500"
                />
            </label>
            <button
                type="button"
                onClick={() => {
                    if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                    }
                    onSelect(cabinet.id);
                }}
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={event => event.preventDefault()}
                title="Klicken zum Auswählen, gedrückt halten zum Speichern als Preset"
                className="min-w-0 flex-1 touch-manipulation px-2 py-2 text-left"
            >
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-amber-400" : "bg-gray-600"}`} />
                    <span className="truncate text-sm text-gray-200">{cabinet.name}</span>
                </div>
                <div className="ml-4 mt-0.5 text-xs text-gray-500">
                    {cabinet.width} × {cabinet.height} × {cabinet.depth}{pageName ? ` · ${pageName}` : ""}
                </div>
                {cabinet.linkedCabinetGroupId && (
                    <div className="ml-4 text-[10px] text-amber-700">Variante {cabinet.variantIndex ?? 1}/{variantCount}</div>
                )}
            </button>

            <label className="flex shrink-0 flex-col items-center gap-0.5 text-[10px] text-gray-500">
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={variantCount}
                    aria-label={`Stückzahl für ${cabinet.name}`}
                    onChange={event => {
                        const quantity = Number(event.target.value);
                        if (Number.isFinite(quantity) && quantity >= 1) {
                            onQuantityChange(cabinet.id, Math.floor(quantity));
                        }
                    }}
                    className="w-12 rounded border border-gray-700 bg-gray-900 px-1 py-1 text-center text-xs text-gray-100 outline-none focus:border-blue-500"
                />
            </label>

            <button
                type="button"
                onClick={() => onDuplicate(cabinet.id)}
                aria-label={`${cabinet.name} duplizieren`}
                title="Korpus duplizieren"
                className="h-8 w-7 shrink-0 rounded border border-gray-700 bg-gray-800 text-sm text-gray-300 hover:bg-gray-700"
            >
                ⧉
            </button>
        </div>
    );
}
