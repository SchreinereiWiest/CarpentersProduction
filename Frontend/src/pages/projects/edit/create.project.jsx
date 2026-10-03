import SideBar from "../../../components/sideBar"
import ProjectBar from "../../../components/projectBar"

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
import { useLocation } from "react-router";
import { importCadData } from "./importCAD";

function CreateProject() {

    const { id } = useParams();
    const location = useLocation();

    const mode =
        location.state?.mode === "edit"
            ? "edit"
            : "create";

    // -------------------------------------------------
    // Daten vom CabinetEditor
    // -------------------------------------------------
    const cadData = location.state?.cadData ?? location.state?.partList;

    const incomingCabinets =
        location.state?.cabinets ?? null;

    const incomingUserId = location.state?.userId ?? null;

    const [customer, setCustomer] = useState();


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
    
    useEffect(() => {

    if (!cadData) return;

    const corpuses = importCadData(cadData, materials);

    setCorpuses(corpuses);

}, [cadData, materials]);
    
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

    useEffect(() => {

    if (mode !== "create") {
        return;
    }

    // console.log("list", incomingPartList);
    // if (incomingPartList) {

    //     const corpuses = importCadData(incomingPartList, materials);
    //     console.log(corpuses);

    //     setCorpuses(corpuses);
    //     return;

    // }

    if(incomingUserId) {
        const fetchCustomer = async () => {
        const { data } = await axios.get(`/api/customers/get/${incomingUserId}`);
        setCustomer(data.customer);
        fetchCustomer();
    };
    }

}, [
    mode
]);

    return <>
    <div className='bg-gray-900 text-white justify-left h-screen overflow-hidden flex'>

        <SideBar selected={2} />

        <main className="flex-1 overflow-hidden flex flex-col">

            <div className="flex-1 overflow-hidden xl:p-6 p-2">

                <div className="grid grid-cols-[280px_1fr_340px] xl:gap-6 gap-2 h-full">

                    <CorpusLeft EditorState={EditorState} />

                    <CorpusMiddle EditorState={EditorState} />

                    <CorpusRight EditorState={EditorState} mode={mode} id={id} incomingCabinets={incomingCabinets} nCustomer={customer}/>

                </div>

            </div>

        </main>

    </div>
</>
}

export default CreateProject