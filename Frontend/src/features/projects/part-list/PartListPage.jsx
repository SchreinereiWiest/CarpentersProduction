import { useCallback, useState } from 'react'
import SideBar from '../../../shared/components/sideBar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import ProjectBar from '../../../shared/components/projectBar.jsx';
import { loadCadFile } from '../measurement/import/cadLoader.js';
import { processContent } from './listProcess.js';
import { createPartsListPDF } from './createPDF.js';
import {getProjectFile, uploadProjectFile} from "../../../shared/cache/project-cache.js";
import {downloadFile, uploadJSONFile} from "../../../shared/api/file-api.js";
import {
    getProjectRecord,
    updateLocalProjectRecord
} from "../../../shared/projects/project-records.js";

function ListMaterial() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [notes, setNotes] = useState("");

    const [processedContent, setProcessedContent] = useState();

    const [updating, setUpdating] = useState(false);

    // Projektdaten und gespeicherte Notiz laden.
    useEffect(() => {
        const fetchProject = async () => {
        const loadedProject = await getProjectRecord(projectId);
        setProject(loadedProject);
        setNotes(loadedProject.internalNotes ?? "");
  
    };

    fetchProject();
    }, [projectId]);


    const UploadData = useCallback(async () => {
        // Datei existiert nicht

        const cadFiles = project?.files?.filter(file =>
            file.fileName?.startsWith("Planung.json") ||
            file.mimeType?.startsWith("model/gltf-binary")
        ) ?? [];

        const load = async () => {

            const jsonFile = cadFiles.find(file =>
                file.fileName
                    .toLowerCase()
                    .endsWith(".json")
                );

                if (!jsonFile) return;

                const result = await loadCadFile(jsonFile);
                return result;
                
            };
        
                

                const contentData = await load();

                if(!contentData) return;
                
                const generatedData = processContent(contentData);
                setProcessedContent(generatedData);
                
                if (!generatedData) return;

                const response = await uploadProjectFile({
                
                            projectId,
                
                            file: "list.json",
                
                            data: generatedData,
                            
                            uploadFunction: {upload: uploadJSONFile, path:`/api/projects/generated/${projectId}/list`}
                        });

                return response?.data ?? generatedData;


    }, [project, projectId]);

    async function handleUpdate() {
        if (!project || updating) return;

        setUpdating(true);

        try {
            const data = project.localOnly
                ? await updateLocalProjectRecord(projectId, { internalNotes: notes })
                : (await axios.put(`/api/projects/update/${projectId}`, {
                    customerId: project.customerId,
                    title: project.title,
                    description: project.description,
                    status: project.status,
                    internalNotes: notes
                })).data;

            setProject((currentProject) => ({
                ...currentProject,
                ...data,
                files: currentProject.files
            }));
            await UploadData();
        } catch (error) {
            console.error("Liste und Notizen konnten nicht aktualisiert werden", error);
        } finally {
            setUpdating(false);
        }
    }

    //load generated data from server if exists, otherwise create and upload new data
    useEffect(() => {

        if (!projectId) {
            return;
        }

        const loadGeneratedData = async () => {

            try {

                const data =
                    await getProjectFile({

                        projectId,

                        file: "list.json",

                        loadFromServer: {download: downloadFile, path:`/api/projects/generated/${projectId}/list`}

                    });

                // Datei existiert bereits
                if (data) {
        
                    setProcessedContent(data);

                    return;

                }
                //datei existiert nicht -> neu erstellen un hochladen
                await UploadData();

            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            }

        };


        loadGeneratedData();

    }, [projectId, UploadData]);


const leftItems = processedContent?.filter(
        item => item.Children.length > 0
    );

