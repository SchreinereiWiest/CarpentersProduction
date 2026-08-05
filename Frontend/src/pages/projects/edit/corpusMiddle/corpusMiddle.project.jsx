import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "../helper";
import { useCorpus } from "../useProjectEditor";


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


function toggleEdge(edge) {

    setSelectedEdges(prev => ({

        ...prev,

        [edge]: !prev[edge]

    }));

}


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

            {activeCorpus?.type == "KO" ? <>{

            activeCorpus?.Children.map(child => (<>
            
                {activePlate?.id===child.id ? <div key={child.id} className={` w-full rounded-lg px-4 py-3 text-left transition ${
                activePlate?.id===child.id ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600" } `}>

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

                    <div className="flex justify-center py-4">

    <div className="grid grid-cols-3 grid-rows-3 gap-2">

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("top");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.top
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            O
        </button>

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("left");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.left
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            L
        </button>

        <div className="
            flex
            items-center
            justify-center
            text-sm
            text-gray-400
        ">
            Platte
        </div>

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("right");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.right
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            R
        </button>

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("bottom");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.bottom
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            U
        </button>

        <div />

    </div>

</div>

                    <div>
                        {child.quantity}
                    </div>

                </div>

                <div className="text-sm text-gray-400">

                    {child.height} x {child.width} × {child.depth}

                </div>

            </div> : <button key={child.id} className={` w-full rounded-lg px-4 py-3 text-left transition ${
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
                setSelectedEdges({
                    top: child.ETID != "",
                    right: child.ERID != "",
                    bottom: child.EBID != "",
                    left: child.ELID != ""
                });
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
            
                        }</>

))

            }</> : <div key={activeCorpus.id} className="w-full rounded-lg px-4 py-3 text-left transition bg-gray-700">

                <div className="flex justify-between">

                    <div className="">

                        <select value={KorpusMaterialId } onChange={(e)=>
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

                            {

                            materials.map(material => (

                            <option key={material.id} value={material.id}>

                                {material.materialNumber} ({material.thickness} mm)

                            </option>

                            ))

                            }

                        </select>

                    </div>

                    <div className="flex justify-center py-4">

    <div className="grid grid-cols-3 grid-rows-3 gap-2">

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("top");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.top
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            O
        </button>

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("left");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.left
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            L
        </button>

        <div className="
            flex
            items-center
            justify-center
            text-sm
            text-gray-400
        ">
            Platte
        </div>

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("right");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.right
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            R
        </button>

        <div />

        <button
            type="button"
            onClick={(e) =>{e.stopPropagation(); toggleEdge("bottom");}}
            className={`
                h-10
                w-10
                rounded-lg
                border
                transition
                ${
                    selectedEdges.bottom
                        ? "bg-orange-600 border-blue-500"
                        : "bg-gray-800 border-gray-700"
                }
            `}
        >
            U
        </button>

        <div />

    </div>

</div>    

                </div>

            </div> 
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
                        " onClick={(e)=> {addChildPlate();
                            setSelectedEdges({
                    top: "",
                    right: "",
                    bottom: "",
                    left: ""
                });
                        }}>

                + Platte hinzufügen

            </button>

        </div>

    </div>
</>
}