

import {
    getCachedProjectFile,
    setCachedProjectFile
} from "./projectIndexDb.js";


const memoryCache =
    new Map();


export const getProjectFile = async ({
    projectId,
    file,
    loadFromServer
}) => {

    const key =
        `${projectId}:${file}`;


    /*
     * =============================================
     * 1. Memory
     * =============================================
     */

    if (
        memoryCache.has(key)
    ) {
        console.log("Project file from memory cache:", key);
        return memoryCache.get(
            key
        );

    }


    /*
     * =============================================
     * 2. IndexedDB
     * =============================================
     */

    const cached =
        await getCachedProjectFile({

            projectId,

            file

        });


    if (
        cached
    ) {

        memoryCache.set(
            key,
            cached.data
        );

        console.log("Project file from IndexedDB cache:", key);
        return cached.data;

    }

    /*
     * =============================================
     * 3. Server / Garage
     * =============================================
     */

    const data = await loadFromServer.download(loadFromServer.path);

    /*
     * =============================================
     * 4. Beide Caches befüllen
     * =============================================
     */

    memoryCache.set(
        key,
        data
    );


    await setCachedProjectFile({

        projectId,

        file,

        data,

        version: Date.now()

    });

    console.log("Project file from server:", key);
    return data;

};

export const uploadProjectFile = async ({
    projectId,
    file,
    data,
    uploadFunction
}) => {

    const response = await uploadFunction.upload(uploadFunction.path, data);

    memoryCache.set(
        `${projectId}:${file}`,
        data
    );

    await setCachedProjectFile({

        projectId,

        file,

        data,

        version: Date.now()

    });

    return response;

};

