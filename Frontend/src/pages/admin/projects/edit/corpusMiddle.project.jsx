import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "./helper";
import { useCorpus } from "./useProjectEditor";


export default function CorpusMiddle ({EditorState}) {

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
    Mitte
    ======================================== */}

    <div className="
                    rounded-xl
                    bg-gray-800
                    flex    
                    flex-col
                    overflow-hidden
                ">

        <div className={KorpusEdit ? ` p-6 border-b border-orange-700 ` : ` p-6 border-b border-gray-700 `}>

            <div className="flex justify-between">

                <input placeholder="Name" className={KorpusEdit ? ` rounded-lg bg-gray-900 border border-orange-700 p-3
                    ` : ` rounded-lg bg-gray-900 p-3 `} type="text" value={selectedName} onChange={(e)=>
                setSelectedName(e.target.value)
                }

                placeholder={activeCorpus == null | KorpusEdit ? "Korpusname" : "Plattenname"}
                />

                <div className="flex">

                    <input placeholder="Anzahl" className={KorpusEdit ? ` rounded-lg bg-gray-900 border
                        border-orange-700 p-3 mr-3 ` : ` rounded-lg bg-gray-900 p-3 mr-3 `} type="number"
                        value={selectedQuantity} onChange={(e)=>
                    setSelectedQuantity(e.target.value)
                    }/>

                    {activeCorpus == null | KorpusEdit ? <div className="">

                        <select value={selectedPreset} onChange={(e)=>
                            setSelectedPreset(e.target.value)
                            }

                            className={KorpusEdit ? `
                            w-full
                            rounded-lg
                            border
                            border-orange-700
                            bg-gray-900
                            px-3
                            py-3
                            text-white
                            focus:border-blue-500
                            focus:outline-none
                            ` : `
                            w-full
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-900
                            px-3
                            py-3
                            text-white
                            focus:border-blue-500
                            focus:outline-none
                            `}

                            >

                            {

                            corpusPresets.map(preset => (

                            <option key={preset.id} value={preset.id}>

                                {preset.name}

                            </option>

                            ))

                            }

                        </select>

                    </div> : <div className="">

                        <select value={selectedPreset} onChange={(e)=> {
                            setSelectedPreset(e.target.value);
                            updateInput(e.target.value);
                            }
                            }

                            className="
                            w-full
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-900
                            px-3
                            py-3
                            text-white
                            focus:border-blue-500
                            focus:outline-none
                            ">

                            {

                            platePresets.map(preset => (

                            <option key={preset.id} value={preset.id}>

                                {preset.name}

                            </option>

                            ))

                            }

                        </select>

                    </div>}

                </div>
            </div>

            <div className="
                            mt-6
                            grid
                            grid-cols-3
                            gap-4
                        ">
                <input placeholder="Höhe" className={KorpusEdit ? ` rounded-lg bg-gray-900 border border-orange-700 p-3
                    ` : ` rounded-lg bg-gray-900 p-3 `} type="text" value={selectedHeigth} onChange={(e)=>
                setSelectedHeigth(e.target.value)
                }/>

                <input placeholder="Breite" className={KorpusEdit ? ` rounded-lg bg-gray-900 border border-orange-700
                    p-3 ` : ` rounded-lg bg-gray-900 p-3 `} type="text" value={selectedWidth} onChange={(e)=>
                setSelectedWidth(e.target.value)
                }/>

                <input placeholder="Tiefe" className={KorpusEdit ? ` rounded-lg bg-gray-900 border border-orange-700 p-3
                    ` : ` rounded-lg bg-gray-900 p-3 `} type="text" value={selectedDepth} onChange={(e)=>
                setSelectedDepth(e.target.value)
                }/>

            </div>

        </div>

        <div className="
    flex-1
    overflow-y-auto
    p-5
    space-y-3
" onClick={()=> setActivePlate(null)}>

            {

            activeCorpus?.Children.map(child => (

            <button key={child.id} className={` w-full rounded-lg px-4 py-3 text-left transition ${
                activePlate?.id===child.id ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600" } `} onClick={()=>
                {setActivePlate(child);

                }} onClick={(e)=> {
                e.stopPropagation();
                setSelectedName(child.name);
                setSelectedHeigth(child.height);
                setSelectedWidth(child.width);
                setSelectedDepth(child.depth);
                setSelectedPreset(child.preset);
                setSelectedQuantity(child.quantity);
                setActivePlate(child);
                }

                }>

                <div className="flex justify-between">
                    <div className="font-semibold">

                        {child.name}

                    </div>

                    <div className="">

                        <select value={child.MID ?? "" } onChange={(e)=>
                            updateChildMaterial(child.id, e.target.value)
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

                            {

                            materials.map(material => (

                            <option key={material.id} value={material.id}>

                                {material.materialNumber} ({material.thickness} mm)

                            </option>

                            ))

                            }

                        </select>

                    </div>
                    <div>
                        {child.quantity}
                    </div>

                </div>

                <div className="text-sm text-gray-400">

                    {child.height} x {child.width} × {child.depth}

                </div>

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
                        " onClick={(e)=> {addChildPlate();}}>

                + Platte hinzufügen

            </button>

        </div>

    </div>
</>
}