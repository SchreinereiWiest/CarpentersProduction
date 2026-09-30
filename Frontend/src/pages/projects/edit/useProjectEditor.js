import { useState, useEffect } from 'react'

export function useCorpus() {
    const [corpuses, setCorpuses] = useState([]);
    const [activeCorpus, setActiveCorpus] = useState(null);
    const [activePlate, setActivePlate] = useState(null);

    const [selectedQuantity, setSelectedQuantity] = useState("1");
    const [selectedWidth, setSelectedWidth] = useState("");
    const [selectedHeigth, setSelectedHeigth] = useState("");
    const [selectedDepth, setSelectedDepth] = useState("");
    const [selectedName, setSelectedName] = useState("");
    const [selectedPreset, setSelectedPreset] = useState("def");

    const [KorpusMaterialId, setKorpusMaterialId] = useState("");
    //mehrfachEdgeMat
    const [EdgeMaterialId, setEdgeMaterialId] = useState("");
    const [KorpusEdit, setkorpusEdit] = useState(false);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedEdges, setSelectedEdges] = useState({
    top: false,
    right: false,
    bottom: false,
    left: false
});


    function deleteCorpus(corpusId) {

        setCorpuses(prev =>
            prev.filter(corpus => corpus.id !== corpusId)
        );

        if (activeCorpus?.id === corpusId) {
            setActiveCorpus(null);
        }

    }   

