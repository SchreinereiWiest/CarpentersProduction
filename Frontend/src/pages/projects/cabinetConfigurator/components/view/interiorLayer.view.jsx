export function InteriorLayer({
    cabinet,
    selectedElement,
    onSelect
}) {

    const sections = cabinet.sections ?? [];

    const thickness =
        Number(cabinet.thickness) || 19;

    const width =
        Number(cabinet.width) || 0;

    const height =
        Number(cabinet.height) || 0;


    const topOffset =
        Number(cabinet.topOffset ?? 0);

    const bottomOffset =
        Number(cabinet.bottomOffset ?? 0);

    const topExists =
        cabinet.topExists ?? true;

    const bottomExists =
        cabinet.bottomExists ?? true;


    /*
     * ------------------------------------------------------------
     * Korpusinnenraum
     * ------------------------------------------------------------
     */

    const innerLeft =
        thickness;

    const innerWidth =
        Math.max(
            0,
            width - 2 * thickness
        );


    const deckelY =
        topOffset;

    const bodenY =
        height -
        bottomOffset -
        thickness;


    /*
     * ------------------------------------------------------------
     * Hilfsfunktion: FunctionConfig
     * ------------------------------------------------------------
     *
     * Neue Struktur:
     *
     * functionConfig: [
     *   {
     *     id: ...,
     *     type: "shelf",
     *     ...
     *   },
     *   {
     *     id: ...,
     *     type: "middleWall",
     *     ...
     *   }
     * ]
     *
     * Für den Übergang akzeptieren wir hier zusätzlich noch
     * die alte Objektstruktur. Neue Daten werden aber nur
     * als Array erzeugt.
     */

    const getFunctions = (section) => {

        if (Array.isArray(section.functionConfig)) {
            return section.functionConfig;
        }

        /*
         * Legacy-Unterstützung
         */
        const config =
            section.functionConfig ?? {};

        const functions = [];


        /*
         * Alte Shelf-Struktur
         */
        if (
            config.compartmentCount !== undefined ||
            config.holeRow !== undefined ||
            config.shelfFrontOffset !== undefined
        ) {

            functions.push({
                id: `legacy-shelf-${section.id}`,

                type: "shelf",

                compartmentCount:
                    config.compartmentCount ?? 2,

                shelfFrontOffset:
                    config.shelfFrontOffset ?? 0,

                holeRow:
                    config.holeRow ?? {}
            });
        }


        /*
         * Alte Mittelwand-Struktur
         */
        if (Array.isArray(config.middleWalls)) {

            config.middleWalls.forEach(
                wall => {

                    functions.push({
                        ...wall,

                        id:
                            wall.id ??
                            `legacy-middleWall-${section.id}-${functions.length}`,

                        type: "middleWall"
                    });

                }
            );
        }


        /*
         * Alte Legrabox-Struktur
         */
        if (Array.isArray(config.legraboxes)) {

            config.legraboxes.forEach(
                box => {

                    functions.push({
                        ...box,

                        id:
                            box.id ??
                            `legacy-legrabox-${section.id}-${functions.length}`,

                        type: "legrabox"
                    });

                }
            );
        }


        return functions;
    };


    /*
     * ------------------------------------------------------------
     * Mittelwandposition berechnen
     * ------------------------------------------------------------
     *
     * Das Ergebnis ist die tatsächliche Position der
     * Mittelwand-Mittellinie im SVG.
     */

    const getMiddleWallCenter = (
        section,
        wall
    ) => {

        const orientation =
            wall.orientation ?? "horizontal";

        const positionReference =
            wall.positionReference ?? "sectionBottom";

        const positionOffset =
            Number(
                wall.positionOffset ?? 0
            );


        const sectionX =
            Number(section.x) || 0;

        const sectionY =
            Number(section.y) || 0;

        const sectionWidth =
            Number(section.width) || 0;

        const sectionHeight =
            Number(section.height) || 0;


        /*
         * --------------------------------------------
         * Vertikale Mittelwand
         * --------------------------------------------
         */

        if (orientation === "vertical") {

            switch (positionReference) {

                case "cabinetLeft":
                    return positionOffset;

                case "cabinetRight":
                    return width - positionOffset;

                case "sectionLeft":
                    return (
                        sectionX +
                        positionOffset
                    );

                case "sectionRight":
                    return (
                        sectionX +
                        sectionWidth -
                        positionOffset
                    );

                default:
                    return (
                        sectionX +
                        sectionWidth / 2
                    );
            }
        }


        /*
         * --------------------------------------------
         * Horizontale Mittelwand
         * --------------------------------------------
         */

        switch (positionReference) {

            case "cabinetTop":
                return positionOffset;

            case "cabinetBottom":
                return height - positionOffset;

            case "sectionTop":
                return (
                    sectionY +
                    positionOffset
                );

            case "sectionBottom":
                return (
                    sectionY +
                    sectionHeight -
                    positionOffset
                );

            default:
                return (
                    sectionY +
                    sectionHeight / 2
                );
        }
    };


    /*
     * ------------------------------------------------------------
     * Funktionen einer Sektion zeichnen
     * ------------------------------------------------------------
     */

    const renderFunctions = (section) => {

        const functions =
            getFunctions(section);

        const elements = [];


        /*
         * ========================================================
         * Jede Funktion einzeln bearbeiten
         * ========================================================
         */

        functions.forEach(
            (func, functionIndex) => {


                /*
                 * ==================================================
                 * EINLEGEBÖDEN + LOCHREIHE
                 * ==================================================
                 */

                if (func.type === "shelf") {

    const compartmentCount = Math.max(
        1,
        Number(func.compartmentCount ?? 1)
    );

    const shelfCount = Math.max(
        0,
        compartmentCount - 1
    );

    /*
     * Abstände:
     *
     * endFromTop:
     * Abstand vom oberen Rand der Sektion
     *
     * startFromBottom:
     * Abstand vom unteren Rand der Sektion
     */
    const startFromBottom = Math.max(
        0,
        Number(func.holeRow?.startFromBottom ?? 0)
    );

    const endFromTop = Math.max(
        0,
        Number(func.holeRow?.endFromTop ?? 0)
    );


    /*
     * Nutzbare Höhe zwischen den beiden Grenzen
     */
    const usableHeight = Math.max(
        0,
        Number(section.height) -
        startFromBottom -
        endFromTop
    );


    /*
     * Oberer Startpunkt des Bereichs
     */
    const areaTop =
        Number(section.y) +
        endFromTop;


    /*
     * Unterer Endpunkt des Bereichs
     */
    const areaBottom =
        Number(section.y) +
        Number(section.height) -
        startFromBottom;


    /*
     * Fächer innerhalb dieses Bereichs verteilen
     */
    if (shelfCount > 0 && usableHeight > 0) {

        for (
            let index = 1;
            index <= shelfCount;
            index++
        ) {

            const y =
                areaTop +
                (
                    usableHeight *
                    index /
                    compartmentCount
                ) -
                thickness / 2;


            elements.push(
                <rect
                    key={
                        `shelf-${section.id}-${func.id}-${index}`
                    }
                    x={section.x}
                    y={y}
                    width={section.width}
                    height={thickness}
                    fill="#4b5563"
                    stroke="#9ca3af"
                    strokeWidth="1"
                    pointerEvents="none"
                />
            );
        }
    }
}


                /*
                 * ==================================================
                 * MITTELWAND
                 * ==================================================
                 */

                if (func.type === "middleWall") {

                    const orientation =
                        func.orientation ??
                        "horizontal";


                    const center =
                        getMiddleWallCenter(
                            section,
                            func
                        );


                    /*
                     * --------------------------------------------
                     * Horizontale Mittelwand
                     * --------------------------------------------
                     */

                    if (
                        orientation ===
                        "horizontal"
                    ) {

                        const y =
                            center -
                            thickness / 2;


                        /*
                         * Nur zeichnen, wenn die Mittelwand
                         * innerhalb der Sektion liegt.
                         */

                        const sectionTop =
                            Number(section.y);

                        const sectionBottom =
                            Number(section.y) +
                            Number(section.height);


                        if (
                            center >=
                                sectionTop -
                                thickness / 2 &&
                            center <=
                                sectionBottom +
                                thickness / 2
                        ) {

                            elements.push(
                                <rect
                                    key={
                                        `middleWall-${section.id}-${func.id}`
                                    }
                                    x={section.x}
                                    y={y}
                                    width={section.width}
                                    height={thickness}
                                    fill="#4b5563"
                                    stroke="#9ca3af"
                                    strokeWidth="1"
                                    pointerEvents="none"
                                />
                            );
                        }
                    }


                    /*
                     * --------------------------------------------
                     * Vertikale Mittelwand
                     * --------------------------------------------
                     */

                    if (
                        orientation ===
                        "vertical"
                    ) {

                        const x =
                            center -
                            thickness / 2;


                        const sectionLeft =
                            Number(section.x);

                        const sectionRight =
                            Number(section.x) +
                            Number(section.width);


                        if (
                            center >=
                                sectionLeft -
                                thickness / 2 &&
                            center <=
                                sectionRight +
                                thickness / 2
                        ) {

                            elements.push(
                                <rect
                                    key={
                                        `middleWall-${section.id}-${func.id}`
                                    }
                                    x={x}
                                    y={section.y}
                                    width={thickness}
                                    height={section.height}
                                    fill="#4b5563"
                                    stroke="#9ca3af"
                                    strokeWidth="1"
                                    pointerEvents="none"
                                />
                            );
                        }
                    }
                }


                /*
                 * ==================================================
                 * LEGRABOX
                 * ==================================================
                 */

                if (func.type === "legrabox") {

                    const heights = {
                        M: 60,
                        K: 100,
                        C: 130,
                        L: 200
                    };


                    const variant =
                        func.variant ?? "M";


                    const boxHeight =
                        heights[variant] ?? 60;


                    const positionFromBottom =
                        Math.max(
                            0,
                            Number(
                                func.positionFromBottom ?? 40
                            )
                        );


                    /*
                     * Unterkante der Legrabox liegt
                     * positionFromBottom über der
                     * Sektionunterkante.
                     */

                    const y =
                        Number(section.y) +
                        Number(section.height) -
                        positionFromBottom -
                        boxHeight +37;


                    const sectionTop =
                        Number(section.y);

                    const sectionBottom =
                        Number(section.y) +
                        Number(section.height);


                    /*
                     * Nur zeichnen, wenn die Box innerhalb
                     * der Sektion liegt.
                     */

                    if (
                        y + boxHeight >= sectionTop &&
                        y <= sectionBottom
                    ) {

                        /*
                         * Hauptkörper
                         */
                        elements.push(
                            <rect
                                key={
                                    `legrabox-${section.id}-${func.id}`
                                }
                                x={section.x}
                                y={y}
                                width={section.width}
                                height={boxHeight}
                                fill="#374151"
                                stroke="#a1a1aa"
                                strokeWidth="1"
                                pointerEvents="none"
                            />
                        );


                        /*
                         * ------------------------------------------
                         * Aufdopplung links
                         * ------------------------------------------
                         *
                         * Nur als visuelle Darstellung.
                         */

                        if (
                            func.doubling?.left
                        ) {

                            const doublingThickness =
                                Math.max(
                                    0,
                                    Number(
                                        func.doubling.thickness ??
                                        0
                                    )
                                );


                            if (
                                doublingThickness > 0
                            ) {

                                elements.push(
                                    <rect
                                        key={
                                            `legrabox-${section.id}-${func.id}-doubling-left`
                                        }
                                        x={section.x}
                                        y={y}
                                        width={
                                            doublingThickness
                                        }
                                        height={boxHeight}
                                        fill="#1f2937"
                                        stroke="#9ca3af"
                                        strokeWidth="1"
                                        pointerEvents="none"
                                    />
                                );
                            }
                        }


                        /*
                         * ------------------------------------------
                         * Aufdopplung rechts
                         * ------------------------------------------
                         */

                        if (
                            func.doubling?.right
                        ) {

                            const doublingThickness =
                                Math.max(
                                    0,
                                    Number(
                                        func.doubling.thickness ??
                                        0
                                    )
                                );


                            if (
                                doublingThickness > 0
                            ) {

                                elements.push(
                                    <rect
                                        key={
                                            `legrabox-${section.id}-${func.id}-doubling-right`
                                        }
                                        x={
                                            Number(section.x) +
                                            Number(section.width) -
                                            doublingThickness
                                        }
                                        y={y}
                                        width={
                                            doublingThickness
                                        }
                                        height={boxHeight}
                                        fill="#1f2937"
                                        stroke="#9ca3af"
                                        strokeWidth="1"
                                        pointerEvents="none"
                                    />
                                );
                            }
                        }
                    }
                }

            }
        );


        return elements;
    };


    /*
     * ------------------------------------------------------------
     * Sektionen rekursiv zeichnen
     * ------------------------------------------------------------
     */

    const renderSections = (
        sectionList,
        parentNumber = ""
    ) => {

        return sectionList.map(
            (section, index) => {

                const sectionNumber =
                    parentNumber
                        ? `${parentNumber}.${index + 1}`
                        : `${index + 1}`;


                const selected =
                    selectedElement?.id ===
                    section.id;


                return (
                    <g
                        key={section.id}
                    >

                        {/* ==========================================
                            Sektion
                            ========================================== */}

                        <g
                            onClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id: section.id,
                                    type: "section",
                                    x: section.x,
                                    y: section.y,
                                    width: section.width,
                                    height: section.height
                                });

                            }}

                            onDoubleClick={(event) => {

                                event.stopPropagation();

                                onSelect({
                                    id: section.id,
                                    type: "section",
                                    x: section.x,
                                    y: section.y,
                                    width: section.width,
                                    height: section.height,
                                    openSetup: true
                                });

                            }}

                            className="cursor-pointer"
                        >

                            <rect
                                x={section.x}
                                y={section.y}
                                width={section.width}
                                height={section.height}
                                fill={
                                    selected
                                        ? "#de7b2f"
                                        : "#1F2937"
                                }
                                stroke={
                                    selected
                                        ? "#e36e15"
                                        : "#9CA3AF"
                                }
                                strokeWidth={
                                    selected
                                        ? 3
                                        : 2
                                }
                            />

                            <text
                                x={
                                    section.x +
                                    section.width / 2
                                }
                                y={
                                    section.y +
                                    section.height / 2
                                }
                                fill="#a1a1aa"
                                fontSize="48"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                pointerEvents="none"
                            >
                                {sectionNumber}
                            </text>

                        </g>


                        {/* ==========================================
                            Funktionen
                            ========================================== */}

                        <g pointerEvents="none">
                            {renderFunctions(section)}
                        </g>


                        {/* ==========================================
                            Untersektionen
                            ========================================== */}

                        {section.children?.length > 0 &&
                            renderSections(
                                section.children,
                                sectionNumber
                            )
                        }

                    </g>
                );

            }
        );
    };


    /*
     * ------------------------------------------------------------
     * Render
     * ------------------------------------------------------------
     */

    return (
        <g>

            {/* ================================================
                Deckel
                ================================================ */}

            {topExists && (
                <rect
                    x={innerLeft}
                    y={deckelY}
                    width={innerWidth}
                    height={thickness}
                    fill="#4B5563"
                    stroke="#374151"
                    strokeWidth="1"
                    pointerEvents="none"
                />
            )}


            {/* ================================================
                Boden
                ================================================ */}

            {bottomExists && (
                <rect
                    x={innerLeft}
                    y={bodenY}
                    width={innerWidth}
                    height={thickness}
                    fill="#4B5563"
                    stroke="#374151"
                    strokeWidth="1"
                    pointerEvents="none"
                />
            )}


            {/* ================================================
                Sektionen
                ================================================ */}

            {renderSections(sections)}

        </g>
    );
}