return (<div className="bg-gray-900 text-white h-screen flex overflow-hidden overscroll-none">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={3}/>
        </div>

        {/* nur dieser Bereich scrollt */}
        <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">

            {/* LINKER BEREICH */}
            <div className="w-full p-3 sm:p-5 lg:w-2/3 xl:p-8">

                {leftItems?.map((item) => (

                <div className="bg-gray-800 xl:rounded-xl rounded-md xl:p-5 p-4 shadow-lg xl:mb-4 mb-2" key={item.PID}>

                    <div className="flex justify-between items-center">

                        <div>

                            <h2 className="xl:text-2xl text-lg font-semibold">
                                {item.Objektname}
                            </h2>

                            <p className="text-gray-400">
                                {item.L} × {item.B} × {item.T}
                            </p>

                        </div>

                        <div className="xl:text-xl text-lg font-semibold">
                            Stück {item.Anzahl}
                        </div>

                    </div>

                    <table className="responsive-card-table mt-2 w-full">

                        <thead>

                            <tr className="border-b border-gray-700 text-gray-400">

                                <th className="text-left py-2">Bauteil</th>
                                <th className="text-left">Material</th>
                                <th className="text-center">L</th>
                                <th className="text-center">B</th>
                                <th className="text-center">T</th>
                                <th className="text-center">Menge</th>

                            </tr>

                        </thead>

                        <tbody>

                            {item.Children.map((child) => (

                            <tr key={child.PID} className="border-b border-gray-700 hover:bg-gray-700 transition">

                                <td data-label="Bauteil" className="py-2">
                                    {child.Objektname}
                                    {child.Herkunftsobjekt && (
                                        <span className="ml-2 text-sm text-gray-400">
                                            ({child.Herkunftsobjekt})
                                        </span>
                                    )}
                                </td>

                                <td data-label="Material" className="text-gray-300">
                                    {child.MID || "-"}
                                </td>

                                <td data-label="L" className="text-center">
                                    {child.L}
                                </td>

                                <td data-label="B" className="text-center">
                                    {child.B}
                                </td>

                                <td data-label="T" className="text-center">
                                    {child.T}
                                </td>

                                <td data-label="Menge" className="text-center">
                                    {child.Anzahl}
                                </td>

                            </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

                ))}

            </div>

            {/* RECHTER BEREICH */}

            <div className="w-full min-w-0 border-t border-gray-700 p-3 sm:p-5 lg:w-1/3 lg:border-l lg:border-t-0 xl:p-8">

    <div className="flex flex-col gap-3">

        {/* 1. Zeile – Buttons */}
        <div className="flex flex-wrap gap-2">

            <button
                onClick={() => createPartsListPDF(processedContent)}
                className="
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-4
                    py-2
                    whitespace-nowrap
                    text-gray-400
                    transition-all
                    duration-200
                    hover:bg-gray-700
                    hover:text-white
                "
            >
                PDF
            </button>

            <button
                onClick={() => navigate(`/projects/create/${projectId}`, {
                    state: {
                        mode: "edit",
                        cadData: processedContent
                    }
                })}
                className="
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-4
                    py-2
                    whitespace-nowrap
                    text-gray-400
                    transition-all
                    duration-200
                    hover:bg-gray-700
                    hover:text-white
                "
            >
                Editieren
            </button>

            <button
                onClick={handleUpdate}
                disabled={updating || !project}
                className="
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-4
                    py-2
                    whitespace-nowrap
                    text-gray-400
                    transition-all
                    duration-200
                    hover:bg-gray-700
                    hover:text-white
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                "
            >
                {updating ? "Update …" : "Update"}
            </button>

        </div>

        {/* 2. Zeile */}
        <h2 className="xl:text-2xl text-lg font-semibold">
            Notizen
        </h2>

    </div>

                <textarea
                    aria-label="Notizen"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Notizen zur Teileliste …"
                    className="mt-4 min-h-64 w-full resize-y rounded-lg border border-gray-700 bg-gray-800 p-4 text-gray-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

            </div>

        </div>

    </main>

</div>
);
}

export default ListMaterial 
