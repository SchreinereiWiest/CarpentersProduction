import React from "react";
import { updateSectionTree } from "../../../engine/sektions/updateSectionTree";
import { findSection } from "../../../engine/sektions/interior/mergeSectionChildren";


const DRAWER_DEPTHS = [
    270,
    300,
    350,
    400,
    450,
    500,
    550,
    600
];

export function createId() {
        return Date.now() + Math.random();
    }


const getDefaultDrawerDepth = (
    cabinetDepth
) => {

    const depth =
        Number(cabinetDepth);

    const available =
        DRAWER_DEPTHS.filter(
            value => value <= depth
        );

    if (available.length > 0) {
        return available[available.length - 1];
    }

    return DRAWER_DEPTHS[0];
};


const createDefaultMiddleWall = (
    selectedElement
) => {

    const height =
        Number(selectedElement?.height ?? 0);

    return {
        id:createId(),

        // Bezug auf Unterkante der Sektion
        positionReference: "sectionBottom",

        // Standardmäßig ungefähr in der Mitte
        positionOffset:
            Math.max(
                0,
                height / 2
            )
    };
};


const createDefaultFunctionConfig = (
    functionType,
    selectedElement,
    activeCabinet
) => {

    const cabinetDepth =
        Number(
            activeCabinet?.depth ?? 0
        );


    switch (functionType) {

        case "shelf":

    return {

        compartmentCount: 2,

        shelfFrontOffset: 0,

        holeRow: {
            spacing: 32,
            frontOffset: 37,
            backOffset: 37,
            startFromBottom: 150,
            endFromTop: 150
        }
    };

        case "middleWall":

            return {

                middleWalls: [
                    createDefaultMiddleWall(
                        selectedElement
                    )
                ]
            };


        case "legrabox":

    return {

        legraboxes: [
            {
                id: createId(),

                variant: "M",

                drawerDepth:
                    getDefaultDrawerDepth(
                        cabinetDepth
                    ),

                positionFromBottom: 40,

                doubling: {
                    left: false,
                    right: false,
                    thickness: 0
                }
            }
        ]
    };


        default:
            return {};
    }
};


