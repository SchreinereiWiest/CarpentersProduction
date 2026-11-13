import axios from "axios";
import {
    getCachedProjectAsset,
    invalidateProjectAsset,
    setCachedProjectAsset
} from "../cache/project-indexed-db.js";
import { uploadLocalProjectFiles } from "../cache/project-cache.js";
import {
    finishLocalProjectPromotion,
    getLocalProject,
    isLocalProjectCreatedOnServer,
    markLocalProjectCreatedOnServer,
    saveLocalProject
} from "../offline/local-projects.js";


const uploadLocalAssets = async (project, customerId) => {
    let currentProject = project;
    const localFiles = (currentProject.files ?? []).filter(file => file.localOnly);

    for (const file of localFiles) {
        const cached = await getCachedProjectAsset(file.id);
        if (!cached?.blob && !cached?.localBytes) {
            throw new Error(`${file.fileName} ist lokal nicht mehr verfügbar.`);
        }

        const uploadBlob = cached.localBytes
            ? new Blob([cached.localBytes], { type: file.mimeType })
            : cached.blob;
        const formData = new FormData();
        formData.append("file", uploadBlob, file.fileName);
        formData.append("entityId", project.id);
        formData.append("customerId", customerId);
        formData.append("entity", "project");
        formData.append("fileName", file.fileName);
        formData.append("mimeType", file.mimeType || uploadBlob.type);
        formData.append("fileSize", String(file.fileSize ?? uploadBlob.size));
        if (file.category) formData.append("category", file.category);

        const uploadPath = file.category === "production-attachment"
            ? "/api/files/project-attachment"
            : "/api/files/upload";
        const { data } = await axios.post(uploadPath, formData);
        const uploadedFile = {
            ...data.fileEntry,
            projectId: project.id,
            localOnly: false
        };

        await setCachedProjectAsset({
            projectId: project.id,
            file: uploadedFile,
            blob: uploadBlob,
            serverVersion: uploadedFile.serverVersion ?? null,
            localOnly: false
        });
        await invalidateProjectAsset(file.id);

        currentProject = await saveLocalProject({
            ...currentProject,
            files: (currentProject.files ?? []).map(currentFile =>
                currentFile.id === file.id ? uploadedFile : currentFile
            )
        });
    }

    return currentProject;
};

const createOrUpdateServerProject = async (project, customerId) => {
    if (!await isLocalProjectCreatedOnServer(project.id)) {
        const { data } = await axios.post("/api/projects/new", {
            id: project.id,
            customerId,
            title: project.title,
            description: project.description,
            status: "inactive"
        }, {
            withCredentials: true
        });
        if (!data?.id || data.id !== project.id) {
            throw new Error(
                "Das Backend hat das Projekt nicht mit der lokalen Projekt-ID angelegt. "
                + "Bitte den Backend-Dienst aktualisieren bzw. neu starten und den Upload erneut ausführen."
            );
        }
        await markLocalProjectCreatedOnServer(project.id);
        return data;
    }

    try {
        const { data } = await axios.put(`/api/projects/update/${project.id}`, {
            customerId,
            title: project.title,
            description: project.description,
            status: "inactive"
        });
        return data;
    } catch (error) {
        // Der Browser kann nach einem fehlgeschlagenen oder zurückgerollten
        // Upload noch den Zwischenstand "serverCreated" besitzen. Ein
        // fehlender Datensatz wird deshalb mit derselben ID neu angelegt.
        if (error.response?.status !== 404) throw error;

        const { data } = await axios.post("/api/projects/new", {
            id: project.id,
            customerId,
            title: project.title,
            description: project.description,
            status: "inactive"
        }, {
            withCredentials: true
        });
        if (!data?.id || data.id !== project.id) {
            throw new Error(
                "Das Backend hat das Projekt nicht mit der lokalen Projekt-ID angelegt.",
                { cause: error }
            );
        }
        return data;
    }
};

const finishServerProject = async (project, customerId) => {
    const { data } = await axios.put(`/api/projects/update/${project.id}`, {
        customerId,
        title: project.title,
        description: project.description,
        status: project.status
    });
    return data;
};

export const promoteLocalProject = async ({
    projectId,
    customerId,
    title,
    description,
    status
}) => {
    let project = await getLocalProject(projectId);
    if (!project) {
        throw new Error("Das lokale Projekt wurde nicht gefunden.");
    }
    if (!customerId) {
        throw new Error("Für den Upload muss ein Kunde ausgewählt werden.");
    }

    project = await saveLocalProject({
        ...project,
        title: title ?? project.title,
        description: description ?? project.description,
        status: status ?? project.status,
        customerId
    });
    await createOrUpdateServerProject(project, customerId);

    await uploadLocalProjectFiles(projectId);
    project = await uploadLocalAssets(project, customerId);
    const serverProject = await finishServerProject(project, customerId);
    await finishLocalProjectPromotion(projectId);

    return {
        ...project,
        ...serverProject,
        id: projectId,
        customerId,
        files: project.files,
        localOnly: false
    };
};
