import { useEffect, useState } from "react";
import { platePresets } from "./helper";

export default function CorpusMiddle({ EditorState }) {
  const {
    corpuses,
    setCorpuses,
    activeCorpus,
    setActiveCorpus,

    activePlate,
    setActivePlate,

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

    KorpusMaterialId,
    setKorpusMaterialId,

    materials,

    selectedEdges,
    setSelectedEdges,

    updateInput,
  } = EditorState;

  /*
   * ------------------------------------------------------------
   * Kantenmaterialien
   * ------------------------------------------------------------
   *
   * primary   = erstes / Standard-Kantenmaterial
   * secondary = zweites / alternatives Kantenmaterial
   *
   * selectedEdges:
   *  "" / 0       = Kante aus
   *  "primary"   = Standardmaterial
   *  "secondary" = zweites Material
   */

  const [edgeMaterials, setEdgeMaterials] = useState({
    primary: "",
    secondary: "",
  });

  /*
   * ------------------------------------------------------------
   * Hilfsfunktionen
   * ------------------------------------------------------------
   */

  const getMaterial = (materialId) => {
    if (materialId === null || materialId === undefined || materialId === "") {
      return null;
    }

    return materials.find(
      (material) => String(material.id) === String(materialId)
    );
  };

  const getMaterialLabel = (materialId) => {
    const material = getMaterial(materialId);

    if (!material) {
      return "Material auswählen...";
    }

    return `${material.materialNumber} (${material.thickness} mm)`;
  };

  /*
   * Liest die beiden Kantenmaterialien eines Blechs.
   *
   * Neue Daten:
   *   EdgeMaterialId
   *   EdgeMaterialId2
   *
   * Alte Daten:
   *   Standardmäßig wird MID verwendet.
   */const getEdgeMaterialsFromPlate = (plate) => {

    if (!plate) {

        return {
            primary: "",
            secondary: ""
        };

    }


    /*
     * =====================================================
     * Materialien direkt aus den tatsächlichen Kanten
     *
     * Hauptkante = untere / vordere Kante
     *               => EBID
     *
     * Abweichende obere Kante
     *               => ETID
     * =====================================================
     */

    const frontMaterial =
        plate.EBID ??
        "";

    const topMaterial =
        plate.ETID ??
        "";


    /*
     * Gibt es keine untere Kante, verwenden wir
     * ersatzweise die obere als Hauptkante.
     */

    const primary =
        frontMaterial !== ""
            ? frontMaterial
            : topMaterial;


    let secondary = "";


    /*
     * Obere Kante unterscheidet sich von der
     * Hauptkante -> zweite Materialgruppe
     */

    if (
        topMaterial !== "" &&
        String(topMaterial) !== String(primary)
    ) {

        secondary =
            topMaterial;

    }


    /*
     * Falls die obere Kante identisch mit der
     * Hauptkante ist, aber eine Seitenkante ein
     * anderes Material verwendet, wird dieses
     * Material als sekundäres Material übernommen.
     */

    if (
        secondary === ""
    ) {

        const sideMaterials = [
            plate.ELID,
            plate.ERID
        ]
            .filter(
                value =>
                    value !== null &&
                    value !== undefined &&
                    value !== ""
            )
            .filter(
                (value, index, array) =>
                    array.findIndex(
                        candidate =>
                            String(candidate) ===
                            String(value)
                    ) === index
            );


        const differentSideMaterial =
            sideMaterials.find(
                material =>
                    String(material) !==
                    String(primary)
            );


        if (
            differentSideMaterial
        ) {

            secondary =
                differentSideMaterial;

        }

    }


    return {

        primary:
            primary ?? "",

        secondary:
            secondary ?? ""

    };

};


const getEdgeStatesFromPlate = (
    plate,
    edgeMaterialValues
) => {

    if (!plate) {

        return {
            top: "",
            right: "",
            bottom: "",
            left: ""
        };

    }


    const primary =
        String(
            edgeMaterialValues.primary ??
            ""
        );


    const secondary =
        String(
            edgeMaterialValues.secondary ??
            ""
        );


    const getState = (
        materialId
    ) => {

        if (
            materialId === null ||
            materialId === undefined ||
            materialId === ""
        ) {

            return "";

        }


        const material =
            String(
                materialId
            );


        /*
         * Sekundäres Material
         */

        if (
            secondary !== "" &&
            material === secondary &&
            material !== primary
        ) {

            return "secondary";

        }


        /*
         * Hauptkante
         */

        if (
            primary !== "" &&
            material === primary
        ) {

            return "primary";

        }


        return "";

    };


    return {

        top:
            getState(
                plate.ETID
            ),

        right:
            getState(
                plate.ERID
            ),

        bottom:
            getState(
                plate.EBID
            ),

        left:
            getState(
                plate.ELID
            )

    };

};


useEffect(() => {

    const plate =
        activePlate ??
        (
            activeCorpus?.type === "plate"
                ? activeCorpus
                : null
        );


    if (!plate) {

        setEdgeMaterials({
            primary: "",
            secondary: ""
        });

        setSelectedEdges({
            top: "",
            right: "",
            bottom: "",
            left: ""
        });

        return;

    }


    const materialValues =
        getEdgeMaterialsFromPlate(
            plate
        );


    setEdgeMaterials(
        materialValues
    );


    setSelectedEdges(
        getEdgeStatesFromPlate(
            plate,
            materialValues
        )
    );

}, [
    activePlate?.id ??
    activePlate?.PID,

    activeCorpus?.id ??
    activeCorpus?.PID,

    activeCorpus?.type
]);
  /*
   * ------------------------------------------------------------
   * Gemeinsames Update eines Blechs
   * ------------------------------------------------------------
   *
   * Wichtig:
   * Hier wird nicht nur activeCorpus/corpuses geändert,
   * sondern auch activePlate.
   *
   * Damit beseitigen wir den Fehler, dass beim Speichern eines
   * gerade geänderten Materials wieder activePlate.MID mit
   * dem alten Wert verwendet wird.
   */

  const updatePlate = (plateId, changes) => {
    if (!activeCorpus || activeCorpus.type !== "KO") {
      return;
    }

    const updatedChildren = (activeCorpus.Children ?? []).map((child) => {
      if (child.id !== plateId) {
        return child;
      }

      return {
        ...child,
        ...changes,
      };
    });

    const updatedCorpus = {
      ...activeCorpus,
      Children: updatedChildren,
    };

    const updatedPlate =
      updatedChildren.find((child) => child.id === plateId) ?? null;

    setActiveCorpus(updatedCorpus);

    setCorpuses((prev) =>
      prev.map((corpus) =>
        corpus.id === updatedCorpus.id
          ? updatedCorpus
          : corpus
      )
    );

    if (updatedPlate) {
      setActivePlate(updatedPlate);
    }
  };

  /*
   * ------------------------------------------------------------
   * Material eines Blechs ändern
   * ------------------------------------------------------------
   */

  const handlePlateMaterialChange = (plate, materialId) => {
    const oldMaterialId = plate.MID;

    let primary = edgeMaterials.primary;

    /*
     * Wenn bisher das Standard-Kantenmaterial identisch mit dem
     * Plattenmaterial war, ziehen wir die Änderung mit.
     *
     * Dadurch bleibt das bisherige Verhalten erhalten:
     * Platte 19 mm Dekor -> Standardkante ebenfalls dieses Material.
     */
    if (
      primary === "" ||
      String(primary) === String(oldMaterialId)
    ) {
      primary = materialId;
    }

    const changes = {
      MID: materialId,
      EdgeMaterialId: primary,
      EdgeMaterialId2:
        edgeMaterials.secondary === "" ||
        String(edgeMaterials.secondary) === String(oldMaterialId)
          ? materialId
          : edgeMaterials.secondary,
    };

    updatePlate(plate.id, changes);

    setKorpusMaterialId(materialId);

    setEdgeMaterials({
      primary: changes.EdgeMaterialId,
      secondary: changes.EdgeMaterialId2,
    });
  };

  /*
   * ------------------------------------------------------------
   * Kantenmaterial ändern
   * ------------------------------------------------------------
   *
   * Änderungen werden direkt auf dem aktiven Blech gespeichert.
   *
   * Orange Kanten -> primary
   * Grüne Kanten -> secondary
   */

  const handleEdgeMaterialChange = (type, materialId) => {
    const plate =
      activePlate ??
      (activeCorpus?.type === "plate" ? activeCorpus : null);

    if (!plate) {
      return;
    }

    const nextMaterials = {
      ...edgeMaterials,
      [type]: materialId,
    };

    setEdgeMaterials(nextMaterials);

    /*
     * Alle momentan entsprechend markierten Kanten bekommen
     * sofort das neue Material.
     */
    if (activeCorpus?.type === "KO") {
      const edgeChanges = {};

      if (selectedEdges.top === type) {
        edgeChanges.ETID = materialId;
      }

      if (selectedEdges.right === type) {
        edgeChanges.ERID = materialId;
      }

      if (selectedEdges.bottom === type) {
        edgeChanges.EBID = materialId;
      }

      if (selectedEdges.left === type) {
        edgeChanges.ELID = materialId;
      }

      updatePlate(plate.id, {
        ...edgeChanges,
        EdgeMaterialId:
          type === "primary"
            ? materialId
            : nextMaterials.primary,
        EdgeMaterialId2:
          type === "secondary"
            ? materialId
            : nextMaterials.secondary,
      });
    } else if (activeCorpus?.type === "plate") {
      const edgeChanges = {};

      if (selectedEdges.top === type) {
        edgeChanges.ETID = materialId;
      }

      if (selectedEdges.right === type) {
        edgeChanges.ERID = materialId;
      }

      if (selectedEdges.bottom === type) {
        edgeChanges.EBID = materialId;
      }

      if (selectedEdges.left === type) {
        edgeChanges.ELID = materialId;
      }

      const updatedCorpus = {
        ...activeCorpus,
        ...edgeChanges,
        EdgeMaterialId:
          type === "primary"
            ? materialId
            : nextMaterials.primary,
        EdgeMaterialId2:
          type === "secondary"
            ? materialId
            : nextMaterials.secondary,
      };

      setActiveCorpus(updatedCorpus);

      setCorpuses((prev) =>
        prev.map((corpus) =>
          corpus.id === updatedCorpus.id
            ? updatedCorpus
            : corpus
        )
      );

      setActivePlate(updatedCorpus);
    }
  };

  /*
   * ------------------------------------------------------------
   * Kante durchschalten
   * ------------------------------------------------------------
   *
   * 1. Klick  -> orange  -> Standardmaterial
   * 2. Klick  -> grün    -> alternatives Material
   * 3. Klick  -> aus
   */

  const toggleEdge = (edge) => {
    const plate =
      activePlate ??
      (activeCorpus?.type === "plate" ? activeCorpus : null);

    if (!plate) {
      return;
    }

    const currentState = selectedEdges[edge] || "";

    let nextState = "";

    if (currentState === "") {
      nextState = "primary";
    } else if (currentState === "primary") {
      nextState = "secondary";
    } else {
      nextState = "";
    }

    const edgeFieldMap = {
      top: "ETID",
      right: "ERID",
      bottom: "EBID",
      left: "ELID",
    };

    const edgeField = edgeFieldMap[edge];

    let materialId = "";

    if (nextState === "primary") {
      materialId = edgeMaterials.primary;
    }

    if (nextState === "secondary") {
      materialId = edgeMaterials.secondary;
    }

    setSelectedEdges((prev) => ({
      ...prev,
      [edge]: nextState,
    }));

    /*
     * Direkt am aktuell geöffneten Blech speichern.
     */
    if (activeCorpus?.type === "KO") {
      updatePlate(plate.id, {
        [edgeField]: materialId,
        EdgeMaterialId: edgeMaterials.primary,
        EdgeMaterialId2: edgeMaterials.secondary,
      });
    }

    if (activeCorpus?.type === "plate") {
      const updatedCorpus = {
        ...activeCorpus,
        [edgeField]: materialId,
        EdgeMaterialId: edgeMaterials.primary,
        EdgeMaterialId2: edgeMaterials.secondary,
      };

      setActiveCorpus(updatedCorpus);
      setActivePlate(updatedCorpus);

      setCorpuses((prev) =>
        prev.map((corpus) =>
          corpus.id === updatedCorpus.id
            ? updatedCorpus
            : corpus
        )
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Platte auswählen / aufklappen
   * ------------------------------------------------------------
   */

  const openPlate = (child) => {
    if (activePlate?.id === child.id) {
      setActivePlate(null);

      setSelectedName("");
      setSelectedHeigth("");
      setSelectedWidth("");
      setSelectedDepth("");
      setSelectedQuantity("");
      setSelectedPreset("def");

      setSelectedEdges({
        top: "",
        right: "",
        bottom: "",
        left: "",
      });

      return;
    }

    setSelectedName(child.name ?? "");
    setSelectedHeigth(child.height ?? "");
    setSelectedWidth(child.width ?? "");
    setSelectedDepth(child.depth ?? "");
    setSelectedQuantity(child.quantity ?? "1");
    setSelectedPreset(child.preset ?? "def");

    setKorpusMaterialId(child.MID ?? "");

    const materialValues = getEdgeMaterialsFromPlate(child);

    setEdgeMaterials(materialValues);

    setSelectedEdges(
      getEdgeStatesFromPlate(child, materialValues)
    );

    setActivePlate(child);
  };

  /*
   * ------------------------------------------------------------
   * Platte löschen
   * ------------------------------------------------------------
   */

  const deletePlate = (plateId) => {
    if (!activeCorpus || activeCorpus.type !== "KO") {
      return;
    }

    const updatedCorpus = {
      ...activeCorpus,
      Children: (activeCorpus.Children ?? []).filter(
        (child) => child.id !== plateId
      ),
    };

    setCorpuses((prev) =>
      prev.map((corpus) =>
        corpus.id === updatedCorpus.id
          ? updatedCorpus
          : corpus
      )
    );

    setActiveCorpus(updatedCorpus);
    setActivePlate(null);

    setSelectedEdges({
      top: "",
      right: "",
      bottom: "",
      left: "",
    });
  };

  /*
   * ------------------------------------------------------------
   * Platte ändern
   * ------------------------------------------------------------
   *
   * Diese Werte werden bereits beim Bearbeiten in activePlate
   * synchron gehalten. Das ist wichtig für den bisherigen
   * addChildPlate(activePlate.id)-Workflow.
   */

  const handlePlateFieldChange = (field, value) => {
    setEditorField(field, value);

    if (!activePlate || activeCorpus?.type !== "KO") {
      return;
    }

    updatePlate(activePlate.id, {
      [field]: value,
    });
  };

  const setEditorField = (field, value) => {
    switch (field) {
      case "name":
        setSelectedName(value);
        break;

      case "quantity":
        setSelectedQuantity(value);
        break;

      case "height":
        setSelectedHeigth(value);
        break;

      case "width":
        setSelectedWidth(value);
        break;

      case "depth":
        setSelectedDepth(value);
        break;

      default:
        break;
    }
  };

  /*
   * ------------------------------------------------------------
   * Preset ändern
   * ------------------------------------------------------------
   */

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);

    /*
     * Beim Anlegen einer neuen Platte übernimmt updateInput
     * wie bisher die Maße aus dem Preset.
     */
    if (activeCorpus?.type === "KO") {
      updateInput(preset);
    }

    /*
     * Beim Bearbeiten einer bestehenden Platte das Preset
     * ebenfalls direkt auf die Platte übernehmen.
     */
    if (activePlate && activeCorpus?.type === "KO") {
      updatePlate(activePlate.id, {
        preset,
      });
    }
  };

  /*
   * ------------------------------------------------------------
   * Eingabe für neue Platte zurücksetzen
   * ------------------------------------------------------------
   */

  const resetPlateEditor = () => {
    setSelectedName("");
    setSelectedHeigth("");
    setSelectedWidth("");
    setSelectedDepth("");
    setSelectedQuantity("1");
    setSelectedPreset("def");
    setKorpusMaterialId("");

    setEdgeMaterials({
      primary: "",
      secondary: "",
    });

    setSelectedEdges({
      top: "",
      right: "",
      bottom: "",
      left: "",
    });

    setActivePlate(null);
  };

  /*
   * ------------------------------------------------------------
   * Kantenbutton
   * ------------------------------------------------------------
   */

  const getEdgeButtonClass = (state) => {
    if (state === "primary") {
      return "bg-orange-600 border-orange-400 text-white";
    }

    if (state === "secondary") {
      return "bg-green-600 border-green-400 text-white";
    }

    return "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700";
  };

  /*
   * ------------------------------------------------------------
   * Kanteneditor
   * ------------------------------------------------------------
   */

const EdgeEditor = () => (
  <div className="mt-2 rounded-lg border border-gray-700 bg-gray-900 p-4">

    <div className="text-sm font-semibold text-gray-300 mb-3">
      Kanten
    </div>

    <div className="grid grid-cols-[1fr_auto] gap-4 items-start">

      {/* ============================================
          LINKE SEITE – Kantenmaterialien
          ============================================ */}
      <div className="space-y-3">

        {/* Standard-Kantenmaterial */}
        <div>
          <label className="block mb-1 text-xs text-gray-400">
            Kantenmaterial Standard
          </label>

          <select
            value={edgeMaterials.primary ?? ""}
            onChange={(e) =>
              handleEdgeMaterialChange("primary", e.target.value)
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">
              Kantenmaterial auswählen...
            </option>

            {materials.map((material) => (
              <option
                key={material.id}
                value={material.id}
              >
                {material.materialNumber} ({material.thickness} mm)
              </option>
            ))}
          </select>
        </div>

        {/* Alternatives Kantenmaterial */}
        <div>
          <label className="block mb-1 text-xs text-gray-400">
            Kantenmaterial 2
          </label>

          <select
            value={edgeMaterials.secondary ?? ""}
            onChange={(e) =>
              handleEdgeMaterialChange("secondary", e.target.value)
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">
              Kantenmaterial auswählen...
            </option>

            {materials.map((material) => (
              <option
                key={material.id}
                value={material.id}
              >
                {material.materialNumber} ({material.thickness} mm)
              </option>
            ))}
          </select>
        </div>

        {/* Legende */}
        <div className="pt-1 text-xs text-gray-500 space-y-1">
          <div>
            <span className="text-orange-400">Orange</span>
            {" "} = Kantenmaterial Standard
          </div>

          <div>
            <span className="text-green-400">Grün</span>
            {" "} = Kantenmaterial 2
          </div>

          <div>
            Grau = keine Kante
          </div>
        </div>
      </div>

      {/* ============================================
          RECHTE SEITE – Kantenbuttons
          ============================================ */}
      <div className="flex justify-center items-center h-full">

        <div className="grid grid-cols-3 grid-rows-3 gap-2">

          {/* oben */}
          <div />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEdge("top");
            }}
            className={`h-10 w-10 rounded-lg border transition ${getEdgeButtonClass(
              selectedEdges.top
            )}`}
            title={`Oben – ${getMaterialLabel(
              selectedEdges.top === "secondary"
                ? edgeMaterials.secondary
                : edgeMaterials.primary
            )}`}
          >
            O
          </button>

          <div />

          {/* links */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEdge("left");
            }}
            className={`h-10 w-10 rounded-lg border transition ${getEdgeButtonClass(
              selectedEdges.left
            )}`}
            title={`Links – ${getMaterialLabel(
              selectedEdges.left === "secondary"
                ? edgeMaterials.secondary
                : edgeMaterials.primary
            )}`}
          >
            L
          </button>

          {/* mitte */}
          <div className="flex items-center justify-center text-sm text-gray-500">
            Platte
          </div>

          {/* rechts */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEdge("right");
            }}
            className={`h-10 w-10 rounded-lg border transition ${getEdgeButtonClass(
              selectedEdges.right
            )}`}
            title={`Rechts – ${getMaterialLabel(
              selectedEdges.right === "secondary"
                ? edgeMaterials.secondary
                : edgeMaterials.primary
            )}`}
          >
            R
          </button>

          {/* unten */}
          <div />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleEdge("bottom");
            }}
            className={`h-10 w-10 rounded-lg border transition ${getEdgeButtonClass(
              selectedEdges.bottom
            )}`}
            title={`Unten – ${getMaterialLabel(
              selectedEdges.bottom === "secondary"
                ? edgeMaterials.secondary
                : edgeMaterials.primary
            )}`}
          >
            U
          </button>

          <div />

        </div>
      </div>

    </div>
  </div>
);

  /*
   * ------------------------------------------------------------
   * Platte
   * ------------------------------------------------------------
   */

  const PlateCard = ({ child }) => {
    const isActive = activePlate?.id === child.id;

    return (
      <div
        className={`w-full rounded-lg transition ${
          isActive
            ? "bg-blue-600"
            : "bg-gray-700 hover:bg-gray-600"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* --------------------------------------------------
            Kompakte Zeile
            -------------------------------------------------- */}

        <div className="px-3 py-3">
          <div className="flex items-center gap-3">

            {/* Name / Aufklappen */}
            <button
              type="button"
              onClick={() => openPlate(child)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="font-semibold truncate">
                {child.name || "Platte"}
              </div>

              <div className="text-sm text-gray-400">
                {child.height} × {child.width} × {child.depth}
              </div>
            </button>

            {/* Material direkt sichtbar -
                öffnet NICHT das Plattenmenü */}
            <div className="w-48 shrink-0">
              <select
                value={child.MID ?? ""}
                onChange={(e) =>
                  handlePlateMaterialChange(
                    child,
                    e.target.value
                  )
                }
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">
                  Material auswählen...
                </option>

                {materials.map((material) => (
                  <option
                    key={material.id}
                    value={material.id}
                  >
                    {material.materialNumber} ({material.thickness} mm)
                  </option>
                ))}
              </select>
            </div>

            {/* Anzahl */}
            <div className="w-12 shrink-0 text-right">
              {child.quantity}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------
            Aufgeklappter Bereich
            -------------------------------------------------- */}

        {isActive && (
          <div className="border-t border-blue-400/30 px-3 pb-4">

            <EdgeEditor />

            {/* Löschen */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deletePlate(child.id);
              }}
              className="mt-4 w-full rounded-lg bg-red-600 py-2.5 font-semibold hover:bg-red-500"
            >
              Platte löschen
            </button>
          </div>
        )}
      </div>
    );
  };

  /*
   * ------------------------------------------------------------
   * Header
   * ------------------------------------------------------------
   *
   * Kein Korpus-Edit mehr.
   *
   * Ohne aktiven Korpus:
   *   -> Name + Anzahl für neue Gruppe
   *
   * Mit Korpus:
   *   -> Name + Anzahl für neue/bearbeitete Platte
   *   -> zusätzlich Preset + Maße
   */

  return (
    <div className="rounded-xl bg-gray-800 flex flex-col overflow-hidden min-h-0">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="shrink-0 border-b border-gray-700 p-4 xl:p-5">

        <div className="flex flex-col gap-3 sm:flex-row">

          {/* Name */}
          <input
            className="min-w-0 flex-1 rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
            type="text"
            value={selectedName}
            onChange={(e) =>
              setSelectedName(e.target.value)
            }
            placeholder={
              activeCorpus
                ? "Plattenname"
                : "Gruppenname"
            }
          />

          {/* Anzahl */}
          <input
            className="w-full sm:w-28 rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
            type="number"
            min="1"
            value={selectedQuantity}
            onChange={(e) =>
              setSelectedQuantity(e.target.value)
            }
            placeholder="Anzahl"
          />
        </div>

        {/* =================================================
            Nur wenn ein Korpus aktiv ist:
            Platten-Preset + Maße

            Für neue Gruppen gibt es KEIN Preset und
            KEINE Maße mehr.
            ================================================= */}

        {activeCorpus?.type === "KO" && (
          <>
            <div className="mt-4">

              <label className="block mb-1 text-xs text-gray-400">
                Platten-Preset
              </label>

              <select
                value={selectedPreset}
                onChange={(e) =>
                  handlePresetChange(e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                {platePresets.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                  >
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Höhe */}
              <input
                placeholder="Höhe"
                className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                type="text"
                value={selectedHeigth}
                onChange={(e) =>
                  handlePlateFieldChange(
                    "height",
                    e.target.value
                  )
                }
              />

              {/* Breite */}
              <input
                placeholder="Breite"
                className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                type="text"
                value={selectedWidth}
                onChange={(e) =>
                  handlePlateFieldChange(
                    "width",
                    e.target.value
                  )
                }
              />

              {/* Tiefe */}
              <input
                placeholder="Tiefe"
                className="rounded-lg bg-gray-900 border border-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                type="text"
                value={selectedDepth}
                onChange={(e) =>
                  handlePlateFieldChange(
                    "depth",
                    e.target.value
                  )
                }
              />
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          PLATTENLISTE
          ===================================================== */}

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden xl:p-5 p-2 xl:space-y-3 space-y-2"
        onClick={() => {
          setActivePlate(null);

          setSelectedEdges({
            top: "",
            right: "",
            bottom: "",
            left: "",
          });
        }}
      >

        {/* =================================================
            NORMALER KORPUS
            ================================================= */}

        {activeCorpus?.type === "KO" && (
          <>
            {(activeCorpus.Children ?? []).length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                Noch keine Platten in dieser Gruppe.
              </div>
            ) : (
              activeCorpus.Children.map((child) => (
                <PlateCard
                  key={child.id}
                  child={child}
                />
              ))
            )}
          </>
        )}

        {/* =================================================
            Einzelplatte als eigenes Corpus
            ================================================= */}

        {activeCorpus?.type === "plate" && (
  <div
    className="w-full rounded-lg bg-gray-700 p-3"
    onClick={(e) => e.stopPropagation()}
  >
    <div className="flex flex-col gap-3">

      {/* Name */}
      <div className="font-semibold">
        {activeCorpus.name || "Platte"}
      </div>

        {/* Kanteneditor */}
        <div className="xl:min-w-[260px]">
          <EdgeEditor />
        </div>


    </div>
  </div>
)}

        {/* =================================================
            Kein Corpus ausgewählt
            ================================================= */}

        {!activeCorpus && (
          <div className="flex h-full items-center justify-center text-gray-500">
            Korpusgruppe auswählen oder neue Gruppe anlegen.
          </div>
        )}
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      {activeCorpus?.type === "KO" && (
        <div className="shrink-0 border-t border-gray-700 p-5">
          <button
            type="button"
            className="w-full rounded-lg bg-green-600 py-3 font-semibold hover:bg-green-500"
            onClick={(e) => {
              e.stopPropagation();

              /*
               * Neue Platte hinzufügen.
               * Die bestehende Provider-Funktion übernimmt
               * weiterhin die eigentliche Erstellung.
               */
              EditorState.addChildPlate();

              /*
               * Auswahl zurücksetzen.
               */
              setSelectedEdges({
                top: "",
                right: "",
                bottom: "",
                left: "",
              });

              setEdgeMaterials({
                primary: KorpusMaterialId ?? "",
                secondary: KorpusMaterialId ?? "",
              });
            }}
          >
            + Platte hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}