import { corpusPresets, platePresets } from "../helper";

export default function CorpusHeader({ EditorState }) {

    return (

        <div
            className={
                EditorState.KorpusEdit
                    ? "p-6 border-b border-orange-700"
                    : "p-6 border-b border-gray-700"
            }
        >

            <div className="flex justify-between">

                <input
                    className={
                        EditorState.KorpusEdit
                            ? "rounded-lg bg-gray-900 border border-orange-700 p-3"
                            : "rounded-lg bg-gray-900 p-3"
                    }
                    type="text"
                    placeholder={
                        EditorState.activeCorpus == null || EditorState.KorpusEdit
                            ? "Korpusname"
                            : "Plattenname"
                    }
                    value={EditorState.selectedName}
                    onChange={(e) =>
                        EditorState.setSelectedName(e.target.value)
                    }
                />

                <div className="flex">

                    <input
                        className={
                            EditorState.KorpusEdit
                                ? "rounded-lg bg-gray-900 border border-orange-700 p-3 mr-3"
                                : "rounded-lg bg-gray-900 p-3 mr-3"
                        }
                        type="number"
                        placeholder="Anzahl"
                        value={EditorState.selectedQuantity}
                        onChange={(e) =>
                            EditorState.setSelectedQuantity(e.target.value)
                        }
                    />

                    {
                        EditorState.activeCorpus == null ||
                        EditorState.KorpusEdit ?

                            <select

                                value={EditorState.selectedPreset}

                                onChange={(e) =>
                                    EditorState.setSelectedPreset(e.target.value)
                                }

                                className={
                                    EditorState.KorpusEdit
                                        ?
                                        "rounded-lg border border-orange-700 bg-gray-900 px-3 py-3 text-white"
                                        :
                                        "rounded-lg border border-gray-700 bg-gray-900 px-3 py-3 text-white"
                                }

                            >

                                {
                                    corpusPresets.map(preset => (

                                        <option
                                            key={preset.id}
                                            value={preset.id}
                                        >
                                            {preset.name}
                                        </option>

                                    ))
                                }

                            </select>

                            :

                            <select

                                value={EditorState.selectedPreset}

                                onChange={(e) => {

                                    EditorState.setSelectedPreset(e.target.value);
                                    EditorState.updateInput(e.target.value);

                                }}

                                className="
                                    rounded-lg
                                    border
                                    border-gray-700
                                    bg-gray-900
                                    px-3
                                    py-3
                                    text-white
                                "

                            >

                                {
                                    platePresets.map(preset => (

                                        <option
                                            key={preset.id}
                                            value={preset.id}
                                        >
                                            {preset.name}
                                        </option>

                                    ))
                                }

                            </select>

                    }

                </div>

            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">

                <input
                    className={
                        EditorState.KorpusEdit
                            ? "rounded-lg bg-gray-900 border border-orange-700 p-3"
                            : "rounded-lg bg-gray-900 p-3"
                    }
                    placeholder="Höhe"
                    value={EditorState.selectedHeigth}
                    onChange={(e) =>
                        EditorState.setSelectedHeigth(e.target.value)
                    }
                />

                <input
                    className={
                        EditorState.KorpusEdit
                            ? "rounded-lg bg-gray-900 border border-orange-700 p-3"
                            : "rounded-lg bg-gray-900 p-3"
                    }
                    placeholder="Breite"
                    value={EditorState.selectedWidth}
                    onChange={(e) =>
                        EditorState.setSelectedWidth(e.target.value)
                    }
                />

                <input
                    className={
                        EditorState.KorpusEdit
                            ? "rounded-lg bg-gray-900 border border-orange-700 p-3"
                            : "rounded-lg bg-gray-900 p-3"
                    }
                    placeholder="Tiefe"
                    value={EditorState.selectedDepth}
                    onChange={(e) =>
                        EditorState.setSelectedDepth(e.target.value)
                    }
                />

            </div>

        </div>

    );

}