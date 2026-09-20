

export function MaterialSelect({
    label,
    value,
    materials,
    loading,
    error,
    onChange
}) {

    return (

        <label className="block">

            <span className="text-xs text-gray-400">
                {label}
            </span>

            <select
                value={value ?? ""}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                disabled={loading || !!error}
                className="
                    mt-1
                    w-full
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-900
                    px-3
                    py-2
                    text-white
                    focus:border-blue-500
                    focus:outline-none
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                "
            >

                <option value="">
                    Material auswählen...
                </option>

                {materials.map(material => (

                    <option
                        key={material.id}
                        value={material.id}
                    >
                        {material.materialNumber}
                        {" "}
                        ({material.thickness} mm)
                    </option>

                ))}

            </select>

            {error && (

                <div className="mt-1 text-xs text-red-400">
                    {error}
                </div>

            )}

        </label>

    );
}