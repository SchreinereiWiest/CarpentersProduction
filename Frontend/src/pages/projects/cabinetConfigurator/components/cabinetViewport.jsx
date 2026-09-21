import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import {Grid} from "./view/grid.view";
import {DimensionLayer} from "./view/messures.view";
import {FrontLayer} from "./view/front.view";
import {InteriorLayer} from "./view/interiorLayer.view";
import {CarcassLayer} from "./view/corpus.view";




const DEFAULT_CABINET = {
    width: 600,
    height: 2000,
    depth: 580,
    thickness: 19
};


const DEFAULT_VIEW_PADDING = 150;


function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


export default function CabinetViewport({
    cabinet = DEFAULT_CABINET,
    mode = "interior",
    onSelect,
    selectedElement,
    showGrid = true
}) {

    const svgRef = useRef(null);
    const containerRef = useRef(null);

    /*
    ----------------------------------------------------
    Aktuelles SVG ViewBox

    x / y      = linke obere Ecke im Weltkoordinatensystem
    width      = sichtbare Breite in mm
    height     = sichtbare Höhe in mm
    ----------------------------------------------------
    */

    const [viewBox, setViewBox] = useState({
        x: -DEFAULT_VIEW_PADDING,
        y: -DEFAULT_VIEW_PADDING,
        width: cabinet.width + DEFAULT_VIEW_PADDING * 2,
        height: cabinet.height + DEFAULT_VIEW_PADDING * 2
    });


    /*
    ----------------------------------------------------
    Space gedrückt?
    ----------------------------------------------------
    */

    const [spacePressed, setSpacePressed] =
        useState(false);


    /*
    ----------------------------------------------------
    Pan-Status
    ----------------------------------------------------
    */

    const panState = useRef({
        active: false,

        startClientX: 0,
        startClientY: 0,

        startViewX: 0,
        startViewY: 0
    });


    /*
    ====================================================
    VIEWBOX AUF KORPUS EINPASSEN
    ====================================================
    */

    const fitCabinet = useCallback(() => {

        const container =
            containerRef.current;

        if (!container) {
            return;
        }


        const rect =
            container.getBoundingClientRect();


        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }


        const padding =
            DEFAULT_VIEW_PADDING;


        const cabinetWidth =
            cabinet.width;

        const cabinetHeight =
            cabinet.height;


        /*
        ------------------------------------------------
        Verfügbare Außenfläche
        ------------------------------------------------
        */

        let width =
            cabinetWidth +
            padding * 2;

        let height =
            cabinetHeight +
            padding * 2;


        /*
        ------------------------------------------------
        Seitenverhältnis an Browserfläche anpassen
        ------------------------------------------------
        */

        const viewportRatio =
            rect.width / rect.height;

        const contentRatio =
            width / height;


        if (
            contentRatio < viewportRatio
        ) {

            width =
                height *
                viewportRatio;

        } else {

            height =
                width /
                viewportRatio;
        }


        /*
        ------------------------------------------------
        Korpus mittig platzieren
        ------------------------------------------------
        */

        const x =
            cabinetWidth / 2 -
            width / 2;

        const y =
            cabinetHeight / 2 -
            height / 2;


        setViewBox({
            x,
            y,
            width,
            height
        });

    }, [
        cabinet.width,
        cabinet.height
    ]);


    /*
    ====================================================
    Beim Öffnen / Größenänderung einpassen
    ====================================================
    */

    useEffect(() => {

        fitCabinet();

    }, [
        fitCabinet
    ]);


    /*
    ----------------------------------------------------
    ResizeObserver
    ----------------------------------------------------
    */

    useEffect(() => {

        const container =
            containerRef.current;

        if (!container) {
            return;
        }


        const observer =
            new ResizeObserver(() => {

                fitCabinet();

            });


        observer.observe(
            container
        );


        return () => {
            observer.disconnect();
        };

    }, [
        fitCabinet
    ]);


    /*
    ====================================================
    KEYBOARD SPACE
    ====================================================
    */

    useEffect(() => {

        const handleKeyDown = (event) => {

            if (
                event.code === "Space"
            ) {

                event.preventDefault();

                setSpacePressed(true);
            }
        };


        const handleKeyUp = (event) => {

            if (
                event.code === "Space"
            ) {

                event.preventDefault();

                setSpacePressed(false);
            }
        };


        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        window.addEventListener(
            "keyup",
            handleKeyUp
        );


        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

            window.removeEventListener(
                "keyup",
                handleKeyUp
            );

        };

    }, []);


    /*
    ====================================================
    CLIENT → SVG/MM
    ====================================================
    */

    const clientToWorld = useCallback(
        (
            clientX,
            clientY
        ) => {

            const svg =
                svgRef.current;

            if (!svg) {
                return null;
            }


            const rect =
                svg.getBoundingClientRect();


            const relativeX =
                (
                    clientX -
                    rect.left
                ) /
                rect.width;


            const relativeY =
                (
                    clientY -
                    rect.top
                ) /
                rect.height;


            return {

                x:
                    viewBox.x +
                    relativeX *
                    viewBox.width,

                y:
                    viewBox.y +
                    relativeY *
                    viewBox.height
            };

        },
        [viewBox]
    );


    /*
    ====================================================
    ZOOM
    ====================================================
    */

    const handleWheel = useCallback(
        (event) => {

            event.preventDefault();


            const mouse =
                clientToWorld(
                    event.clientX,
                    event.clientY
                );


            if (!mouse) {
                return;
            }


            /*
            ------------------------------------------------
            delta < 0 = hineinzoomen
            ------------------------------------------------
            */

            const zoomFactor =
                event.deltaY < 0
                    ? 0.85
                    : 1.15;


            let newWidth =
                viewBox.width *
                zoomFactor;


            let newHeight =
                viewBox.height *
                zoomFactor;


            /*
            ------------------------------------------------
            Zoom begrenzen
            ------------------------------------------------
            */

            const minWidth =
                80;

            const maxWidth =
                20000;


            if (
                newWidth < minWidth
            ) {

                newWidth =
                    minWidth;

                newHeight =
                    viewBox.height *
                    (
                        minWidth /
                        viewBox.width
                    );
            }


            if (
                newWidth > maxWidth
            ) {

                newWidth =
                    maxWidth;

                newHeight =
                    viewBox.height *
                    (
                        maxWidth /
                        viewBox.width
                    );
            }


            /*
            ------------------------------------------------
            Mausposition innerhalb des ViewBox
            ------------------------------------------------
            */

            const mouseRatioX =
                (
                    mouse.x -
                    viewBox.x
                ) /
                viewBox.width;


            const mouseRatioY =
                (
                    mouse.y -
                    viewBox.y
                ) /
                viewBox.height;


            /*
            ------------------------------------------------
            Neue Position so berechnen,
            dass unter der Maus derselbe Punkt bleibt
            ------------------------------------------------
            */

            const newX =
                mouse.x -
                mouseRatioX *
                newWidth;


            const newY =
                mouse.y -
                mouseRatioY *
                newHeight;


            setViewBox({
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight
            });

        },
        [
            clientToWorld,
            viewBox
        ]
    );


    /*
    ====================================================
    PAN START
    ====================================================
    */

    const handlePointerDown =
        useCallback(
            (event) => {

                const shouldPan =
                    event.button === 1 ||
                    (
                        event.button === 0 &&
                        spacePressed
                    );


                if (!shouldPan) {
                    return;
                }


                event.preventDefault();


                panState.current = {

                    active: true,

                    startClientX:
                        event.clientX,

                    startClientY:
                        event.clientY,

                    startViewX:
                        viewBox.x,

                    startViewY:
                        viewBox.y
                };


                event.currentTarget.setPointerCapture(
                    event.pointerId
                );

            },
            [
                spacePressed,
                viewBox
            ]
        );


    /*
    ====================================================
    PAN MOVE
    ====================================================
    */

    const handlePointerMove =
        useCallback(
            (event) => {

                if (
                    !panState.current.active
                ) {
                    return;
                }


                const svg =
                    svgRef.current;

                if (!svg) {
                    return;
                }


                const rect =
                    svg.getBoundingClientRect();


                /*
                ------------------------------------------------
                Pixel → Weltkoordinaten
                ------------------------------------------------
                */

                const scaleX =
                    viewBox.width /
                    rect.width;


                const scaleY =
                    viewBox.height /
                    rect.height;


                const dx =
                    (
                        event.clientX -
                        panState.current.startClientX
                    ) *
                    scaleX;


                const dy =
                    (
                        event.clientY -
                        panState.current.startClientY
                    ) *
                    scaleY;


                setViewBox({
                    ...viewBox,

                    x:
                        panState.current.startViewX -
                        dx,

                    y:
                        panState.current.startViewY -
                        dy
                });

            },
            [viewBox]
        );


    /*
    ====================================================
    PAN ENDE
    ====================================================
    */

    const handlePointerUp =
        useCallback(
            (event) => {

                panState.current.active =
                    false;


                try {

                    event.currentTarget.releasePointerCapture(
                        event.pointerId
                    );

                } catch {
                    // Ignore
                }

            },
            []
        );


    /*
    ====================================================
    RESET
    ====================================================
    */

    const handleReset =
        useCallback(() => {

            fitCabinet();

        }, [
            fitCabinet
        ]);


    /*
    ====================================================
    AUSWAHL
    ====================================================
    */

    const handleSvgClick =
        useCallback(
            (event) => {

                /*
                ------------------------------------------------
                Während des Pans nichts auswählen
                ------------------------------------------------
                */

                if (
                    panState.current.active
                ) {
                    return;
                }


                const target =
                    event.target;


                const elementId =
                    target.dataset?.elementId;


                if (
                    elementId &&
                    onSelect
                ) {

                    onSelect({
                        id: elementId,

                        type:
                            target.dataset.elementType,

                        x:
                            target.dataset.x
                            ? Number(
                                target.dataset.x
                            )
                            : null,

                        y:
                            target.dataset.y
                            ? Number(
                                target.dataset.y
                            )
                            : null
                    });

                    return;
                }


                /*
                ------------------------------------------------
                Nichts ausgewählt
                ------------------------------------------------
                */

                if (onSelect) {
                    onSelect(null);
                }

            },
            [onSelect]
        );


    /*
    ====================================================
    CURSOR
    ====================================================
    */

    const cursor =
        panState.current.active
            ? "grabbing"
            : spacePressed
                ? "grab"
                : "default";

    return (
        

        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden bg-neutral-900"
        >

            {/* =========================================
                TOOLBAR
            ========================================= */}

            <div
                className="
                    absolute
                    top-3
                    left-3
                    z-20
                    flex
                    
                "
            >

                <button
                    type="button"
                    onClick={handleReset}
                    className="
                rounded
                bg-gray-800
                border
                border-gray-700
                px-3
                py-2
                text-sm
                hover:bg-gray-700
            "
                >
                    Korpus einpassen
                </button>

            </div>



            {/* =========================================
                SVG
            ========================================= */}

            <svg
                ref={svgRef}

                className="w-full h-full"

                viewBox={`
                    ${viewBox.x}
                    ${viewBox.y}
                    ${viewBox.width}
                    ${viewBox.height}
                `}

                preserveAspectRatio="xMidYMid meet"

                style={{
                    cursor,
                    touchAction: "none",
                    userSelect: "none"
                }}

                onWheel={
                    handleWheel
                }

                onPointerDown={
                    handlePointerDown
                }

                onPointerMove={
                    handlePointerMove
                }

                onPointerUp={
                    handlePointerUp
                }

                onPointerCancel={
                    handlePointerUp
                }

                onContextMenu={
                    (event) =>
                        event.preventDefault()
                }

                onClick={
                    handleSvgClick
                }
            >

                {/* =====================================
                    BACKGROUND
                ===================================== */}

                <rect
                    x={viewBox.x - 10000}
                    y={viewBox.y - 10000}
                    width={20000}
                    height={20000}
                    fill="#111827"
                />


                {/* =====================================
                    GRID
                ===================================== */}

                {/* <Grid
                    viewBox={viewBox}
                /> */}


                {/* =====================================
                    ROOT KOORDINATENSYSTEM
                ===================================== */}

                <g>

                    {/* ---------------------------------
                        Korpus
                    --------------------------------- */}

                    <CarcassLayer
                        cabinet={cabinet}
                    />


                    {/* ---------------------------------
                        Innenleben
                    --------------------------------- */}

                    {mode === "interior" && (
                        <InteriorLayer
    cabinet={cabinet}
    selectedElement={selectedElement}
    onSelect={onSelect}
/>
                    )}


                    {/* ---------------------------------
                        Fronten
                    --------------------------------- */}

                    {mode === "front" && (
                        <FrontLayer
                            cabinet={cabinet}
                            selectedElement={selectedElement}
                            onSelect={onSelect}
                        />
                    )}


                    {/* ---------------------------------
                        Maße
                    --------------------------------- */}

                    <DimensionLayer
                        cabinet={cabinet}
                    />

                </g>

            </svg>

        </div>


    );
}

