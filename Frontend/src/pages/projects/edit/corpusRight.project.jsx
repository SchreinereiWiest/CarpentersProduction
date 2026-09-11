import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "./helper";
import { useCorpus } from "./useProjectEditor";
import { ProjectSave } from './uploadProject';
import CustomerSearch from './customerSearch.project';

export default function CorpusRight({EditorState, mode, id}) {

    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [files, setFiles] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    const navigate = useNavigate();

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
    updateChildren,
    deleteCorpus

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
            <div className="mb-12">

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
            
            {mode == "edit" ? <></> : <div>
                <CustomerSearch selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} />

<input placeholder="Name" className="mt-4 rounded-lg bg-gray-900 p-3 w-full" type="text" value={projectName} onChange={(e)=>
setProjectName(e.target.value)
}
/>

<textarea name="projectDescription" id="projectDescription" placeholder="Project Description" value={projectDescription}
    onChange={(e)=> setProjectDescription(e.target.value)}
                                className=" mt-4 rounded-lg bg-gray-900 p-3 w-full"
                            />

                            <div className="w-full">
                            <div
                                className=" mt-4 relative h-36 rounded-lg bg-gray-900 p-3 w-full flex justify-center items-center">

                                <div className="absolute">

                                    <div className="flex flex-col items-center">
                                        <i className="fa fa-folder-open fa-4x text-gray-400"></i>
                                        <span className="block text-gray-400 font-normal">Attach Images Here</span>
                                    </div>
                                </div>

                                <input className="w-full h-full opacity-0" type="file" multiple accept='.jpg, .png .glb' onChange={(e)=>{
                                setFiles(Array.from(e.target.files));
                                }}
                                />

                            </div>
                        </div>

                        <div className="space-y-2">

                    {files.map(file=>(
                    <div key={file.name} className="bg-gray-700 rounded p-2 w-full">
                        {file.name}
                    </div>
                    ))}

                </div> 
                
                </div>}

        </div>

        <div className={activeCorpus ? ` border-t border-gray-700 p-5 ` : <>
</>}>

{activeCorpus && KorpusEdit == false ? <button className="
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

</button> : activeCorpus && KorpusEdit ? <div className='flex justify-between gap-4'><button className="
                            w-full
                            rounded-lg
                            bg-orange-600
                            py-3
                            font-semibold
                            hover:bg-orange-500
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

</button><button className="
                            w-full
                            rounded-lg
                            bg-red-600
                            py-3
                            font-semibold
                            hover:bg-red-500
                        " onClick={(e)=> {
                            console.log(activeCorpus, corpuses);
    deleteCorpus(activeCorpus.id);
    setkorpusEdit(false);
    setSelectedName("");
    setSelectedHeigth("");
    setSelectedWidth("");
    setSelectedDepth("");
    setSelectedQuantity("");
    setSelectedPreset("def");
    setActivePlate(null);
    }}>

    Löschen

</button></div> : <></>}

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
                        " onClick={(e)=> {addChildPlate(activePlate.id);
                            setSelectedEdges({
                    top: "",
                    right: "",
                    bottom: "",
                    left: ""
                });
                        }}>

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
        if (KorpusEdit | activeCorpus.type !="KO") {
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
                        " onClick={(e) => {
                            console.log("corpus", corpuses);
                            // if(selectedCustomer == null && mode == "create") {
                            //     alert("Bitte wählen Sie einen Kunden aus.");
                            //     return;
                            // }
                            if(projectName == "" && mode == "create") {
                                alert("Bitte geben Sie einen Projektnamen ein.");
                                return;
                            }
                            if(corpuses.length == 0) {
                                alert("Bitte fügen Sie mindestens einen Korpus hinzu.");
                                return;
                            }
                            console.log(selectedCustomer);
                            ProjectSave(corpuses, materials, selectedCustomer, files, projectDescription, projectName, mode, id);
                            navigate(`/Projects`);
                        }}>

        Projekt speichern

    </button>}

</div>

</div>
</>
}