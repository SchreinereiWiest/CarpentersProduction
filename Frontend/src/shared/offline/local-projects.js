import {
    OFFLINE_PROJECT_STORE_NAME,
    openDb
} from "../cache/indexed-db.js";
import { invalidateProject } from "../cache/project-indexed-db.js";
import { createUuid } from "../utils/uuid.js";


const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const notify = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("offline-cache-changed"));
    }
};

const normalizeProject = project => ({
    id: project.id,
    customerId: null,
    customer: null,
    title: project.title || "Neues Projekt",
    description: project.description ?? "",
    status: project.status ?? "inactive",
    priority: project.priority ?? "normal",
    startDate: project.startDate ?? null,
    files: Array.isArray(project.files) ? project.files : [],
    ...project,
    localOnly: true
});

const getRegistration = async projectId => {
    if (!projectId) return null;
    const db = await openDb();
    return requestResult(
        db.transaction(OFFLINE_PROJECT_STORE_NAME, "readonly")
            .objectStore(OFFLINE_PROJECT_STORE_NAME)
            .get(projectId)
    );
};

export const createLocalProject = async ({
    id = createUuid(),
    title = "Neues Projekt",
    description = "",
    status = "inactive",
    files = []
} = {}) => {
    const project = normalizeProject({
        id,
        title,
        description,
        status,
        files
    });
    await saveLocalProject(project);
    return project;
};

export const saveLocalProject = async project => {
    const current = await getRegistration(project.id);
    const normalized = normalizeProject({
        ...(current?.project ?? {}),
        ...project,
        id: project.id
    });
    const db = await openDb();
    await requestResult(
        db.transaction(OFFLINE_PROJECT_STORE_NAME, "readwrite")
            .objectStore(OFFLINE_PROJECT_STORE_NAME)
            .put({
                ...current,
                projectId: normalized.id,
                title: normalized.title,
                status: normalized.status,
                localOnly: true,
                serverCreated: current?.serverCreated ?? false,
                project: normalized,
                downloadedAt: current?.downloadedAt ?? Date.now(),
                updatedAt: Date.now()
            })
    );
    notify();
    return normalized;
};

export const getLocalProject = async projectId => {
    const registration = await getRegistration(projectId);
    return registration?.localOnly
        ? normalizeProject(registration.project ?? {
            id: registration.projectId,
            title: registration.title,
            status: registration.status
        })
        : null;
};

export const listLocalProjects = async () => {
    const db = await openDb();
    const registrations = await requestResult(
        db.transaction(OFFLINE_PROJECT_STORE_NAME, "readonly")
            .objectStore(OFFLINE_PROJECT_STORE_NAME)
            .getAll()
    );
    return (registrations ?? [])
        .filter(registration => registration.localOnly)
        .map(registration => normalizeProject(registration.project ?? {
            id: registration.projectId,
            title: registration.title,
            status: registration.status
        }));
};

export const isLocalProject = async projectId =>
    Boolean((await getRegistration(projectId))?.localOnly);

export const isLocalProjectCreatedOnServer = async projectId =>
    Boolean((await getRegistration(projectId))?.serverCreated);

export const markLocalProjectCreatedOnServer = async projectId => {
    const registration = await getRegistration(projectId);
    if (!registration?.localOnly) return null;
    const db = await openDb();
    await requestResult(
        db.transaction(OFFLINE_PROJECT_STORE_NAME, "readwrite")
            .objectStore(OFFLINE_PROJECT_STORE_NAME)
            .put({
                ...registration,
                serverCreated: true,
                updatedAt: Date.now()
            })
    );
    return registration.project;
};

export const finishLocalProjectPromotion = async projectId => {
    const db = await openDb();
    await requestResult(
        db.transaction(OFFLINE_PROJECT_STORE_NAME, "readwrite")
            .objectStore(OFFLINE_PROJECT_STORE_NAME)
            .delete(projectId)
    );
    notify();
};

export const deleteLocalProject = async projectId => {
    await finishLocalProjectPromotion(projectId);
    await invalidateProject(projectId);
};
