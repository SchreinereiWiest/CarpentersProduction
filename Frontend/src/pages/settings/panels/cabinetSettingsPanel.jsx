

import React, {
    useState, useEffect
} from "react";
import axios from "axios";

import MaterialSelect from "../../projects/cabinetConfigurator/components/editor/properties/MaterialSelect.jsx";


const DEFAULT_CABINET = {

    width: 600,
    height: 720,
    depth: 535,

    thickness: 19,

    topOffset: 0,
    bottomOffset: 0,

    topExists: true,
    bottomExists: true,

    frontGap: 3,

    frontGapLeft: 0,
    frontGapRight: 0,
    frontGapTop: 0,
    frontGapBottom: 0,

    backPanel: {
        construction: "butt",
        continuous: "side"
    },

    spax: true,
};


export default function CabinetSettingsPanel() {

    const [cabinet, setCabinet] =
        useState(DEFAULT_CABINET);


    const [saving, setSaving] =
        useState(false);

    const [loadSettings, setLoadSettings] = useState(false);


    const update =
        (changes) => {

            setCabinet(
                prev => ({
                    ...prev,
                    ...changes
                })
            );
        };


    const updateBackPanel =
        (changes) => {

            setCabinet(
                prev => ({
                    ...prev,

                    backPanel: {
                        ...prev.backPanel,
                        ...changes
                    }
                })
            );
        };


    const savePreset = async () => {

        setSaving(true);

        try {

        const response =
            await axios.post(

                `/api/settings/cabinet`,

                cabinet,

                {
                    withCredentials:
                        true,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        console.log(
            "Upload response:",
            response.data
        );

    } catch (error) {

        console.error(
            "Error uploading cabinet.json:",
            error
        );

        console.error(
            "Response:",
            error.response?.data
        );
    }
    setSaving(false);
    };

    const [materials, setMaterials] = useState([]);
    
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [materialError, setMaterialError] = useState(null);

    useEffect(() => {
    
            const loadGeneratedData = async () => {
    
                setLoadSettings(true);
    
                try {
    
                    const response = await axios.get(
    
                        `/api/settings/cabinet`,
    
                        {
                            withCredentials: true
                        }
    
                    );
    
                    const {
    
                        exists,
    
                        downloadUrl,
    
                    } = response.data;
    
    
                    // Datei existiert bereits
                    if (exists) {
    
                        try {
                            const fileResponse = await fetch(
                                downloadUrl
                            );
    
                            const data = await fileResponse.json();
    
                            setCabinet(data);
    
                            return;
                        } catch (error) {
                            console.warn("cant fetch data, try new upload");
                        }
    
                    }

                    setCabinet(DEFAULT_CABINET);
    
    
                } catch (error) {
    
                    console.error(
                        "Generated data konnte nicht geladen werden",
                        error
                    );
    
                } finally {
    
                    setLoadSettings(false);
    
                }
    
            };
    
    
            loadGeneratedData();
    
        }, []);

    useEffect(() => {

        const loadMaterials =
            async () => {

            try {

                setLoadingMaterials(true);

                const response =
                    await axios.get(
                        "/api/materials/get"
                    );

                setMaterials(
                    response.data.materials
                );

            } catch (error) {

                console.error(
                    "Materialien konnten nicht geladen werden:",
                    error
                );

                setMaterialError(
                    "Materialien konnten nicht geladen werden."
                );

            } finally {

                setLoadingMaterials(false);

            }

        };

        loadMaterials();

        console.log(materials);

    }, []);

    return (
        <div className="
            h-full
            overflow-y-auto
            p-6
        ">

            <div className="
                max-w-5xl
                space-y-6
            ">


                {/* Header */}

                <div className="
                    flex
                    items-start
                    justify-between
                ">

                    <div>

                        <h1 className="
                            text-lg
                            font-semibold
                        ">
                            Projekt
                        </h1>

                        <p className="
                            mt-1
                            text-sm
                            text-gray-500
                        ">
                            Standardwerte für den CabinetEditor
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={
                            savePreset
                        }
                        disabled={saving}
                        className="
                            rounded
                            bg-blue-600
                            px-4
                            py-2
                            text-sm
                            hover:bg-blue-700
                            disabled:opacity-50
                        "
                    >
                        {saving
                            ? "Speichern..."
                            : "Standardkorpus speichern"}
                    </button>

                </div>


                {/* Maße */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Standardkorpus
                    </h2>


                    <div className="
                        grid
                        grid-cols-4
                        gap-4
                    ">

                        <NumberField
                            label="Breite"
                            value={cabinet.width}
                            onChange={
                                value =>
                                    update({
                                        width: value
                                    })
                            }
                        />

                        <NumberField
                            label="Höhe"
                            value={cabinet.height}
                            onChange={
                                value =>
                                    update({
                                        height: value
                                    })
                            }
                        />

                        <NumberField
                            label="Tiefe"
                            value={cabinet.depth}
                            onChange={
                                value =>
                                    update({
                                        depth: value
                                    })
                            }
                        />

                        <NumberField
                            label="Materialstärke"
                            value={cabinet.thickness}
                            onChange={
                                value =>
                                    update({
                                        thickness: value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Boden / Deckel */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Boden und Deckel
                    </h2>


                    <div className="
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <NumberField
                            label="Bodenabstand"
                            value={
                                cabinet.bottomOffset
                            }
                            onChange={
                                value =>
                                    update({
                                        bottomOffset:
                                            value
                                    })
                            }
                        />


                        <NumberField
                            label="Deckelabstand"
                            value={
                                cabinet.topOffset
                            }
                            onChange={
                                value =>
                                    update({
                                        topOffset:
                                            value
                                    })
                            }
                        />

                    </div>


                    <div className="
                        mt-4
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <Checkbox
                            checked={
                                cabinet.bottomExists
                            }
                            label="Boden vorhanden"
                            onChange={
                                value =>
                                    update({
                                        bottomExists:
                                            value
                                    })
                            }
                        />

                        <Checkbox
                            checked={
                                cabinet.topExists
                            }
                            label="Deckel vorhanden"
                            onChange={
                                value =>
                                    update({
                                        topExists:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Fronten */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Fronten
                    </h2>


                    <div className="
                        grid
                        grid-cols-5
                        gap-3
                    ">

                        <NumberField
                            label="Fuge"
                            value={
                                cabinet.frontGap
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGap:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Links"
                            value={
                                cabinet.frontGapLeft
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapLeft:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Rechts"
                            value={
                                cabinet.frontGapRight
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapRight:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Oben"
                            value={
                                cabinet.frontGapTop
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapTop:
                                            value
                                    })
                            }
                        />

                        <NumberField
                            label="Unten"
                            value={
                                cabinet.frontGapBottom
                            }
                            onChange={
                                value =>
                                    update({
                                        frontGapBottom:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Rückwand */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Rückwand
                    </h2>


                    <div className="
                        grid
                        grid-cols-2
                        gap-4
                    ">

                        <SelectField
                            label="Ausführung"
                            value={
                                cabinet.backPanel.construction
                            }
                            options={[
                                ["butt", "Stumpf"],
                                ["rabbet", "Falz"],
                                ["groove", "Nut geschlossen"],
                                ["grooveOpen", "Nut oben offen"]
                            ]}
                            onChange={
                                value =>
                                    updateBackPanel({
                                        construction:
                                            value
                                    })
                            }
                        />


                        <SelectField
                            label="Durchgehend"
                            value={
                                cabinet.backPanel.continuous
                            }
                            options={[
                                ["side", "Seite durchgehend"],
                                ["bottom", "Boden durchgehend"]
                            ]}
                            onChange={
                                value =>
                                    updateBackPanel({
                                        continuous:
                                            value
                                    })
                            }
                        />

                    </div>

                </section>


                {/* Material */}

                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <h2 className="
                        font-medium
                        mb-4
                    ">
                        Standardmaterialien
                    </h2>

                    <MaterialSelect
                        label="Korpusmaterial"
                        value={
                            cabinet.materialId
                        }
                        materials={
                            materials
                        }
                        loading={
                            loadingMaterials
                        }
                        error={
                            materialError
                        }
                        onChange={(value) =>
                            update({
                                materialId: value,
                                frontMaterialId: value,
                                frontEdgeMaterialId: value
                            })
                        }
                    />

                </section>


            </div>

        </div>
    );
}


function NumberField({
    label,
    value,
    onChange
}) {

    return (
        <label className="block">

            <span className="
                block
                text-xs
                text-gray-500
                mb-1
            ">
                {label}
            </span>

            <div className="
                flex
                items-center
                gap-2
            ">

                <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={value ?? 0}
                    onChange={
                        event =>
                            onChange(
                                Math.max(
                                    0,
                                    Number(
                                        event.target.value
                                    ) || 0
                                )
                            )
                    }
                    className="
                        w-full
                        rounded
                        border
                        border-gray-700
                        bg-gray-900
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                    "
                />

                <span className="
                    text-xs
                    text-gray-600
                ">
                    mm
                </span>

            </div>

        </label>
    );
}


function Checkbox({
    checked,
    label,
    onChange
}) {

    return (
        <label className="
            flex
            items-center
            gap-2
            text-sm
            text-gray-300
        ">

            <input
                type="checkbox"
                checked={checked}
                onChange={
                    event =>
                        onChange(
                            event.target.checked
                        )
                }
                className="
                    h-4
                    w-4
                "
            />

            {label}

        </label>
    );
}


function SelectField({
    label,
    value,
    options,
    onChange
}) {

    return (
        <label className="block">

            <span className="
                block
                text-xs
                text-gray-500
                mb-1
            ">
                {label}
            </span>

            <select
                value={value}
                onChange={
                    event =>
                        onChange(
                            event.target.value
                        )
                }
                className="
                    w-full
                    rounded
                    border
                    border-gray-700
                    bg-gray-900
                    px-3
                    py-2
                    text-sm
                    text-white
                "
            >
                {options.map(
                    ([value, label]) => (
                        <option
                            key={value}
                            value={value}
                        >
                            {label}
                        </option>
                    )
                )}
            </select>

        </label>
    );
}