export default function SectionFunctionProperties({

    selectedElement,

    activeCabinet,
    updateActiveCabinet,

    setSelectedElement

}) {

    if (
        !selectedElement ||
        selectedElement.type !== "section" ||
        !activeCabinet
    ) {
        return (
            <div className="
                mt-6
                text-sm
                text-gray-500
            ">
                Bitte eine Sektion auswählen.
            </div>
        );
    }



    // =========================================================
    // Section aktualisieren
    // =========================================================

    const updateSection = (
        changes
    ) => {

        const newSections =
            updateSectionTree(
                activeCabinet.sections ?? [],
                selectedElement.id,
                section => ({
                    ...section,
                    ...changes
                })
            );


        updateActiveCabinet({
            sections: newSections
        });


        const updatedSection =
            findSection(
                newSections,
                selectedElement.id
            );


        if (updatedSection) {

            setSelectedElement({
                ...updatedSection,
                type: "section"
            });
        }
    };


    // =========================================================
    // Function Type ändern
    // =========================================================

    const setFunctionType = (
        functionType
    ) => {

        const existingConfig =
            selectedElement.functionConfig ?? {};

            console.log(existingConfig);


        const defaultConfig =
            createDefaultFunctionConfig(
                functionType,
                selectedElement,
                activeCabinet
            );


        const functionConfig = {
            ...defaultConfig,
            ...existingConfig
        };


        // Verschachtelte Defaults sauber ergänzen

        if (
            functionType === "shelf"
        ) {

            functionConfig.holeRow = {
                ...defaultConfig.holeRow,
                ...(existingConfig.holeRow ?? {})
            };
        }


        if (
            functionType === "legrabox"
        ) {

            functionConfig.doubling = {
                ...defaultConfig.doubling,
                ...(existingConfig.doubling ?? {})
            };
        }


        if (
            functionType === "middleWall"
        ) {

            functionConfig.middleWalls =
                existingConfig.middleWalls?.length
                    ? existingConfig.middleWalls
                    : defaultConfig.middleWalls;
        }


        updateSection({
            functionType,
            functionConfig
        });
    };


    // =========================================================
    // Function Config aktualisieren
    // =========================================================

    const updateFunctionConfig = (
    changes
) => {

    updateActiveCabinet(
        cabinet => {

            const newSections =
                updateSectionTree(
                    cabinet.sections ?? [],
                    selectedElement.id,
                    section => {

                        const currentConfig =
                            section.functionConfig ?? {};


                        const newConfig =
                            typeof changes === "function"
                                ? changes(
                                    currentConfig
                                )
                                : {
                                    ...currentConfig,
                                    ...changes
                                };


                        return {
                            ...section,

                            functionConfig:
                                newConfig
                        };
                    }
                );


            return {
                sections:
                    newSections
            };
        }
    );
};


    // =========================================================
    // Verschachtelte Config aktualisieren
    // =========================================================

    const updateNestedFunctionConfig = (
    key,
    changes
) => {

    updateFunctionConfig(
        currentConfig => {

            const currentNested =
                currentConfig[key] ?? {};


            const newNested =
                typeof changes === "function"
                    ? changes(currentNested)
                    : {
                        ...currentNested,
                        ...changes
                    };


            return {

                ...currentConfig,

                [key]:
                    newNested
            };
        }
    );
};


    // =========================================================
    // Mittelwand aktualisieren
    // =========================================================

    const updateMiddleWall = (
        wallId,
        changes
    ) => {

        const config =
            selectedElement.functionConfig ?? {};


        const middleWalls =
            (config.middleWalls ?? [])
                .map(wall => {

                    if (
                        wall.id !== wallId
                    ) {
                        return wall;
                    }

                    return {
                        ...wall,
                        ...changes
                    };
                });


        updateFunctionConfig({
            middleWalls
        });
    };


    // =========================================================
    // Mittelwand hinzufügen
    // =========================================================

    const addMiddleWall = () => {

        const config =
            selectedElement.functionConfig ?? {};


        const middleWalls =
            [
                ...(config.middleWalls ?? []),
                createDefaultMiddleWall(
                    selectedElement
                )
            ];


        updateFunctionConfig({
            middleWalls
        });
    };


    // =========================================================
    // Mittelwand entfernen
    // =========================================================

    const removeMiddleWall = (
        wallId
    ) => {

        const config =
            selectedElement.functionConfig ?? {};


        const middleWalls =
            (config.middleWalls ?? [])
                .filter(
                    wall =>
                        wall.id !== wallId
                );


        updateFunctionConfig({
            middleWalls
        });
    };


    // =========================================================
    // Position einer Mittelwand berechnen
    //
    // positionOffset ist immer relativ zu der gewählten
    // Referenz und damit auch bei Geometrieänderungen
    // sinnvoll verwendbar.
    // =========================================================

    const getMiddleWallCenterY = (
        wall
    ) => {

        const offset =
            Number(
                wall.positionOffset ?? 0
            );

        const sectionY =
            Number(
                selectedElement.y
            );

        const sectionHeight =
            Number(
                selectedElement.height
            );

        const cabinetHeight =
            Number(
                activeCabinet.height
            );


        switch (
            wall.positionReference
        ) {

            case "cabinetTop":

                return offset;


            case "cabinetBottom":

                return (
                    cabinetHeight -
                    offset
                );


            case "sectionTop":

                return (
                    sectionY +
                    offset
                );


            case "sectionBottom":

                return (
                    sectionY +
                    sectionHeight -
                    offset
                );


            default:

                return (
                    sectionY +
                    sectionHeight / 2
                );
        }
    };


    // =========================================================
    // Abstand der Mittelwand von einer Referenz berechnen
    // =========================================================

    const getMiddleWallOffset = (
        wall,
        reference
    ) => {

        const centerY =
            getMiddleWallCenterY(
                wall
            );


        const sectionY =
            Number(
                selectedElement.y
            );

        const sectionHeight =
            Number(
                selectedElement.height
            );

        const cabinetHeight =
            Number(
                activeCabinet.height
            );


        switch (reference) {

            case "cabinetTop":

                return centerY;


            case "cabinetBottom":

                return (
                    cabinetHeight -
                    centerY
                );


            case "sectionTop":

                return (
                    centerY -
                    sectionY
                );


            case "sectionBottom":

                return (
                    sectionY +
                    sectionHeight -
                    centerY
                );


            default:

                return centerY;
        }
    };


    // =========================================================
    // Mittelwand über beliebige Referenz positionieren
    // =========================================================

    const setMiddleWallPosition = (
        wallId,
        reference,
        value
    ) => {

        const numericValue =
            Number(value);


        if (
            !Number.isFinite(
                numericValue
            ) ||
            numericValue < 0
        ) {
            return;
        }


        updateMiddleWall(
            wallId,
            {
                positionReference:
                    reference,

                positionOffset:
                    numericValue
            }
        );
    };


    // =========================================================
    // Aktuelle Funktion
    // =========================================================

    const currentSection =
        findSection(
            activeCabinet.sections ?? [],
            selectedElement.id
        );

    const functionType =
        currentSection?.functionType ??
        "none";

    const functionConfig =
        currentSection?.functionConfig ?? {};


    const middleWalls =
        functionConfig.middleWalls ?? [];

    const shelfFrontOffset =
    Number(
        functionConfig.shelfFrontOffset ?? 0
    );

    const shelfDepth =
        Math.max(
            0,
            Number(activeCabinet.depth ?? 0) -
            shelfFrontOffset
    );


    // =========================================================
// Legrabox aktualisieren
// =========================================================

const updateLegrabox = (
    legraboxId,
    changes
) => {

    updateFunctionConfig(
        currentConfig => {

            const legraboxes =
                (currentConfig.legraboxes ?? [])
                    .map(box => {

                        if (
                            box.id !== legraboxId
                        ) {
                            return box;
                        }

                        return {
                            ...box,
                            ...changes
                        };
                    });


            return {
                ...currentConfig,
                legraboxes
            };
        }
    );
};


const updateLegraboxDoubling = (
    legraboxId,
    changes
) => {

    updateFunctionConfig(
        currentConfig => {

            const legraboxes =
                (currentConfig.legraboxes ?? [])
                    .map(box => {

                        if (
                            box.id !== legraboxId
                        ) {
                            return box;
                        }

                        return {

                            ...box,

                            doubling: {
                                ...(box.doubling ?? {}),
                                ...changes
                            }
                        };
                    });


            return {
                ...currentConfig,
                legraboxes
            };
        }
    );
};


const addLegrabox = () => {

    updateFunctionConfig(
        currentConfig => {

            const legraboxes =
                currentConfig.legraboxes ?? [];


            const newLegrabox = {

                id:
                    createId(),

                variant:
                    "M",

                drawerDepth:
                    getDefaultDrawerDepth(
                        activeCabinet.depth
                    ),

                positionFromBottom:
                    40,

                doubling: {
                    left: false,
                    right: false,
                    thickness: 0
                }
            };


            return {

                ...currentConfig,

                legraboxes: [
                    ...legraboxes,
                    newLegrabox
                ]
            };
        }
    );
};


const removeLegrabox = (
    legraboxId
) => {

    updateFunctionConfig(
        currentConfig => {

            const legraboxes =
                (
                    currentConfig.legraboxes ?? []
                ).filter(
                    box =>
                        box.id !==
                        legraboxId
                );


            return {

                ...currentConfig,

                legraboxes
            };
        }
    );
};


    return (

        <div className="
            mt-6
            space-y-6
        ">

            {/* =================================================
                Funktion auswählen
            ================================================= */}

            <section>

                <div className="
                    text-xs
                    uppercase
                    tracking-wide
                    text-gray-500
                ">
                    Funktion
                </div>


                <select
                    value={
                        functionType
                    }
                    onChange={(event) =>
                        setFunctionType(
                            event.target.value
                        )
                    }
                    className="
                        mt-3
                        w-full
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        text-sm
                        text-white
                        outline-none
                        focus:border-blue-500
                    "
                >

                    <option value="none">
                        Keine Funktion
                    </option>

                    <option value="shelf">
                        Einlegeböden + Lochreihe
                    </option>

                    <option value="middleWall">
                        Mittelwand
                    </option>

                    <option value="legrabox">
                        Legrabox
                    </option>

                </select>

            </section>


            {/* =================================================
                Keine Funktion
            ================================================= */}

            {functionType === "none" && (

                <section>

                    <div className="
                        text-sm
                        text-gray-500
                    ">
                        Für diese Sektion ist keine
                        Funktion hinterlegt.
                    </div>

                </section>
            )}


            {/* =================================================
                EINLEGEBÖDEN + LOCHREIHE
            ================================================= */}

            {functionType === "shelf" && (

                <>

                    {/* =================================================
                        Einlegeböden
                    ================================================= */}

                    <section>

                        <div className="
                            text-xs
                            uppercase
                            tracking-wide
                            text-gray-500
                        ">
                            Einlegeböden
                        </div>


                        <div className="
                            mt-4
                            space-y-4
                        ">

                            {/* Fächeranzahl */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Fächeranzahl
                                </span>


                                <input
                                    type="number"
                                    min="1"
                                    value={
                                        functionConfig
                                            .compartmentCount ??
                                        2
                                    }
                                    onChange={(event) =>
                                        updateFunctionConfig({
                                            compartmentCount:
                                                Math.max(
                                                    1,
                                                    Number(
                                                        event.target.value
                                                    )
                                                )
                                        })
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                        focus:border-blue-500
                                        focus:outline-none
                                    "
                                />

                            </label>


                            {/* Fachtiefe */}

                            <label className="block">

    <span className="
        text-xs
        text-gray-400
    ">
        Fachtiefe
    </span>


    <input
        type="number"
        min="0"
        max={Number(activeCabinet.depth ?? 0)}
        step="1"
        value={shelfDepth}
        onChange={(event) => {

            const depth =
                Number(event.target.value);

            if (!Number.isFinite(depth)) {
                return;
            }


            const cabinetDepth =
                Number(activeCabinet.depth ?? 0);


            const clampedDepth =
                Math.max(
                    0,
                    Math.min(
                        cabinetDepth,
                        depth
                    )
                );


            updateFunctionConfig({

                shelfFrontOffset:
                    cabinetDepth -
                    clampedDepth
            });
        }}
        className="
            mt-1
            w-full
            rounded-lg
            border
            border-gray-700
            bg-gray-900
            px-3
            py-2
            text-white
            focus:border-blue-500
            focus:outline-none
        "
    />

</label>


                            {/* Abstand von vorne */}

                            <label className="block">

    <span className="
        text-xs
        text-gray-400
    ">
        Abstand von vorne
    </span>


    <input
        type="number"
        min="0"
        max={Number(activeCabinet.depth ?? 0)}
        step="1"
        value={shelfFrontOffset}
        onChange={(event) => {

            const frontOffset =
                Number(event.target.value);

            if (!Number.isFinite(frontOffset)) {
                return;
            }


            const cabinetDepth =
                Number(activeCabinet.depth ?? 0);


            const clampedOffset =
                Math.max(
                    0,
                    Math.min(
                        cabinetDepth,
                        frontOffset
                    )
                );


            updateFunctionConfig({

                shelfFrontOffset:
                    clampedOffset
            });
        }}
        className="
            mt-1
            w-full
            rounded-lg
            border
            border-gray-700
            bg-gray-900
            px-3
            py-2
            text-white
            focus:border-blue-500
            focus:outline-none
        "
    />

</label>

                        </div>

                    </section>


                    {/* =================================================
                        Lochreihe
                    ================================================= */}

                    <section>

                        <div className="
                            text-xs
                            uppercase
                            tracking-wide
                            text-gray-500
                        ">
                            Lochreihe
                        </div>


                        <div className="
                            mt-4
                            space-y-4
                        ">

                            {/* Lochabstand */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Lochabstand
                                </span>


                                <input
                                    type="number"
                                    min="1"
                                    step="0.1"
                                    value={
                                        functionConfig
                                            .holeRow
                                            ?.spacing ??
                                        32
                                    }
                                    onChange={(event) =>
                                        updateNestedFunctionConfig(
                                            "holeRow",
                                            {
                                                spacing:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>


                            {/* Abstand vorne */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Abstand von vorne
                                </span>


                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={
                                        functionConfig
                                            .holeRow
                                            ?.frontOffset ??
                                        ""
                                    }
                                    onChange={(event) =>
                                        updateNestedFunctionConfig(
                                            "holeRow",
                                            {
                                                frontOffset:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>


                            {/* Abstand hinten */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Abstand von hinten
                                </span>


                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={
                                        functionConfig
                                            .holeRow
                                            ?.backOffset ??
                                        ""
                                    }
                                    onChange={(event) =>
                                        updateNestedFunctionConfig(
                                            "holeRow",
                                            {
                                                backOffset:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>


                            {/* Start unten */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Lochreihe Start von unten
                                </span>


                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        functionConfig
                                            .holeRow
                                            ?.startFromBottom ??
                                        150
                                    }
                                    onChange={(event) =>
                                        updateNestedFunctionConfig(
                                            "holeRow",
                                            {
                                                startFromBottom:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>


                            {/* Ende oben */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Lochreihe Ende von oben
                                </span>


                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        functionConfig
                                            .holeRow
                                            ?.endFromTop ??
                                        150
                                    }
                                    onChange={(event) =>
                                        updateNestedFunctionConfig(
                                            "holeRow",
                                            {
                                                endFromTop:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>

                        </div>

                    </section>

                </>
            )}


            {/* =================================================
                MITTELWAND
            ================================================= */}

            {functionType === "middleWall" && (

                <section>

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Mittelwände
                    </div>


                    <div className="
                        mt-4
                        space-y-6
                    ">

                        {middleWalls.map(
                            (wall, index) => {

                                const cabinetTop =
                                    getMiddleWallOffset(
                                        wall,
                                        "cabinetTop"
                                    );

                                const cabinetBottom =
                                    getMiddleWallOffset(
                                        wall,
                                        "cabinetBottom"
                                    );

                                const sectionTop =
                                    getMiddleWallOffset(
                                        wall,
                                        "sectionTop"
                                    );

                                const sectionBottom =
                                    getMiddleWallOffset(
                                        wall,
                                        "sectionBottom"
                                    );


                                return (

                                    <div
                                        key={wall.id}
                                        className="
                                            rounded-lg
                                            border
                                            border-gray-800
                                            bg-gray-950
                                            p-3
                                        "
                                    >

                                        {/* =================================
                                            Kopf
                                        ================================= */}

                                        <div className="
                                            mb-4
                                            flex
                                            items-center
                                            justify-between
                                        ">

                                            <div className="
                                                text-sm
                                                font-medium
                                                text-gray-200
                                            ">
                                                Mittelwand {index + 1}
                                            </div>


                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeMiddleWall(
                                                        wall.id
                                                    )
                                                }
                                                disabled={
                                                    middleWalls.length <= 1
                                                }
                                                className="
                                                    rounded
                                                    px-2
                                                    py-1
                                                    text-xs
                                                    text-red-400
                                                    hover:bg-red-950
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-30
                                                "
                                            >
                                                Entfernen
                                            </button>

                                        </div>


                                        {/* =================================
                                            Position von Korpus oben
                                        ================================= */}

                                        <label className="block">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Korpusoberkante
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    Number(
                                                        cabinetTop
                                                    ).toFixed(1)
                                                }
                                                onChange={(event) =>
                                                    setMiddleWallPosition(
                                                        wall.id,
                                                        "cabinetTop",
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>


                                        {/* =================================
                                            Position von Korpus unten
                                        ================================= */}

                                        <label className="
                                            mt-3
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Korpusunterkante
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    Number(
                                                        cabinetBottom
                                                    ).toFixed(1)
                                                }
                                                onChange={(event) =>
                                                    setMiddleWallPosition(
                                                        wall.id,
                                                        "cabinetBottom",
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>


                                        {/* =================================
                                            Position von Sektion oben
                                        ================================= */}

                                        <label className="
                                            mt-3
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Sektionoberkante
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    Number(
                                                        sectionTop
                                                    ).toFixed(1)
                                                }
                                                onChange={(event) =>
                                                    setMiddleWallPosition(
                                                        wall.id,
                                                        "sectionTop",
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>


                                        {/* =================================
                                            Position von Sektion unten
                                        ================================= */}

                                        <label className="
                                            mt-3
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Sektionunterkante
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    Number(
                                                        sectionBottom
                                                    ).toFixed(1)
                                                }
                                                onChange={(event) =>
                                                    setMiddleWallPosition(
                                                        wall.id,
                                                        "sectionBottom",
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>


                                        {/* =================================
                                            Aktiver Bezug
                                        ================================= */}

                                        <label className="
                                            mt-3
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Aktiver Bezug
                                            </span>


                                            <select
                                                value={
                                                    wall.positionReference
                                                }
                                                onChange={(event) =>
                                                    updateMiddleWall(
                                                        wall.id,
                                                        {
                                                            positionReference:
                                                                event.target.value
                                                        }
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-800
                                                    px-3
                                                    py-2
                                                    text-sm
                                                    text-white
                                                "
                                            >

                                                <option value="sectionBottom">
                                                    Sektion unten
                                                </option>

                                                <option value="sectionTop">
                                                    Sektion oben
                                                </option>

                                                <option value="cabinetBottom">
                                                    Korpus unten
                                                </option>

                                                <option value="cabinetTop">
                                                    Korpus oben
                                                </option>

                                            </select>

                                        </label>


                                        {/* =================================
                                            Aktueller Abstand
                                        ================================= */}

                                        <label className="
                                            mt-3
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Abstand des Mittelpunktes
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    Number(
                                                        wall.positionOffset ??
                                                        0
                                                    ).toFixed(1)
                                                }
                                                onChange={(event) =>
                                                    setMiddleWallPosition(
                                                        wall.id,
                                                        wall.positionReference,
                                                        event.target.value
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>

                                    </div>
                                );
                            }
                        )}


                        {/* =================================================
                            Weitere Mittelwand
                        ================================================= */}

                        <button
                            type="button"
                            onClick={
                                addMiddleWall
                            }
                            className="
                                w-full
                                rounded
                                border
                                border-gray-700
                                bg-gray-800
                                px-3
                                py-2
                                text-sm
                                hover:bg-gray-700
                            "
                        >
                            + Mittelwand hinzufügen
                        </button>

                    </div>

                </section>
            )}


            {/* =================================================
                LEGRABOX
            ================================================= */}

            {functionType === "legrabox" && (

    <>

        {/* =====================================================
            LEGRABOXEN
        ===================================================== */}

        <section>

            <div className="
                text-xs
                uppercase
                tracking-wide
                text-gray-500
            ">
                Legraboxen
            </div>


            <div className="
                mt-4
                space-y-5
            ">


                {(
                    functionConfig.legraboxes ?? []
                ).map(
                    (box, index) => (

                        <div
                            key={box.id}
                            className="
                                rounded-lg
                                border
                                border-gray-800
                                bg-gray-800
                                p-3
                            "
                        >

                            {/* =================================
                                Kopf
                            ================================= */}

                            <div className="
                                mb-4
                                flex
                                items-center
                                justify-between
                            ">

                                <div className="
                                    text-sm
                                    font-medium
                                    text-gray-200
                                ">
                                    Legrabox {index + 1}
                                </div>


                                <button
                                    type="button"
                                    onClick={() =>
                                        removeLegrabox(
                                            box.id
                                        )
                                    }
                                    disabled={
                                        (
                                            functionConfig
                                                .legraboxes
                                                ?.length ?? 0
                                        ) <= 1
                                    }
                                    className="
                                        rounded
                                        px-2
                                        py-1
                                        text-xs
                                        text-red-400
                                        hover:bg-red-950
                                        disabled:cursor-not-allowed
                                        disabled:opacity-30
                                    "
                                >
                                    Entfernen
                                </button>

                            </div>


                            {/* =================================
                                Variante
                            ================================= */}

                            <label className="block">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Variante
                                </span>


                                <select
                                    value={
                                        box.variant ?? "M"
                                    }
                                    onChange={(event) =>
                                        updateLegrabox(
                                            box.id,
                                            {
                                                variant:
                                                    event.target.value
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-sm
                                        text-white
                                        focus:border-blue-500
                                        focus:outline-none
                                    "
                                >

                                    <option value="M">
                                        M
                                    </option>

                                    <option value="C">
                                        C
                                    </option>

                                    <option value="K">
                                        K
                                    </option>

                                    <option value="L">
                                        L
                                    </option>

                                </select>

                            </label>


                            {/* =================================
                                Auszugtiefe
                            ================================= */}

                            <label className="
                                mt-3
                                block
                            ">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Auszugtiefe
                                </span>


                                <select
                                    value={
                                        box.drawerDepth ??
                                        getDefaultDrawerDepth(
                                            activeCabinet.depth
                                        )
                                    }
                                    onChange={(event) =>
                                        updateLegrabox(
                                            box.id,
                                            {
                                                drawerDepth:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-sm
                                        text-white
                                    "
                                >

                                    {DRAWER_DEPTHS.map(
                                        depth => (

                                            <option
                                                key={depth}
                                                value={depth}
                                            >
                                                {depth} mm
                                            </option>

                                        )
                                    )}

                                </select>

                            </label>


                            {/* =================================
                                Position
                            ================================= */}

                            <label className="
                                mt-3
                                block
                            ">

                                <span className="
                                    text-xs
                                    text-gray-400
                                ">
                                    Position über
                                    Sektionunterkante
                                </span>


                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={
                                        box.positionFromBottom ??
                                        40
                                    }
                                    onChange={(event) =>
                                        updateLegrabox(
                                            box.id,
                                            {
                                                positionFromBottom:
                                                    Number(
                                                        event.target.value
                                                    )
                                            }
                                        )
                                    }
                                    className="
                                        mt-1
                                        w-full
                                        rounded-lg
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-white
                                    "
                                />

                            </label>


                            {/* =================================
                                Aufdopplungen
                            ================================= */}

                            <div className="
                                mt-5
                                border-t
                                border-gray-800
                                pt-4
                            ">

                                <div className="
                                    text-xs
                                    uppercase
                                    tracking-wide
                                    text-gray-500
                                ">
                                    Aufdopplungen
                                </div>


                                <div className="
                                    mt-3
                                    space-y-3
                                ">


                                    {/* Links */}

                                    <label className="
                                        flex
                                        items-center
                                        gap-2
                                        text-sm
                                        text-gray-300
                                    ">

                                        <input
                                            type="checkbox"
                                            checked={
                                                box.doubling
                                                    ?.left ??
                                                false
                                            }
                                            onChange={(event) =>
                                                updateLegraboxDoubling(
                                                    box.id,
                                                    {
                                                        left:
                                                            event.target.checked
                                                    }
                                                )
                                            }
                                            className="
                                                h-4
                                                w-4
                                                rounded
                                                border-gray-700
                                                bg-gray-800
                                            "
                                        />

                                        Aufdopplung links

                                    </label>


                                    {/* Rechts */}

                                    <label className="
                                        flex
                                        items-center
                                        gap-2
                                        text-sm
                                        text-gray-300
                                    ">

                                        <input
                                            type="checkbox"
                                            checked={
                                                box.doubling
                                                    ?.right ??
                                                false
                                            }
                                            onChange={(event) =>
                                                updateLegraboxDoubling(
                                                    box.id,
                                                    {
                                                        right:
                                                            event.target.checked
                                                    }
                                                )
                                            }
                                            className="
                                                h-4
                                                w-4
                                                rounded
                                                border-gray-700
                                                bg-gray-800
                                            "
                                        />

                                        Aufdopplung rechts

                                    </label>


                                    {/* Stärke */}

                                    {(
                                        box.doubling?.left ||
                                        box.doubling?.right
                                    ) && (

                                        <label className="
                                            block
                                        ">

                                            <span className="
                                                text-xs
                                                text-gray-400
                                            ">
                                                Stärke der
                                                Aufdopplung
                                            </span>


                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={
                                                    box.doubling
                                                        ?.thickness ??
                                                    0
                                                }
                                                onChange={(event) =>
                                                    updateLegraboxDoubling(
                                                        box.id,
                                                        {
                                                            thickness:
                                                                Number(
                                                                    event.target.value
                                                                )
                                                        }
                                                    )
                                                }
                                                className="
                                                    mt-1
                                                    w-full
                                                    rounded-lg
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-3
                                                    py-2
                                                    text-white
                                                "
                                            />

                                        </label>
                                    )}

                                </div>

                            </div>

                        </div>

                    )
                )}


                {/* =================================================
                    Neue Legrabox
                ================================================= */}

                <button
                    type="button"
                    onClick={
                        addLegrabox
                    }
                    className="
                        w-full
                        rounded
                        border
                        border-gray-700
                        bg-gray-800
                        px-3
                        py-2
                        text-sm
                        hover:bg-gray-700
                    "
                >
                    + Legrabox hinzufügen
                </button>

            </div>

        </section>

    </>
)}

        </div>
    );
}