import {
    getCachedGlobalFile,

    setCachedGlobalFile

} from "./globalIndexDb.js";

const memoryCache =
    new Map();

export const getGlobalFile = async ({
    file,
    loadFromServer,
    noExpiration = false
}) => {

    const key =
        `global:${file}`;


    /*
     * =====================================================
     * 1. Memory Cache
     * =====================================================
     */

    if (
        memoryCache.has(
            key
        )
    ) {

        console.log(
            "Global file from memory cache:",
            key
        );


        return memoryCache.get(
            key
        );

    }


    /*
     * =====================================================
     * 2. IndexedDB
     * =====================================================
     */

    const cached =
        await getCachedGlobalFile({

            file,

            noExpiration

        });


    if (
        cached
    ) {

        memoryCache.set(
            key,
            cached.data
        );


        console.log(
            "Global file from IndexedDB cache:",
            key
        );


        return cached.data;

    }


    /*
     * =====================================================
     * 3. Server
     * =====================================================
     */

    const data =
        await loadFromServer.download(
            loadFromServer.path
        );


    /*
     * =====================================================
     * 4. Cache aktualisieren
     * =====================================================
     */

    memoryCache.set(
        key,
        data
    );


    await setCachedGlobalFile({

        file,

        data,

        version:
            Date.now()

    });


    console.log(
        "Global file from server:",
        key
    );


    return data;

};


export const uploadGlobalFile = async ({
    file,
    data,
    uploadFunction
}) => {

    const response =
        await uploadFunction.upload(
            uploadFunction.path,
            data
        );


    const key =
        `global:${file}`;


    /*
     * Memory sofort aktualisieren
     */

    memoryCache.set(
        key,
        data
    );


    /*
     * IndexedDB sofort aktualisieren
     */

    await setCachedGlobalFile({

        file,

        data,

        version:
            Date.now()

    });


    return response;

};

