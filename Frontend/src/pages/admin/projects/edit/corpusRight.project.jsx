import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "./helper";
import { useCorpus } from "./useProjectEditor";

export default function CorpusRight({EditorState}) {

            const {
    // Auswahl
    corpuses,
    setCorpuses,
    
    activeCorpus,
    setActiveCorpus,

    activePlate,
    setActivePlate,

    // Korpusdaten
    selectedQuantity,
    setSelectedQuantity,

    selectedWidth,
    setSelectedWidth,

    selectedHeigth,
    setSelectedHeigth,

    selectedDepth,
    setSelectedDepth,

    selectedName,
    setSelectedName,

    selectedPreset,
    setSelectedPreset,

    // Material
    KorpusMaterialId,
    setKorpusMaterialId,

    // Bearbeitungsstatus
    KorpusEdit,
    setkorpusEdit,

    // Materialdatenbank
    materials,
    setMaterials,

    // Status
    loading,
    setLoading,

    error,
    setError,

    createCorpus,
    updateInput,
    addChildPlate,
    updateChildMaterial,
    updateChildren

} = EditorState;
return <>
    {/* =======================================
    Rechte Seite
    ======================================== */}

    <div className="
                    rounded-xl
                    bg-gray-800
                    flex
                    flex-col
                    overflow-hidden
                ">

        <div className="
                        border-b
                        border-gray-700
                        p-5
                    ">

            <h2 className="
                            text-xl
                            font-semibold
                        ">

                Material & Kleinteile

            </h2>

        </div>

        <div className="
        flex-1
        overflow-y-auto
        p-5
        space-y-3
    ">
            <div className="mb-4">

                <label className="
        block
        mb-2
        text-sm
        text-gray-400
    ">

                    Material

                </label>

                <select value={KorpusMaterialId} onChange={(e)=>
                    setKorpusMaterialId(e.target.value)
                    }

                    className="
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
                    "

                    >

                    <option value="">
                        Material auswählen...
                    </option>

                    {

                    materials.map(material => (

                    <option key={material.id} value={material.id}>

                        {material.materialNumber} ({material.thickness} mm)

                    </option>

                    ))

                    }

                </select>

            </div>

        </div>

        <div className={activeCorpus ? ` border-t border-gray-700 p-5 ` : <>
</>}>

{activeCorpus?.type == "corpus" && KorpusEdit == false ? <button className="
                            w-full
                            rounded-lg
                            bg-orange-600
                            py-3
                            font-semibold
                            hover:bg-orange-500
                        " onClick={(e)=> {setkorpusEdit(true);
    setSelectedName(activeCorpus.name);
    setSelectedHeigth(activeCorpus.height);
    setSelectedWidth(activeCorpus.width);
    setSelectedDepth(activeCorpus.depth);
    setSelectedPreset(activeCorpus.preset);
    setSelectedQuantity(activeCorpus.quantity);
    }}>

    Korpus Editieren

</button> : activeCorpus?.type == "corpus" && KorpusEdit ? <button className="
                            w-full
                            rounded-lg
                            bg-red-600
                            py-3
                            font-semibold
                            hover:bg-red-500
                        " onClick={(e)=> {setkorpusEdit(false);
    setSelectedName("");
    setSelectedHeigth("");
    setSelectedWidth("");
    setSelectedDepth("");
    setSelectedQuantity("");
    setSelectedPreset("def");
    setActivePlate(null);
    }}>

    Abbrechen

</button>:<></>}

</div>

<div className="
                        border-t
                        border-gray-700
                        p-5
                    ">

    {activePlate ? <button className="
                            w-full
                            rounded-lg
                            bg-green-600
                            py-3
                            font-semibold
                            hover:bg-green-500
                        " onClick={(e)=> {addChildPlate(activePlate.id);}}>

        Platte speichern

    </button> : activeCorpus ? <button className="
                            w-full
                            rounded-lg
                            bg-green-600
                            py-3
                            font-semibold
                            hover:bg-green-500
                        " onClick={(e)=>
        {
        if (KorpusEdit | activeCorpus.type !="corpus") {
        createCorpus(activeCorpus.id, activeCorpus.type);
        }
        setActiveCorpus(null);
        setkorpusEdit(false);

        }}>

        Korpus speichern

    </button> : <button className="
                            w-full
                            rounded-lg
                            bg-green-600
                            py-3
                            font-semibold
                            hover:bg-green-500
                        ">

        Projekt speichern

    </button>}

</div>

</div>
</>
}