import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "./helper";
import { useCorpus } from "./useProjectEditor";

export default function CorpusLeft ({EditorState}) {

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
    Linke Seite - Korpusse
    ======================================== */}

    <div className="
                            rounded-xl
                            bg-gray-800
                            flex
                            flex-col
                            overflow-hidden
                        " onClick={()=> setActiveCorpus(null)}>

        <div className="
                                flex
                                items-center
                                justify-between
                                p-5
                                border-b
                                border-gray-700
                            ">

            <h2 className="text-xl font-semibold">

                Korpusse

            </h2>

            <button className="
                                        rounded-lg
                                        bg-blue-600
                                        px-4
                                        py-3
                                        hover:bg-blue-500
                                    " onClick={(e)=> {
                e.stopPropagation();
                createCorpus();}
                }>

                +

            </button>

        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">

            {

            corpuses.map(corpus => (

            <button key={corpus.id} onClick={(e)=> {
                e.stopPropagation();

                if(corpus.type=="corpus") {
                setSelectedName("");
                setSelectedHeigth("");
                setSelectedWidth("");
                setSelectedDepth("");
                setSelectedQuantity("");
                setSelectedPreset("def");
                setKorpusMaterialId(corpus.MID);
                setActiveCorpus(corpus);
                } else {
                setSelectedName(corpus.name);
                setSelectedHeigth(corpus.height);
                setSelectedWidth(corpus.width);
                setSelectedDepth(corpus.depth);
                setSelectedPreset(corpus.preset);
                setSelectedQuantity(corpus.quantity);
                setKorpusMaterialId(corpus.MID);
                setActiveCorpus(corpus);
                }
                }

                }

                className={`
                w-full
                rounded-lg
                px-4
                py-3
                text-left
                transition

                ${
                activeCorpus?.id === corpus.id

                ? "bg-blue-600"

                : "bg-gray-700 hover:bg-gray-600"
                }
                `}

                >

                <div className="flex justify-between">
                    <div className="font-medium">

                        {corpus.name} x {corpus.quantity}

                    </div>

                    <div>
                        {corpus.height} | {corpus.width} | {corpus.depth}
                    </div>
                </div>

                {corpus.type=="corpus" ? <div className="text-sm text-gray-300">

                    {corpus.Children.length} Platten

                </div> : <></>}

            </button>

            ))

            }

        </div>

        <div className="
                                border-t
                                border-gray-700
                                p-5
                            ">

            <button className="
                                    w-full
                                    rounded-lg
                                    bg-green-600
                                    py-3
                                    font-semibold
                                    hover:bg-green-500
                                " onClick={(e)=> {createCorpus(null, "Plate")}}>

                + Platte hinzufügen

            </button>

        </div>
    </div>
</>
}
