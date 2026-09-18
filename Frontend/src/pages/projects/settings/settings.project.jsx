
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axios from "axios";

import SideBar from '../../../components/sideBar.jsx';
import ProjectBar from '../../../components/projectBar.jsx';
import CustomerSearch from "../edit/customerSearch.project.jsx";
import DeleteConfirm from "./deleteConfirm.project.jsx";


export default function ProjectSettings() {

    const { projectId } = useParams();

    const navigate = useNavigate();

    const [projectName, setProjectName] =
        useState("");

    const [projectDescription, setProjectDescription] =
        useState("");

    const [projectState, setProjectState] =
        useState("active");

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [projectFiles, setProjectFiles] =
        useState([]);

    const [newFiles, setNewFiles] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);


    // --------------------------------------------------
    // Load project
    // --------------------------------------------------

    useEffect(() => {

        console.log("Lade Projekt:", projectId);

        const fetchProject = async () => {

            try {

                const { data } = await axios.get(`/api/projects/get/${projectId}`);

                const project = data.project;

                console.log("Projekt geladen:", project);


                setProjectName(
                    project.title ?? ""
                );


                setProjectDescription(
                    project.description ?? ""
                );


                setProjectState(
                    project.status ?? "active"
                );


                setProjectFiles(
                    project.files ?? []
                );

                const customerdata = await axios.get(`/api/customers/get/${project.customerId}`);
                setSelectedCustomer(customerdata.data.customer);
            } catch (error) {

                console.error(
                    "Projekt konnte nicht geladen werden:",
                    error
                );

            } finally {

                setLoading(false);

            }

        };


        if (projectId) {
            fetchProject();
        }

    }, [projectId]);


    // --------------------------------------------------
    // Save project
    // --------------------------------------------------
    
    const handleSubmit = async (e) => {

        e.preventDefault();

        if(selectedCustomer?.id && projectName) {

            setSaving(true);

            try {

                /*
                * Projektinformationen speichern
                */
                
                await axios.put(
                    `/api/projects/update/${projectId}`,
                    {
                        customerId: selectedCustomer?.id,
                        title: projectName,
                        description: projectDescription,
                        status: projectState
                    }
                );
            

                /*
                * Neue Dateien hochladen
                */

                if (newFiles.length > 0) {

                    for (const file of newFiles) {
                        let mimeType = file.type;

                        if (mimeType == "" | !mimeType) {

                            const extension = file.name.split(".").pop().toLowerCase();

                            switch (extension) {

                                case "glb":
                                    mimeType = "model/gltf-binary";
                                    break;

                                case "gltf":
                                    mimeType = "model/gltf+json";
                                    break;
                            }
                        }

                        const formData = new FormData();

                        formData.append("file", file);
                        formData.append("entityId", projectId);
                        formData.append("customerId", selectedCustomer?.id);
                        formData.append("entity", "project");
                        formData.append("fileName", file.name);
                        formData.append("mimeType", mimeType);
                        formData.append("fileSize", file.size);

                        const response = await axios.post(
                            "/api/files/upload",
                            formData
                        );

                        console.log("response", response.data.fileEntry.id);
                        
                    }
                

                }


                /*
                * Neue Dateien zurücksetzen
                */
                setNewFiles([]);


                /*
                * Projekt neu laden
                */
            const { data } = await axios.get(`/api/projects/get/${projectId}`);

                    const project = data.project;

                    console.log("Projekt geladen:", project);


                setProjectFiles(
                    project.files ?? []
                );


            } catch (error) {

                console.error(
                    "Projekt konnte nicht gespeichert werden:",
                    error
                );

            } finally {

                setSaving(false);

            }
        } else {

            alert(
                "Bitte wähle einen Kunden aus und gib einen Projektnamen ein."
            );}
    };

    // --------------------------------------------------
    // Delete file
    // --------------------------------------------------

    const handleDeleteFile = async (
        file
    ) => {

        // const confirmed =
        //     window.confirm(
        //         `Datei "${file.name}" wirklich löschen?`
        //     );


        // if (!confirmed) {
        //     return;
        // }


        try {

            await axios.delete(
                `/api/files/delete/${file.id}`
            );


            setProjectFiles(
                currentFiles =>
                    currentFiles.filter(
                        currentFile =>
                            currentFile.id !==
                            file.id
                    )
            );


        } catch (error) {

            console.error(
                "Datei konnte nicht gelöscht werden:",
                error
            );

        }

    };

    // --------------------------------------------------
    // Delete project
    // --------------------------------------------------

    const handleDeleteProject =
        async () => {


            setDeleting(true);


            try {

                await axios.delete(
                    `/api/projects/delete/${projectId}`
                );


                navigate(
                    "/Projects"
                );


            } catch (error) {

                console.error(
                    "Projekt konnte nicht gelöscht werden:",
                    error
                );

                setDeleting(false);

            }

        };


    // --------------------------------------------------
    // Loading
    // --------------------------------------------------

    if (loading) {

        return (

            <div className="bg-gray-900 text-white h-screen flex">

                <SideBar selected={2} />

                <main className="flex-1 flex flex-col">

                    <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">

                        <ProjectBar selected={7} />

                    </div>


                    <div className="flex-1 flex items-center justify-center">

                        <div className="text-gray-400">

                            Projekt wird geladen...

                        </div>

                    </div>

                </main>

            </div>

        );

    }


    // --------------------------------------------------
    // View
    // --------------------------------------------------

    return (

        <div className="bg-gray-900 text-white h-screen flex overflow-hidden">


            <SideBar selected={2} />


            <main className="flex-1 flex flex-col overflow-hidden">


                {/* Project navigation */}

                <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">

                    <ProjectBar selected={8} />

                </div>


                {/* Scrollable content */}

                <div className="flex-1 overflow-y-auto">

                    {showDeleteModal && (
                        <DeleteConfirm
                            setShowDeleteModal={setShowDeleteModal}
                            handleDeleteProject={handleDeleteProject}
                            deleting={deleting}
                        />
                    )}


                    <div className="max-w-6xl mx-auto px-8 py-8">


                        {/* -------------------------------- */}
                        {/* Header */}
                        {/* -------------------------------- */}

                        <div className="xl:mb-8 mb-4">

                            <h1 className="text-2xl font-semibold">

                                Projekteinstellungen

                            </h1>


                            <p className="text-gray-400 mt-1">

                                Projektinformationen und Dateien verwalten

                            </p>

                        </div>


                        {/* -------------------------------- */}
                        {/* Project status */}
                        {/* -------------------------------- */}

                        <section className="bg-gray-800 border border-gray-700 rounded-xl xl:p-6 p-4 xl:mb-6 mb-4">

                            <div className="mb-5">

                                <h2 className="text-lg font-semibold">

                                    Projektstatus

                                </h2>


                                <p className="text-sm text-gray-400 mt-1">

                                    Lege fest, in welchem Zustand sich das Projekt befindet.

                                </p>

                            </div>


                            <div className="grid grid-cols-3 gap-3">


                                {/* Active */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setProjectState("active")
                                    }
                                    className={`
                                        rounded-lg
                                        border
                                        p-4
                                        text-left
                                        transition
                                        ${projectState === "active"
                                            ? "border-green-500 bg-green-500/10"
                                            : "border-gray-700 bg-gray-900 hover:bg-gray-700"
                                        }
                                    `}
                                >

                                    <div className="flex items-center gap-3">

                                        <div className="w-3 h-3 rounded-full bg-green-500" />

                                        <span className="font-medium">

                                            Aktiv

                                        </span>

                                    </div>


                                    <p className="text-xs text-gray-400 mt-2">

                                        Projekt befindet sich in Bearbeitung.

                                    </p>

                                </button>


                                {/* Inactive */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setProjectState("inactive")
                                    }
                                    className={`
                                        rounded-lg
                                        border
                                        p-4
                                        text-left
                                        transition
                                        ${projectState === "inactive"
                                            ? "border-yellow-500 bg-yellow-500/10"
                                            : "border-gray-700 bg-gray-900 hover:bg-gray-700"
                                        }
                                    `}
                                >

                                    <div className="flex items-center gap-3">

                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />

                                        <span className="font-medium">

                                            Inaktiv

                                        </span>

                                    </div>


                                    <p className="text-xs text-gray-400 mt-2">

                                        Projekt ist momentan pausiert.

                                    </p>

                                </button>


                                {/* Archive */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setProjectState("archive")
                                    }
                                    className={`
                                        rounded-lg
                                        border
                                        p-4
                                        text-left
                                        transition
                                        ${projectState === "archive"
                                            ? "border-gray-400 bg-gray-700"
                                            : "border-gray-700 bg-gray-900 hover:bg-gray-700"
                                        }
                                    `}
                                >

                                    <div className="flex items-center gap-3">

                                        <div className="w-3 h-3 rounded-full bg-gray-500" />

                                        <span className="font-medium">

                                            Archiv

                                        </span>

                                    </div>


                                    <p className="text-xs text-gray-400 mt-2">

                                        Projekt wurde abgeschlossen.

                                    </p>

                                </button>


                            </div>

                        </section>


                        {/* -------------------------------- */}
                        {/* Edit project */}
                        {/* -------------------------------- */}

                        <section className="bg-gray-800 border border-gray-700 rounded-xl xl:p-6 p-4 xl:mb-6 mb-4">


                            <div className="mb-6">

                                <h2 className="text-lg font-semibold">

                                    Projekt bearbeiten

                                </h2>


                                <p className="text-sm text-gray-400 mt-1">

                                    Name, Beschreibung und Projektdateien bearbeiten.

                                </p>

                            </div>


                            <form
                                onSubmit={
                                    handleSubmit
                                }
                                className="flex flex-col"
                            >


                                {/* Project name */}

                                <div className="mb-5 w-full max-w-xl">

                                    <label className="block text-sm font-medium text-gray-300 mb-2">

                                        Projektname

                                    </label>


                                    <input
                                        type="text"
                                        name="projectName"
                                        value={projectName}
                                        onChange={(e) =>
                                            setProjectName(
                                                e.target.value
                                            )
                                        }
                                        className="
                                            w-full
                                            rounded-md
                                            border
                                            border-gray-600
                                            bg-gray-900
                                            py-3
                                            px-4
                                            text-white
                                            outline-none
                                            focus:border-blue-500
                                            focus:ring-1
                                            focus:ring-blue-500
                                        "
                                    />

                                </div>

                                <CustomerSearch selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} />


                                {/* Description */}

                                <div className="mb-6 w-full max-w-3xl">

                                    <label className="block text-sm font-medium text-gray-300 mb-2">

                                        Projektbeschreibung

                                    </label>


                                    <textarea
                                        name="projectDescription"
                                        value={projectDescription}
                                        onChange={(e) =>
                                            setProjectDescription(
                                                e.target.value
                                            )
                                        }
                                        className="
                                            w-full
                                            h-48
                                            rounded-md
                                            border
                                            border-gray-600
                                            bg-gray-900
                                            py-3
                                            px-4
                                            text-white
                                            outline-none
                                            focus:border-blue-500
                                            focus:ring-1
                                            focus:ring-blue-500
                                            resize-none
                                        "
                                    />

                                </div>


                                {/* Existing files */}

                                <div className="mb-6 w-full max-w-3xl">

                                    <label className="block text-sm font-medium text-gray-300 mb-2">

                                        Projektdateien

                                    </label>


                                    <div className="space-y-2">

                                        {projectFiles.length === 0 ? (

                                            <div className="border border-dashed border-gray-600 rounded-lg p-6 text-center text-gray-500">

                                                Keine Dateien vorhanden.

                                            </div>

                                        ) : (

                                            projectFiles.map(
                                                file => (

                                                    <div
                                                        key={file.id}
                                                        className="
                                                            flex
                                                            items-center
                                                            justify-between
                                                            bg-gray-900
                                                            border
                                                            border-gray-700
                                                            rounded-lg
                                                            px-4
                                                            xl:py-3 py-2
                                                        "
                                                    >

                                                        <div className="flex items-center xl:gap-3 gap-2 min-w-0">

                                                            <div className="text-blue-400">

                                                                📄

                                                            </div>


                                                            <span className="truncate">

                                                                {file.fileName}

                                                            </span>

                                                        </div>


                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteFile(
                                                                    file
                                                                )
                                                            }
                                                            className="
                                                                ml-4
                                                                text-sm
                                                                text-red-400
                                                                hover:text-red-300
                                                                transition
                                                            "
                                                        >

                                                            Löschen

                                                        </button>

                                                    </div>

                                                )
                                            )

                                        )}

                                    </div>

                                </div>


                                {/* Upload */}

                                <div className="mb-6 w-full max-w-3xl">

                                    <label className="block text-sm font-medium text-gray-300 mb-2">

                                        Dateien hinzufügen

                                    </label>


                                    <div className="
                                        relative
                                        h-40
                                        rounded-lg
                                        border-2
                                        border-dashed
                                        border-gray-600
                                        bg-gray-900
                                        hover:bg-gray-850
                                        flex
                                        justify-center
                                        items-center
                                        transition
                                    ">

                                        <div className="flex flex-col items-center pointer-events-none">

                                            <div className="text-3xl text-blue-500 mb-2">

                                                ↑

                                            </div>


                                            <span className="text-gray-300">

                                                Dateien hier ablegen

                                            </span>


                                            <span className="text-xs text-gray-500 mt-1">

                                                oder Dateien auswählen

                                            </span>

                                        </div>


                                        <input
                                            className="
                                                absolute
                                                inset-0
                                                w-full
                                                h-full
                                                opacity-0
                                                cursor-pointer
                                            "
                                            type="file"
                                            multiple
                                            onChange={(e) => {

                                                setNewFiles(
                                                    Array.from(
                                                        e.target.files
                                                    )
                                                );

                                            }}
                                        />

                                    </div>

                                </div>


                                {/* New files */}

                                {newFiles.length > 0 && (

                                    <div className="mb-6 w-full max-w-3xl">

                                        <div className="text-sm text-gray-400 mb-2">

                                            Neue Dateien

                                        </div>


                                        <div className="space-y-2">

                                            {newFiles.map(
                                                (file, index) => (

                                                    <div
                                                        key={`${file.name}-${index}`}
                                                        className="
                                                            flex
                                                            items-center
                                                            justify-between
                                                            bg-gray-700
                                                            rounded-lg
                                                            px-4
                                                            xl:py-3 py-2
                                                        "
                                                    >

                                                        <span>

                                                            {file.name}

                                                        </span>


                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setNewFiles(
                                                                    files =>
                                                                        files.filter(
                                                                            (_, i) =>
                                                                                i !== index
                                                                        )
                                                                )
                                                            }
                                                            className="
                                                                text-sm
                                                                text-red-400
                                                                hover:text-red-300
                                                            "
                                                        >

                                                            Entfernen

                                                        </button>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    </div>

                                )}


                                {/* Save */}

                                <div className="flex justify-end">

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="
                                            rounded-lg
                                            bg-gray-700
                                            hover:bg-gray-600
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                            transition
                                            py-3
                                            px-8
                                            font-semibold
                                        "
                                    >

                                        {saving
                                            ? "Speichern..."
                                            : "Änderungen speichern"
                                        }

                                    </button>

                                </div>


                            </form>

                        </section>


                        {/* -------------------------------- */}
                        {/* Danger zone */}
                        {/* -------------------------------- */}

                        <section className="border border-red-900/60 bg-red-950/20 rounded-xl xl:p-6 p-4 mb-10">


                            <div className="flex items-center justify-between xl:gap-6 gap-2">


                                <div>

                                    <h2 className="text-lg font-semibold text-red-400">

                                        Projekt löschen

                                    </h2>


                                    <p className="text-sm text-gray-400 mt-1">

                                        Das Projekt und die zugehörigen Daten werden gelöscht.

                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    disabled={deleting}
                                    className="
                                        shrink-0
                                        rounded-lg
                                        border
                                        border-red-700
                                        bg-red-900/30
                                        hover:bg-red-900/60
                                        disabled:opacity-50
                                        xl:px-5 px-4
                                        xl:py-3 py-2
                                        text-red-300
                                        font-semibold
                                        transition
                                    "
                                >

                                    {deleting
                                        ? "Löschen..."
                                        : "Projekt löschen"
                                    }

                                </button>


                            </div>

                        </section>


                    </div>

                </div>

            </main>

        </div>

    );

}
