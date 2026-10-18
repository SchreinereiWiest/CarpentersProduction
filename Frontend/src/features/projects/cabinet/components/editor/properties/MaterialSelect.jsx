import React from "react";


export default function MaterialSelect({
    label,
    value,
    materials = [],
    loading = false,
    error = null,
    onChange
}) {

    return (
        <label className="block">

            {/* =================================================
                Label
            ================================================= */}

            <span className="
                text-xs
                text-gray-400
            ">
                {label}
            </span>


            {/* =================================================
                Select
            ================================================= */}

            <select
                value={value ?? ""}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
                disabled={loading}
                className="
                    mt-1
                    w-full
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-900
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    focus:border-blue-500
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                "
            >

                <option value="">
                    Kein Material
                </option>


                {/* =================================================
                    Materialien
                ================================================= */}

                {materials.map((material) => (

                    <option
                        key={material.id}
                        value={material.id}
                    >
                        {material.name}
                    </option>

                ))}

            </select>


            {/* =================================================
                Ladezustand
            ================================================= */}

            {loading && (

                <div className="
                    mt-1
                    text-xs
                    text-gray-500
                ">
                    Materialien werden geladen ...
                </div>

            )}


            {/* =================================================
                Fehler
            ================================================= */}

            {!loading && error && (

                <div className="
                    mt-1
                    text-xs
                    text-red-400
                ">
                    {error}
                </div>

            )}

        </label>
    );
}