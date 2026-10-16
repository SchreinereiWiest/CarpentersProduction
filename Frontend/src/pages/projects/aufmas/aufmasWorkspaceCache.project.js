const workspaceCache = new Map();
const MAX_WORKSPACES = 3;

export const getAufmasWorkspaceCache = projectId => {
    const cached = workspaceCache.get(projectId) ?? null;
    if (!cached) return null;
    workspaceCache.delete(projectId);
    workspaceCache.set(projectId, cached);
    return cached;
};

export const setAufmasWorkspaceCache = (projectId, workspace) => {
    if (!projectId || !workspace) return;
    workspaceCache.delete(projectId);
    workspaceCache.set(projectId, { ...workspace, cachedAt: Date.now() });
    while (workspaceCache.size > MAX_WORKSPACES) {
        workspaceCache.delete(workspaceCache.keys().next().value);
    }
};

export const clearAufmasWorkspaceCache = projectId => {
    if (projectId) workspaceCache.delete(projectId);
    else workspaceCache.clear();
};
