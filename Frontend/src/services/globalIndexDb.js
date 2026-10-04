import { getGlobalFile } from "./globalMemoryCache";
import { downloadFile } from "./apiTemplates";
import axios from "axios";

const DB_NAME = "carpentersproduction";
export const STORE_NAME = "projectFiles";
const DB_VERSION = 1;

export const loadSettings =
            async () => {

                try {
                    const data =
                        await getGlobalFile({
    
                            file: "settings-cache.json",
    
                            loadFromServer: {download: downloadFile, path:"/api/settings/cache"},

                            noExpiration:true
    
                        });
                    
                    if(data) {return data;}

                    const response =
                        await axios.get(
                            "/api/settings/cache",
                            {
                                withCredentials:
                                    true
                            }
                        );

                    if (
                        response.data
                    ) {
                        return response.data
                    }

                    return;

                } catch (error) {

                    console.warn(
                        "Cache-Einstellungen konnten nicht geladen werden:",
                        error
                    );

                }

                return;
            };
            

export const openDb = () => {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );


            request.onupgradeneeded =
                () => {

                    const db =
                        request.result;


                    if (
                        !db.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        db.createObjectStore(
                            STORE_NAME,
                            {
                                keyPath: "key"
                            }
                        );

                    }

                };


            request.onsuccess =
                () => {

                    resolve(
                        request.result
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

const getGlobalCacheKey = (
    file
) => {

    return `global:${file}`;

};

/* =========================================================
 * Globale Datei aus IndexedDB lesen
 * ========================================================= */

export const getCachedGlobalFile = async ({
    file, noExpiration=false
}) => {

    const db =
        await openDb();

    let cacheSettings = {healthDuration: 12 * 60 * 60 * 1000}

    if(!noExpiration) {
        cacheSettings = await loadSettings();
    }
    
    console.log(cacheSettings);

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
                    getGlobalCacheKey(
                        file
                    )
                );


            request.onsuccess = () => {

                    const entry =
                        request.result;


                    if (!entry) {

                        resolve(
                            null
                        );

                        return;

                    }

                    if(Date.now() - request.result?.version < cacheSettings.healthDuration || noExpiration) {

                        resolve(
                            entry
                        );

                        return;

                    }


                    const cacheVersion =
                        Number(
                            entry.version ??
                            entry.cachedAt ??
                            0
                        );


                    const age =
                        Date.now() -
                        cacheVersion;


                    /*
                     * Noch gültig
                     */

                    if (
                        age <= cacheSettings.healthDuration
                    ) {

                        resolve(
                            entry
                        );

                        return;

                    }


                    /*
                     * Zu alt
                     */

                    resolve(
                        null
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
 * Globale Datei speichern
 * ========================================================= */

export const setCachedGlobalFile = async ({
    file,
    data,
    version = null
}) => {

    const db =
        await openDb();


    const cacheVersion =
        version ??
        Date.now();


    const entry = {

        key:
            getGlobalCacheKey(
                file
            ),

        file,

        data,

        version:
            cacheVersion,

        cachedAt:
            Date.now(),

        scope:
            "global"

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
 * Globale Datei invalidieren
 * ========================================================= */

export const invalidateGlobalFile = async ({
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
                    getGlobalCacheKey(
                        file
                    )
                );


            request.onsuccess =
                () => {

                    resolve();

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