
import { openDb, STORE_NAME } from "./globalIndexDb"; 
import { loadSettings } from "./globalIndexDb";


/* =========================================================
 * Cache-Key
 * ========================================================= */

const getCacheKey = (
    projectId,
    file
) => {

    return (
        `project:${projectId}:${file}`
    );

};


/* =========================================================
 * Aus IndexedDB lesen
 * ========================================================= */

export const getCachedProjectFile = async ({
    projectId,
    file,
    noExpiration = false
}) => {

    const db =
        await openDb();

    let cacheSettings = {healthDuration: 12 * 60 * 60 * 1000}

    if(!noExpiration) {
        cacheSettings = await loadSettings();
    }


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.get(
                    getCacheKey(
                        projectId,
                        file
                    )
                );


            request.onsuccess =
                () => {

                    if(Date.now() - request.result?.version < cacheSettings.healthDuration || noExpiration) {

                        resolve(
                            request.result ?? null
                        );

                    } else {
                        resolve(null);
                    }

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

};


/* =========================================================
 * Datei im Cache speichern
 * ========================================================= */

export const setCachedProjectFile = async ({
    projectId,
    file,
    data,
    version = null
}) => {

    const db =
        await openDb();


    const entry = {

        key:
            getCacheKey(
                projectId,
                file
            ),

        projectId,

        file,

        data,

        version,

        cachedAt:
            Date.now()

    };


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.put(
                    entry
                );


            request.onsuccess =
                () => {

                    resolve(
                        entry
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

};


/* =========================================================
 * Datei aus Cache löschen
 * ========================================================= */

export const invalidateProjectFile = async ({
    projectId,
    file
}) => {

    const db =
        await openDb();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.delete(
                    getCacheKey(
                        projectId,
                        file
                    )
                );


            request.onsuccess =
                () => resolve();


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

};


/* =========================================================
 * kompletten Projektcache löschen
 * ========================================================= */

export const invalidateProject = async (
    projectId
) => {

    const db =
        await openDb();


    return new Promise(
        async (resolve, reject) => {

            try {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        STORE_NAME
                    );


                const request =
                    store.openCursor();


                request.onsuccess =
                    event => {

                        const cursor =
                            event.target.result;


                        if (!cursor) {

                            resolve();

                            return;

                        }


                        if (
                            cursor.value.projectId ===
                            projectId
                        ) {

                            cursor.delete();

                        }


                        cursor.continue();

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            } catch (error) {

                reject(
                    error
                );

            }

        }
    );

};



export const invalidateAllProjects = async () => {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    "carpentersproduction"
                );


            request.onsuccess =
                () => {

                    const db =
                        request.result;


                    if (
                        !db.objectStoreNames.contains(
                            "projectFiles"
                        )
                    ) {

                        db.close();

                        resolve();

                        return;

                    }


                    const transaction =
                        db.transaction(
                            "projectFiles",
                            "readwrite"
                        );


                    const store =
                        transaction.objectStore(
                            "projectFiles"
                        );


                    const clearRequest =
                        store.clear();


                    clearRequest.onsuccess =
                        () => {

                            db.close();

                            resolve();

                        };


                    clearRequest.onerror =
                        () => {

                            db.close();

                            reject(
                                clearRequest.error
                            );

                        };

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

};