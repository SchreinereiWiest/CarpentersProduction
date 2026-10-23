import { useState } from 'react'
import { useNavigate } from 'react-router';

import { ProjectSave } from './uploadProject.js';
import CustomerSearch from './customerSearch.jsx';
import MaterialSelect from '../cabinet/components/editor/properties/MaterialSelect.jsx';


const materialLabel = material =>
    `${material.materialNumber || material.name || "Material"} (${material.thickness} mm)`;

export default function CorpusRight({EditorState, mode, id, incomingCabinets, nCustomer}) {

    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [files, setFiles] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(nCustomer);
    const [renamingCorpusId, setRenamingCorpusId] = useState(null);
    const [corpusName, setCorpusName] = useState("");
    const [savingProject, setSavingProject] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [createdProjectId, setCreatedProjectId] = useState(null);
    
    const navigate = useNavigate();

const {
    corpuses,
    activeCorpus,
    setActiveCorpus,
    activePlate,
    setActivePlate,
    setSelectedQuantity,
    setSelectedWidth,
    setSelectedHeigth,
    setSelectedDepth,
    setSelectedName,
    setSelectedPreset,
    KorpusMaterialId,
    setKorpusMaterialId,
    materials,
    setSelectedEdges,
    addChildPlate,
    deleteCorpus,
    renameCorpus
} = EditorState;

const isRenamingCorpus = renamingCorpusId === activeCorpus?.id;

const submitCorpusName = () => {
    if (!activeCorpus || !renameCorpus(activeCorpus.id, corpusName)) {
        return;
    }

    setRenamingCorpusId(null);
};

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

                <MaterialSelect
                    ariaLabel="Material"
                    value={KorpusMaterialId}
                    materials={materials}
                    emptyLabel="Material auswählen..."
                    getOptionLabel={materialLabel}
                    onChange={setKorpusMaterialId}
                />

                

            </div>
            
            {mode == "edit" ? <></> : <div>
                <CustomerSearch selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} />
                {!selectedCustomer && (
                    <p className="-mt-3 mb-4 text-xs text-amber-300">
                        Ohne Kundenauswahl wird das Projekt ausschließlich lokal auf diesem Gerät gespeichert.
                    </p>
                )}

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

        <div>

{activeCorpus?.type === "KO" && (
    <div className="space-y-3 border-t border-gray-700 p-5">
        {isRenamingCorpus ? (
            <div className="space-y-2">
                <label htmlFor="corpus-name" className="block text-sm text-gray-300">
                    Neuer Name
                </label>
                <input
                    id="corpus-name"
                    autoFocus
                    type="text"
                    value={corpusName}
                    onChange={(e) => setCorpusName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            submitCorpusName();
                        }

                        if (e.key === "Escape") {
                            setCorpusName(activeCorpus.name ?? "");
                            setRenamingCorpusId(null);
                        }
                    }}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        className="rounded-lg bg-gray-600 py-2 font-semibold hover:bg-gray-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCorpusName(activeCorpus.name ?? "");
                            setRenamingCorpusId(null);
                        }}
                    >
                        Abbrechen
                    </button>
                    <button
                        type="button"
                        disabled={!corpusName.trim()}
                        className="rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            submitCorpusName();
                        }}
                    >
                        Speichern
                    </button>
                </div>
            </div>
        ) : (
            <button
                type="button"
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold hover:bg-blue-500"
                onClick={(e) => {
                    e.stopPropagation();
                    setCorpusName(activeCorpus.name ?? "");
                    setRenamingCorpusId(activeCorpus.id);
                }}
            >
                Gruppe / Korpus umbenennen
            </button>
        )}

        <button
            type="button"
            className="w-full rounded-lg bg-red-600 py-3 font-semibold hover:bg-red-500"
            onClick={(e) => {
                e.stopPropagation();

                deleteCorpus(activeCorpus.id);

                setActiveCorpus(null);
                setActivePlate(null);

                setSelectedName("");
                setSelectedHeigth("");
                setSelectedWidth("");
                setSelectedDepth("");
                setSelectedQuantity("1");
                setSelectedPreset("def");
                setKorpusMaterialId("");

                setSelectedEdges({
                    top: "",
                    right: "",
                    bottom: "",
                    left: ""
                });
            }}
        >
            Gruppe löschen
        </button>
    </div>
)}

</div>

<div className="
                        border-t
                        border-gray-700
                        p-5
                    ">

    {activePlate ? (
    <button
        className="w-full rounded-lg bg-green-600 py-3 font-semibold hover:bg-green-500"
        onClick={(e) => {
            e.stopPropagation();

            addChildPlate(activePlate.id);

            setSelectedEdges({
                top: "",
                right: "",
                bottom: "",
                left: ""
            });

            setActivePlate(null);
        }}
    >
        Platte speichern
    </button>
) : activeCorpus ? (
    <button
        className="w-full rounded-lg bg-green-600 py-3 font-semibold hover:bg-green-500"
        onClick={(e) => {
            e.stopPropagation();

            setActiveCorpus(null);
            setActivePlate(null);

            setSelectedName("");
            setSelectedHeigth("");
            setSelectedWidth("");
            setSelectedDepth("");
            setSelectedQuantity("1");
            setSelectedPreset("def");

            setSelectedEdges({
                top: "",
                right: "",
                bottom: "",
                left: ""
            });
        }}
    >
        Gruppe speichern
    </button>
) : (
    <>
    <button
        disabled={savingProject}
        className="w-full rounded-lg bg-green-600 py-3 font-semibold hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={async (e) => {
            e.stopPropagation();

            if (projectName === "" && mode === "create") {
                alert("Bitte geben Sie einen Projektnamen ein.");
                return;
            }

            if (corpuses.length === 0) {
                alert("Bitte fügen Sie mindestens einen Korpus hinzu.");
                return;
            }

            setSavingProject(true);
            setSaveError("");

            try {
                await ProjectSave(
                    corpuses,
                    materials,
                    selectedCustomer,
                    files,
                    projectDescription,
                    projectName,
                    createdProjectId ? "edit" : mode,
                    createdProjectId ?? id,
                    incomingCabinets
                );

                navigate(`/Projects`);
            } catch (error) {
                if (error?.projectId) {
                    setCreatedProjectId(error.projectId);
                }

                setSaveError(
                    error?.response?.data?.message ??
                    "Das Projekt konnte nicht vollständig gespeichert werden. Bitte erneut versuchen."
                );
            } finally {
                setSavingProject(false);
            }
        }}
    >
        {savingProject
            ? "Projekt wird gespeichert ..."
            : "Projekt speichern"
        }
    </button>

    {saveError && (
        <div
            role="alert"
            className="mt-3 rounded-lg border border-red-700 bg-red-950/60 p-3 text-sm text-red-200"
        >
            {saveError}
        </div>
    )}
    </>
)}

</div>

</div>
</>
}
