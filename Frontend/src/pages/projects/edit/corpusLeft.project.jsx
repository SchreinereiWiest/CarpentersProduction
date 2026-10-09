import { useState, useEffect } from "react";
import { setCurrentStack } from "three/src/nodes/tsl/TSLCore.js";
import axios from "axios";
import { useNavigate } from "react-router";
import { useParams } from "react-router";
import { corpusPresets, platePresets } from "./helper";

export default function CorpusLeft({ EditorState }) {
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

    EdgeMaterialId,
    setEdgeMaterialId,

    KorpusEdit,
    setkorpusEdit,

    materials,
    setMaterials,

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
    updateChildren
  } = EditorState;

  /*
   * ------------------------------------------------------------
   * Erkennung einer reinen Gruppe
   * ------------------------------------------------------------
   *
   * groupOnly = neue Gruppe ohne Außenmaße
   *
   * Zusätzlich erkennen wir ältere Datensätze, bei denen noch
   * keine Maße vorhanden sind.
   */
  const isGroupOnly = (corpus) => {
    if (!corpus || corpus.type !== "KO") {
      return false;
    }

    if (corpus.groupOnly === true) {
      return true;
    }

    const hasHeight =
      corpus.height !== undefined &&
      corpus.height !== null &&
      corpus.height !== "";

    const hasWidth =
      corpus.width !== undefined &&
      corpus.width !== null &&
      corpus.width !== "";

    const hasDepth =
      corpus.depth !== undefined &&
      corpus.depth !== null &&
      corpus.depth !== "";

    return !hasHeight && !hasWidth && !hasDepth;
  };

  return (
    <>
      <div
        className="rounded-xl bg-gray-800 flex flex-col overflow-hidden"
        onClick={() => setActiveCorpus(null)}
      >

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="flex items-center justify-between xl:p-5 p-2 border-b border-gray-700">

          <h2 className="xl:text-xl text-xl ml-2 font-semibold">
            Korpusse
          </h2>

          <button
            className="rounded-lg bg-blue-600 xl:px-4 px-3 xl:py-3 py-2 hover:bg-blue-500"
            onClick={(e) => {
              e.stopPropagation();

              /*
               * createCorpus() erstellt eine neue maßlose Gruppe.
               * Das Kennzeichen dafür setzen wir im Provider.
               */
              createCorpus();
            }}
          >
            +
          </button>

        </div>

        {/* =====================================================
            LISTE
            ===================================================== */}

        <div className="flex-1 overflow-y-auto xl:p-3 p-2 xl:space-y-2 space-y-1">

          {corpuses.map((corpus) => {

            const groupOnly = isGroupOnly(corpus);

            return (
              <button
                key={corpus.id}
                onClick={(e) => {
                  e.stopPropagation();

                  /*
                   * ------------------------------------------------
                   * Gruppe / Korpus
                   * ------------------------------------------------
                   */
                  if (corpus.type === "KO") {

                    /*
                     * Bei einer reinen Gruppe gibt es keine
                     * Außenmaße.
                     */
                    if (groupOnly) {
                      setSelectedName("");
                      setSelectedHeigth("");
                      setSelectedWidth("");
                      setSelectedDepth("");
                      setSelectedQuantity(corpus.quantity ?? "1");
                      setSelectedPreset("def");
                      setKorpusMaterialId(corpus.MID ?? "");
                    } else {
                      /*
                       * Bestehende Korpusse mit Maßen
                       */
                      setSelectedName("");
                      setSelectedHeigth("");
                      setSelectedWidth("");
                      setSelectedDepth("");
                      setSelectedQuantity(corpus.quantity ?? "1");
                      setSelectedPreset(corpus.preset ?? "def");
                      setKorpusMaterialId(corpus.MID ?? "");
                    }

                    setActiveCorpus(corpus);
                    setActivePlate(null);

                    return;
                  }

                  /*
                   * ------------------------------------------------
                   * Einzelplatte
                   * ------------------------------------------------
                   */

                  setSelectedName(corpus.name ?? "");
                  setSelectedHeigth(corpus.height ?? "");
                  setSelectedWidth(corpus.width ?? "");
                  setSelectedDepth(corpus.depth ?? "");
                  setSelectedPreset(corpus.preset ?? "def");
                  setSelectedQuantity(corpus.quantity ?? "1");
                  setKorpusMaterialId(corpus.MID ?? "");

                  setActiveCorpus(corpus);
                  setActivePlate(null);
                }}

                className={`
                  w-full rounded-lg xl:px-4 px-2 xl:py-3 py-2
                  text-left transition
                  ${
                    activeCorpus?.id === corpus.id
                      ? "bg-blue-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }
                `}
              >

                {/* =================================================
                    Name + Anzahl
                    ================================================= */}

                <div className="flex justify-between items-center gap-2">

                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      title={corpus.manual ? "Manuell hinzugefügt oder geändert" : undefined}
                      className={`min-w-0 truncate font-medium xl:text-lm text-md ${
                        corpus.manual ? "text-amber-300" : ""
                      }`}
                    >
                      {corpus.name}
                    </span>
                    {corpus.manual && (
                      <span className="shrink-0 rounded bg-amber-900/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                        manuell
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    x {corpus.quantity}
                  </div>

                </div>

                {/* =================================================
                    Außenmaße
                    =================================================
                    Bei einer reinen Gruppe werden diese NICHT
                    angezeigt.
                    ================================================= */}

                {!groupOnly && (
                  <div className="text-sm text-gray-300 mt-1">
                    {corpus.height} | {corpus.width} | {corpus.depth}
                  </div>
                )}

                {/* =================================================
                    Plattenanzahl
                    ================================================= */}

                {corpus.type === "KO" && (
                  <div className="text-sm text-gray-300 mt-1">
                    {corpus.Children?.length ?? 0} Platten
                  </div>
                )}

              </button>
            );
          })}

        </div>

        {/* =====================================================
            PLATTE HINZUFÜGEN
            ===================================================== */}
{/* 
        <div className="border-t border-gray-700 xl:p-5 p-2">

          <button
            className="w-full rounded-lg bg-green-600 py-3 font-semibold hover:bg-green-500"
            onClick={(e) => {
              e.stopPropagation();


              createCorpus(null, "Plate");
            }}
          >
            + Platte hinzufügen
          </button>

        </div> */}

      </div>
    </>
  );
}
