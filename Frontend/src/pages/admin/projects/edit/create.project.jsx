import SideBar from "../../../../components/sideBar"
import ProjectBar from "../../../../components/projectBar"

import { useState, useEffect } from 'react'
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

import { corpusPresets, platePresets } from "./helper";
import { useCorpus } from "./useProjectEditor";
import CorpusLeft from "./corpusLeft.project";
import CorpusMiddle from "./corpusMiddle.project";
import CorpusRight from "./corpusRight.project";

function CreateProject() {
    const EditorState = useCorpus();

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
    
    
    useEffect(() => {
    
    const loadMaterials =
    async () => {
    
    try {
    
    setLoading(true);
    
    const response = await axios.get("/api/materials/get");
    
    setMaterials(
    response.data.materials
    );
    
    } catch (error) {
    
    console.error(
    "Materialien konnten nicht geladen werden:",
    error
    );
    
    setError(
    "Materialien konnten nicht geladen werden."
    );
    
    } finally {
    
    setLoading(false);
    
    }
    
    };
    
    loadMaterials();
    
    }, []);

    return <>
    <div className='bg-gray-900 text-white justify-left h-screen overflow-hidden flex'>

        <SideBar selected={2} />

        <main className="flex-1 overflow-hidden flex flex-col">

            <div className="flex-1 overflow-hidden p-6">

                <div className="grid grid-cols-[280px_1fr_340px] gap-6 h-full">

                    <CorpusLeft EditorState={EditorState} />

                    <CorpusMiddle EditorState={EditorState} />

                    <CorpusRight EditorState={EditorState} />

                </div>

            </div>

        </main>

    </div>
</>
}

export default CreateProject