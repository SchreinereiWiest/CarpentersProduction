import axios from "axios";
import {
    getLocalProject,
    listLocalProjects,
    saveLocalProject
} from "../offline/local-projects.js";


export const getProjectRecord = async projectId => {
    const localProject = await getLocalProject(projectId);
    if (localProject) return localProject;

    const { data } = await axios.get(`/api/projects/get/${projectId}`);
    return data.project;
};

export const getProjectRecords = async endpoint => {
    const [remoteResponse, localProjects] = await Promise.all([
        axios.get(endpoint).catch(() => ({ data: { projects: [] } })),
        listLocalProjects()
    ]);
    const remoteProjects = remoteResponse.data.projects ?? [];
    const visibleLocalProjects = String(endpoint).includes("getActive")
        ? localProjects.filter(project => project.status === "active")
        : localProjects;
    const remoteIds = new Set(remoteProjects.map(project => String(project.id)));
    return [
        ...visibleLocalProjects.filter(project => !remoteIds.has(String(project.id))),
        ...remoteProjects
    ];
};

export const updateLocalProjectRecord = async (projectId, changes) => {
    const project = await getLocalProject(projectId);
    if (!project) return null;
    return saveLocalProject({
        ...project,
        ...changes,
        id: projectId
    });
};
