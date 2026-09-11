import { useState } from "react";
import NestingSettingsRemaining from "./nestingSettingsRemaining.project";

function NestingSettingsModal({
    settings,
    activeSheet,
    setSettings,
    onClose
}) {

    const [localSettings, setLocalSettings] = useState(settings);
    const [remainingPlates, setRemainingPlates] = useState(settings?.remainingPlates || []);


    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked
        } = event.target;


        setLocalSettings(prev => ({

            ...prev,

            remainingPlates: remainingPlates,

            [name]:
                type === "checkbox"
                    ? checked
                    : Number(value)

        }));

    }


    function handleSave() {

        setSettings(prev => {
    const newSettings = [...prev];

    newSettings[activeSheet] = {
        ...newSettings[activeSheet],
        ...localSettings,
        remainingPlates: remainingPlates
    };
    console.log(newSettings);
    return newSettings;
});

        onClose();

    }

    

    return (

        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            backdrop-blur-sm
        ">

            <div className="
                w-[700px]
                rounded-2xl
                border
                border-white/10
                bg-gray-900/95
                p-6
                text-white
                shadow-2xl
            ">

                <h2 className="
                    mb-6
                    text-2xl
                    font-bold
                ">
                    Nesting Einstellungen
                </h2>

                <div className="grid
    grid-cols-2
    gap-6">
                    <div className="
                        space-y-4
                    ">


                        {/* Margin */}

                        <div>
                            <label className="
                                mb-1
                                block
                                text-sm
                                text-gray-300
                            ">
                                Rand zur Außenkante
                            </label>

                            <input
                                type="number"
                                name="margin"
                                value={localSettings.margin}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-lg
                                    bg-gray-800
                                    px-3
                                    py-2
                                    outline-none
                                    ring-1
                                    ring-gray-700
                                    focus:ring-blue-500
                                "
                            />
                        </div>


                        {/* Gap */}

                        <div>
                            <label className="
                                mb-1
                                block
                                text-sm
                                text-gray-300
                            ">
                                Abstand zwischen Teilen
                            </label>

                            <input
                                type="number"
                                name="gap"
                                value={localSettings.gap}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-lg
                                    bg-gray-800
                                    px-3
                                    py-2
                                    outline-none
                                    ring-1
                                    ring-gray-700
                                    focus:ring-blue-500
                                "
                            />
                        </div>


                        {/* Cut Gap */}

                        <div>
                            <label className="
                                mb-1
                                block
                                text-sm
                                text-gray-300
                            ">
                                Sägeschnitt
                            </label>

                            <input
                                type="number"
                                name="cutGap"
                                value={localSettings.cutGap}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-lg
                                    bg-gray-800
                                    px-3
                                    py-2
                                    outline-none
                                    ring-1
                                    ring-gray-700
                                    focus:ring-blue-500
                                "
                            />
                        </div>


                        {/* Strip Difference */}

                        <div>
                            <label className="
                                mb-1
                                block
                                text-sm
                                text-gray-300
                            ">
                                Strip Difference
                            </label>

                            <input
                                type="number"
                                name="stripDifference"
                                value={localSettings.stripDifference}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-lg
                                    bg-gray-800
                                    px-3
                                    py-2
                                    outline-none
                                    ring-1
                                    ring-gray-700
                                    focus:ring-blue-500
                                "
                            />
                        </div>


                        {/* Sheet Offset */}

                        <div>
                            <label className="
                                mb-1
                                block
                                text-sm
                                text-gray-300
                            ">
                                Abstand zwischen Platten
                            </label>

                            <input
                                type="number"
                                name="sheetOffset"
                                value={localSettings.sheetOffset}
                                onChange={handleChange}
                                className="
                                    w-full
                                    rounded-lg
                                    bg-gray-800
                                    px-3
                                    py-2
                                    outline-none
                                    ring-1
                                    ring-gray-700
                                    focus:ring-blue-500
                                "
                            />
                        </div>


                        {/* Rotation */}

                        <label className="
                            flex
                            cursor-pointer
                            items-center
                            justify-between
                            rounded-lg
                            bg-gray-800
                            p-3
                        ">

                            <span className="
                                text-sm
                                text-gray-300
                            ">
                                Teile drehen erlaubt
                            </span>

                            <input
                                type="checkbox"
                                name="allowRotation"
                                checked={
                                    localSettings.allowRotation
                                }
                                onChange={handleChange}
                                className="
                                    h-5
                                    w-5
                                "
                            />

                        </label>

                    </div>
                    
                    <NestingSettingsRemaining
                        remainingPlates={remainingPlates}
                        setRemainingPlates={setRemainingPlates}
                    />
                    
                </div>

                {/* Footer */}

                <div className="
                    mt-8
                    flex
                    justify-end
                    gap-3
                ">

                    <button
                        onClick={onClose}
                        className="
                            rounded-lg
                            bg-gray-700
                            px-5
                            py-2
                            transition
                            hover:bg-gray-600
                        "
                    >
                        Abbrechen
                    </button>


                    <button
                        onClick={handleSave}
                        className="
                            rounded-lg
                            bg-blue-600
                            px-5
                            py-2
                            font-medium
                            transition
                            hover:bg-blue-500
                        "
                    >
                        Speichern
                    </button>

                </div>

            </div>

        </div>

    );

}

export default NestingSettingsModal;