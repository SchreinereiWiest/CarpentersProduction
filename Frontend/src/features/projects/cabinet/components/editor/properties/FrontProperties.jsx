import { useState } from "react";


function SignedNumberInput({
    value,
    onChange
}) {
    const numericValue = value ?? 0;
    const [inputState, setInputState] =
        useState({
            draft: String(numericValue),
            sourceValue: numericValue
        });

    const draft =
        inputState.sourceValue === numericValue
            ? inputState.draft
            : String(numericValue);

    const commitValue = nextDraft => {
        const normalized =
            nextDraft.replace(",", ".");

        if (
            normalized === "" ||
            normalized === "-" ||
            normalized === "." ||
            normalized === "-."
        ) {
            return;
        }

        const nextValue = Number(normalized);

        if (Number.isFinite(nextValue)) {
            onChange(nextValue);
            return nextValue;
        }

        return numericValue;
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={event => {
                const nextDraft = event.target.value;

                if (!/^-?\d*(?:[.,]\d*)?$/.test(nextDraft)) {
                    return;
                }

                setInputState({
                    draft: nextDraft,
                    sourceValue: commitValue(nextDraft) ?? numericValue
                });
            }}
            onBlur={() => {
                const normalized = draft.replace(",", ".");
                const nextValue = Number(normalized);

                if (
                    draft !== "" &&
                    Number.isFinite(nextValue)
                ) {
                    setInputState({
                        draft: String(nextValue),
                        sourceValue: nextValue
                    });
                    onChange(nextValue);
                    return;
                }

                setInputState({
                    draft: String(numericValue),
                    sourceValue: numericValue
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
            "
        />
    );
}


export default function FrontProperties({

    selectedElement,

    activeCabinet,
    updateActiveCabinet,

    frontSplitSpec,
    setFrontSplitSpec,

    frontSplitDirection,
    setFrontSplitDirection,

    splitFront,
    mergeFrontChildren,
    findFrontParent,

    generateFronts,

    setSelectedElement

}) {

    if (!activeCabinet) {
        return null;
    }


    const isSelectedFront =
        selectedElement?.type === "front";


    const canMerge =
        isSelectedFront &&
        (
            selectedElement.children?.length > 0 ||
            findFrontParent(
                activeCabinet.fronts ?? [],
                selectedElement.id
            ) !== null
        );


    return (

        <section className="mt-6">

            <div className="
                text-xs
                uppercase
                tracking-wide
                text-gray-500
            ">
                {isSelectedFront
                    ? "Front unterteilen"
                    : "Frontaufteilung"
                }
            </div>


            <div className="
                mt-4
                space-y-4
            ">

                {/* =================================================
                    Aufteilung
                ================================================= */}

                <label className="block">

                    <span className="
                        text-xs
                        text-gray-400
                    ">
                        Aufteilung
                    </span>


                    <input
                        type="text"
                        value={
                            frontSplitSpec
                        }
                        onChange={(event) =>
                            setFrontSplitSpec(
                                event.target.value
                            )
                        }
                        placeholder="1:1:145mm"
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


                {/* =================================================
                    Richtung
                ================================================= */}

                <div>

                    <div className="
                        text-xs
                        text-gray-400
                    ">
                        Richtung
                    </div>


                    <div className="
                        mt-1
                        grid
                        grid-cols-2
                        gap-2
                    ">

                        <button
                            type="button"
                            onClick={() =>
                                setFrontSplitDirection(
                                    "vertical"
                                )
                            }
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm

                                ${
                                    frontSplitDirection ===
                                    "vertical"

                                        ? `
                                            border-blue-600
                                            bg-blue-900
                                            text-blue-200
                                        `

                                        : `
                                            border-gray-700
                                            bg-gray-800
                                            text-gray-400
                                        `
                                }
                            `}
                        >
                            Vertikal
                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                setFrontSplitDirection(
                                    "horizontal"
                                )
                            }
                            className={`
                                rounded
                                border
                                px-3
                                py-2
                                text-sm

                                ${
                                    frontSplitDirection ===
                                    "horizontal"

                                        ? `
                                            border-blue-600
                                            bg-blue-900
                                            text-blue-200
                                        `

                                        : `
                                            border-gray-700
                                            bg-gray-800
                                            text-gray-400
                                        `
                                }
                            `}
                        >
                            Horizontal
                        </button>

                    </div>

                </div>


                {/* =================================================
                    Fuge
                ================================================= */}

                

                <label className="block">
    <span className="text-xs text-gray-400">
        Fuge zwischen Fronten
    </span>

    <input
        type="number"
        min="0"
        step="0.5"
        value={
            activeCabinet.frontGap ?? 3
        }
        onChange={(event) =>
            updateActiveCabinet({
                frontGap:
                    Math.max(
                        0,
                        Number(
                            event.target.value
                        ) || 0
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
        "
    />
</label>


{/* ================================================= */}
{/* ÄUSSERE FUGEN */}
{/* ================================================= */}

<div>

    <div className="
        text-xs
        text-gray-400
        mb-2
    ">
        Äußere Fugen (negativ = Überstand)
    </div>

    <div className="
        grid
        grid-cols-2
        gap-2
    ">

        {/* Links */}

        <label className="block">

            <span className="
                text-xs
                text-gray-500
            ">
                Links
            </span>

            <SignedNumberInput
                value={activeCabinet.frontGapLeft ?? 0}
                onChange={value =>
                    updateActiveCabinet({
                        frontGapLeft: value
                    })
                }
            />

        </label>


        {/* Rechts */}

        <label className="block">

            <span className="
                text-xs
                text-gray-500
            ">
                Rechts
            </span>

            <SignedNumberInput
                value={activeCabinet.frontGapRight ?? 0}
                onChange={value =>
                    updateActiveCabinet({
                        frontGapRight: value
                    })
                }
            />

        </label>


        {/* Oben */}

        <label className="block">

            <span className="
                text-xs
                text-gray-500
            ">
                Oben
            </span>

            <SignedNumberInput
                value={activeCabinet.frontGapTop ?? 0}
                onChange={value =>
                    updateActiveCabinet({
                        frontGapTop: value
                    })
                }
            />

        </label>


        {/* Unten */}

        <label className="block">

            <span className="
                text-xs
                text-gray-500
            ">
                Unten
            </span>

            <SignedNumberInput
                value={activeCabinet.frontGapBottom ?? 0}
                onChange={value =>
                    updateActiveCabinet({
                        frontGapBottom: value
                    })
                }
            />

        </label>

    </div>

</div>


                {/* =================================================
                    Aktion
                ================================================= */}

                {isSelectedFront ? (

                    <>

                        <button
                            type="button"
                            onClick={() =>
                                splitFront(
                                    selectedElement.id,
                                    frontSplitSpec,
                                    frontSplitDirection,
                                    activeCabinet,
                                    updateActiveCabinet,
                                    setSelectedElement
                                )
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
                            Front unterteilen
                        </button>


                        <button
                            type="button"
                            disabled={!canMerge}
                            onClick={() =>
                                mergeFrontChildren(
                                    selectedElement.id,
                                    activeCabinet,
                                    updateActiveCabinet,
                                    setSelectedElement
                                )
                            }
                            className="
                                w-full
                                rounded
                                border
                                border-red-800
                                px-3
                                py-2
                                text-sm
                                text-red-400
                                hover:bg-red-950
                                disabled:cursor-not-allowed
                                disabled:opacity-30
                            "
                        >
                            Unterteilungen aufheben
                        </button>

                    </>

                ) : (

                    <button
                        type="button"
                        onClick={() =>
                            generateFronts(
                                frontSplitSpec,
                                frontSplitDirection,
                                activeCabinet,
                                updateActiveCabinet,
                                setSelectedElement
                            )
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
                        Fronten erzeugen
                    </button>

                )}

            </div>

        </section>
    );
}