function createCorpus(override = null, type = "KO") {

    /*
     * Einheitliche Typen:
     * "KO"    = Gruppe
     * "plate" = einzelne Platte
     */
    const normalizedType =
        type?.toLowerCase() === "plate"
            ? "plate"
            : "KO";

    /*
     * ------------------------------------------------------------
     * NEUE GRUPPE
     * ------------------------------------------------------------
     *
     * Eine neu angelegte KO-Gruppe hat bewusst:
     * - keine Höhe
     * - keine Breite
     * - keine Tiefe
     * - kein Preset
     *
     * Sie besteht nur aus Name, Anzahl und Children.
     */
    const isNewGroup =
        override === null &&
        normalizedType === "KO";


    /*
     * ------------------------------------------------------------
     * Neue Gruppe erstellen
     * ------------------------------------------------------------
     */

    if (isNewGroup) {

        const corpus = {
            id: Date.now() + Math.random(),

            name: selectedName || "Neue Gruppe",

            quantity:
                selectedQuantity === "" ||
                selectedQuantity === null ||
                selectedQuantity === undefined
                    ? 1
                    : Number(selectedQuantity),

            type: "KO",

            groupOnly: true,

            Children: []
        };

        setCorpuses(prev => [
            ...prev,
            corpus
        ]);

        /*
         * Eingabefelder zurücksetzen.
         * Es gibt bei einer Gruppe keine Maße und kein Preset.
         */
        setSelectedName("");
        setSelectedHeigth("");
        setSelectedWidth("");
        setSelectedDepth("");
        setSelectedQuantity("1");
        setSelectedPreset("def");

        /*
         * Neue Gruppe direkt auswählen
         */
        setActiveCorpus(corpus);
        setActivePlate(null);

        return;
    }


    /*
     * ------------------------------------------------------------
     * Bestehende KO-Struktur bearbeiten
     * ------------------------------------------------------------
     *
     * Dieser Teil bleibt vorerst für bestehende Daten bzw.
     * bestehende Aufrufe mit override erhalten.
     */
    let children = [];

    if (normalizedType === "KO") {

        if (activeCorpus != null) {
            children = activeCorpus.Children ?? [];
        }

        const material = materials.find(
            material => material.id === KorpusMaterialId
        );

        switch (selectedPreset) {

            case "kitchen_base":
                // später
                break;

            case "kitchen_sink":
                // später
                break;

            case "corpus_horizontal":
                // später
                break;

            case "corpus_vertical":

                if (!material) {
                    console.warn(
                        "Kein Korpusmaterial gefunden."
                    );
                    break;
                }

                children = [
                    ...children.filter(
                        child =>
                            ![0, 1, 2].includes(child.id)
                    ),

                    {
                        id: Date.now() + Math.random(),
                        name: "Seiten",
                        quantity: 2 * Number(selectedQuantity || 1),
                        width: selectedDepth,
                        height: selectedHeigth,
                        depth: material.thickness,
                        type: "Seite",
                        MID: "",
                        EBID: "",
                        ETID: "",
                        ELID: "",
                        ERID: KorpusMaterialId
                    },

                    {
                        id: Date.now() + Math.random(),
                        name: "Boden",
                        quantity: 2 * Number(selectedQuantity || 1),
                        width: selectedDepth,
                        height:
                            Number(selectedWidth) -
                            material.thickness * 2,
                        depth: material.thickness,
                        type: "Boden",
                        MID: "",
                        EBID: "",
                        ETID: "",
                        ELID: "",
                        ERID: KorpusMaterialId
                    },

                    {
                        id: Date.now() + Math.random(),
                        name: "Rückwand",
                        quantity: Number(selectedQuantity || 1),
                        width: selectedWidth,
                        height: selectedHeigth,
                        depth: 8,
                        type: "Back",
                        MID: "",
                        EBID: "",
                        ETID: "",
                        ELID: "",
                        ERID: ""
                    }
                ];

                break;

            default:
                break;
        }


        /*
         * Korpusmaterial auf die Kinder übertragen
         */
        if (KorpusMaterialId !== "") {

            children = children.map(child => ({
                ...child,
                MID: KorpusMaterialId
            }));

        }


        /*
         * Bei einem bestehenden Korpus Maße der
         * abhängigen Platten neu berechnen.
         */
        if (override !== null) {
            children = updateChildren(
                children,
                materials
            );
        }
    }


    /*
     * ------------------------------------------------------------
     * Einzelplatte
     * ------------------------------------------------------------
     */

    if (normalizedType === "plate") {

        const corpus = {

            id:
                override === null
                    ? Date.now() + Math.random()
                    : override,

            name: selectedName,

            quantity:
                selectedQuantity === "" ||
                selectedQuantity === null ||
                selectedQuantity === undefined
                    ? 1
                    : selectedQuantity,

            width: selectedWidth,
            height: selectedHeigth,
            depth: selectedDepth,

            preset: selectedPreset,

            MID: KorpusMaterialId,

            type: "plate",

            Children: []

        };


        if (override === null) {

            setCorpuses(prev => [
                ...prev,
                corpus
            ]);

            setSelectedName("");
            setSelectedHeigth("");
            setSelectedWidth("");
            setSelectedDepth("");
            setSelectedQuantity("1");
            setSelectedPreset("def");

            setActiveCorpus(corpus);

        } else {

            const newentry = corpuses.map(item =>
                item.id === override
                    ? corpus
                    : item
            );

            setCorpuses(newentry);

            setActiveCorpus(null);
        }

        return;
    }


    /*
     * ------------------------------------------------------------
     * Bestehenden KO-Datensatz aktualisieren
     * ------------------------------------------------------------
     *
     * Wichtig:
     * Wenn groupOnly gesetzt ist, werden die Maße weiterhin
     * NICHT gespeichert.
     */
    if (normalizedType === "KO" && override !== null) {

        const existingCorpus = corpuses.find(
            item => item.id === override
        );

        /*
         * Existiert bereits eine reine Gruppe,
         * bleibt sie auch eine reine Gruppe.
         */
        if (existingCorpus?.groupOnly === true) {

            const updatedCorpus = {
                id: override,

                name: selectedName || existingCorpus.name,

                quantity:
                    selectedQuantity === "" ||
                    selectedQuantity === null ||
                    selectedQuantity === undefined
                        ? existingCorpus.quantity ?? 1
                        : Number(selectedQuantity),

                type: "KO",

                groupOnly: true,

                Children: children
            };

            setCorpuses(prev =>
                prev.map(item =>
                    item.id === override
                        ? updatedCorpus
                        : item
                )
            );

            setActiveCorpus(null);

            return;
        }


        /*
         * Bestehender klassischer Korpus
         *
         * Dieser Pfad bleibt vorerst erhalten.
         */
        const corpus = {

            id: override,

            name: selectedName,

            quantity:
                selectedQuantity === ""
                    ? 1
                    : selectedQuantity,

            width: selectedWidth,
            height: selectedHeigth,
            depth: selectedDepth,

            preset: selectedPreset,

            MID: KorpusMaterialId,

            type: "KO",

            Children: children
        };

        setCorpuses(prev =>
            prev.map(item =>
                item.id === override
                    ? corpus
                    : item
            )
        );

        setActiveCorpus(null);

        return;
    }
}

    function updateInput(preset) {

        const material = materials.find(
    material => material.id === KorpusMaterialId
);

        switch (preset) {

        case "Boden":
            // Bodenmaße
            setSelectedHeigth(activeCorpus.width-material.thickness*2);
            setSelectedWidth(activeCorpus.depth);
            setSelectedDepth(material.thickness);
            setSelectedQuantity("2");
            break;

        case "Seite":
            // Seitenmaße
            setSelectedHeigth(activeCorpus.height);
            setSelectedWidth(activeCorpus.depth);
            setSelectedDepth(material.thickness);
            setSelectedQuantity("2");
            break;

        case "Front":
            // Frontmaße Fuge hardcoded!
            setSelectedHeigth(activeCorpus.height - 3);
            setSelectedWidth(activeCorpus.width - 3);
            setSelectedDepth(material.thickness);
            setSelectedQuantity("1");
            break;

        case "Back":
            // Rückwand
            setSelectedHeigth(activeCorpus.height);
            setSelectedWidth(activeCorpus.width);
            setSelectedDepth(8);
            setSelectedQuantity("1");
            break;

        case "BackNut":
            // Nut
            setSelectedHeigth(activeCorpus.height - 21);
            setSelectedWidth(activeCorpus.width - 21);
            setSelectedDepth(8);
            setSelectedQuantity("1");
            break;

        default:
            
            break;

    }
    }

    function addChildPlate(override) {

        if (!activeCorpus) return;

        const plate = {

            id: override == null ? Date.now() + Math.random() : override,

            name: selectedName,

            quantity: selectedQuantity,

            width: selectedWidth,
            height: selectedHeigth,
            depth: selectedDepth,

            preset: selectedPreset,

            //EdgeMat

            ETID: selectedEdges.top ? activePlate.MID : "",

            EBID: selectedEdges.bottom ? activePlate.MID : "",

            ELID: selectedEdges.left ? activePlate.MID : "",

            ERID: selectedEdges.right ? activePlate.MID : "",

            MID: override == null ? KorpusMaterialId : activePlate.MID,

        };

        const updatedCorpus = {

            ...activeCorpus,

            Children: [

                ...activeCorpus.Children,

                plate

            ]

        };

        if(override == null) {
            setCorpuses(prev =>

            prev.map(c =>

                c.id === updatedCorpus.id

                    ? updatedCorpus

                    : c

            )

        );

        setActiveCorpus(updatedCorpus);

        } else {

           const updateCorpus = {
    ...activeCorpus,
    Children: activeCorpus.Children.map(child =>
        child.id === override
            ? plate
            : child
    )
};

setActiveCorpus(updateCorpus);

setCorpuses(prev =>
    prev.map(corpus =>
        corpus.id === updateCorpus.id
            ? updateCorpus
            : corpus
    )
);
    setActivePlate(null);


        }

        

    }

    function updateChildMaterial(childId, materialId) {

    const updatedCorpus = {

        ...activeCorpus,

        Children: activeCorpus.Children.map(child =>

            child.id === childId

                ? {
                    ...child,
                    MID: materialId,
                    //EdgeMat
                }

                : child

        )

    };

    setActiveCorpus(updatedCorpus);

    setCorpuses(prev =>
        prev.map(corpus =>
            corpus.id === updatedCorpus.id
                ? updatedCorpus
                : corpus
        )
    );
    }

    function updateChildren (children, materials) {
        return children.map(child => {
            const childMaterial = materials.find(
                material => material.id === child.MID
            );

        switch (child.preset) {

            case "Boden":

                return {
                    ...child,
                    height: selectedWidth-childMaterial.thickness*2,
                    width: selectedDepth,
                    depth: childMaterial.thickness
                };

            case "Seite":

                return {
                    ...child,
                    height: selectedHeigth,
                    width: selectedDepth,
                    depth: childMaterial.thickness
                };

            case "Back":

                return {
                    ...child,
                    height: selectedHeigth,
                    width: selectedWidth,
                    depth: 8
                };


            default:

                return child;

        }

    });
    }

return {
    corpuses,
    setCorpuses,
    // Auswahl
    activeCorpus,
    setActiveCorpus,

    activePlate,
    setActivePlate,

    // Korpusdaten
    selectedQuantity,
    setSelectedQuantity,

    selectedWidth,
    setSelectedWidth,

    selectedHeigth,
    setSelectedHeigth,

    selectedDepth,
    setSelectedDepth,

    selectedName,
    setSelectedName,

    selectedPreset,
    setSelectedPreset,

    // Material
    KorpusMaterialId,
    setKorpusMaterialId,

    EdgeMaterialId,
    setEdgeMaterialId,

    // Bearbeitungsstatus
    KorpusEdit,
    setkorpusEdit,

    // Materialdatenbank
    materials,
    setMaterials,

    // Status
    loading,
    setLoading,

    error,
    setError,

    selectedEdges,
    setSelectedEdges,

    createCorpus,
    updateInput,
    addChildPlate,
    updateChildMaterial,
    updateChildren,
    deleteCorpus

};
}