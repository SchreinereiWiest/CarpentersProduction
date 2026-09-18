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

    EdgeMaterialId,
    setEdgeMaterialId,

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

    selectedEdges,
    setSelectedEdges,

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
                                xl:p-5 p-2
                                border-b
                                border-gray-700
                            ">

            <h2 className="xl:text-xl text-xl ml-2 font-semibold">

                Korpusse

            </h2>

            <button className="
                                        rounded-lg
                                        bg-blue-600
                                        xl:px-4 px-3
                                        xl:py-3 py-2
                                        hover:bg-blue-500
                                    " onClick={(e)=> {
                e.stopPropagation();
                createCorpus();}
                }>

                +

            </button>

        </div>

        <div className="flex-1 overflow-y-auto xl:p-3 p-2 xl:space-y-2 space-y-1">

            {

            corpuses.map(corpus => (

            <button key={corpus.id} onClick={(e)=> {
                e.stopPropagation();

                if(corpus.type=="KO") {
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
                xl:px-4 px-2
                xl:py-3 py-2
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
                    <div className="font-medium xl:text-lm text-md">

                        {corpus.name} x {corpus.quantity}

                    </div>

                    <div>
                        {corpus.height} | {corpus.width} | {corpus.depth}
                    </div>
                </div>

                {corpus.type=="KO" ? <div className="text-sm text-gray-300">

                    {corpus.Children.length} Platten

                </div> : <></>}

            </button>

            ))

            }

        </div>

        <div className="
                                border-t
                                border-gray-700
                                xl:p-5 p-2
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
