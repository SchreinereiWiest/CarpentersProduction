

export function CabinetList({
    cabinets,
    activeCabinetId,
    onSelect,
    onDuplicate,
    onQuantityChange,
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
                            <div
                                key={cabinet.id}
                                className={`
                                    flex
                                    items-center
                                    gap-1
                                    rounded
                                    transition
                                    ${
                                        active
                                            ? "bg-gray-800"
                                            : "hover:bg-gray-800/60"
                                    }
                                `}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelect(cabinet.id)}
                                    className="min-w-0 flex-1 px-2 py-2 text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`h-2 w-2 shrink-0 rounded-full ${
                                                active ? "bg-blue-400" : "bg-gray-600"
                                            }`}
                                        />
                                        <span className="truncate text-sm text-gray-200">
                                            {cabinet.name}
                                        </span>
                                    </div>
                                    <div className="ml-4 mt-0.5 text-xs text-gray-500">
                                        {cabinet.width} × {cabinet.height} × {cabinet.depth}
                                    </div>
                                </button>

                                <label className="flex shrink-0 flex-col items-center gap-0.5 text-[10px] text-gray-500">
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={cabinet.quantity ?? 1}
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
                )}

            </div>

        </div>
    );
}
