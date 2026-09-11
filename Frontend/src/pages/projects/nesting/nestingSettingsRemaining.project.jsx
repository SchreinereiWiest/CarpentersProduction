import { useState } from "react";

export default function NestingSettingsRemaining({remainingPlates, setRemainingPlates}) {

const [remainingPlateX, setRemainingPlateX] = useState("");
    const [remainingPlateY, setRemainingPlateY] = useState("");

    function createId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
}

    function addRemainingPlate() {

        const x = Number(remainingPlateX);
        const y = Number(remainingPlateY);

        if (x <= 0 || y <= 0) {
            return;
        }

        const plate = {
            id: createId(),
            X: x,
            Y: y
        };

        setRemainingPlates(prev => [
            ...prev,
            plate
        ]);

        setRemainingPlateX("");
        setRemainingPlateY("");
    }

    function removeRemainingPlate(id) {

        setRemainingPlates(prev =>
            prev.filter(plate => plate.id !== id)
        );

    }


return <>
<div className="
    flex
    flex-col
    rounded-xl
    bg-gray-900
    p-4
">

    <h3 className="
        mb-4
        text-lg
        font-semibold
    ">
        Restplatten
    </h3>


    {/* Eingabe */}

    <div className="
        flex
        gap-2
        mb-5
    ">

        <input
            type="number"
            min="1"
            placeholder="Länge"
            value={remainingPlateX}
            onChange={(e) =>
                setRemainingPlateX(e.target.value)
            }
            className="
                min-w-0
                flex-1
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

        <input
            type="number"
            min="1"
            placeholder="Breite"
            value={remainingPlateY}
            onChange={(e) =>
                setRemainingPlateY(e.target.value)
            }
            className="
                min-w-0
                flex-1
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

        <button
            type="button"
            onClick={() => {addRemainingPlate();
            }}
            className="
                w-10
                shrink-0
                rounded-lg
                bg-green-600
                text-xl
                font-semibold
                hover:bg-green-500
            "
        >
            +
        </button>

    </div>


    {/* Liste */}

    <div className="
        flex-1
        space-y-2
        overflow-y-auto
    ">

        {remainingPlates.length === 0 && (

            <div className="
                rounded-lg
                border
                border-dashed
                border-gray-700
                p-4
                text-center
                text-sm
                text-gray-500
            ">
                Keine Restplatten vorhanden
            </div>

        )}


        {remainingPlates.map(plate => (

            <div
                key={plate.id}
                className="
                    flex
                    items-center
                    justify-between
                    rounded-lg
                    bg-gray-800
                    px-4
                    py-3
                "
            >

                <div>

                    <div className="
                        font-medium
                    ">
                        {plate.X} × {plate.Y} mm
                    </div>

                    <div className="
                        text-xs
                        text-gray-500
                    ">
                        Restplatte
                    </div>

                </div>


                <button
                    type="button"
                    onClick={() =>
                        removeRemainingPlate(plate.id)
                    }
                    className="
                        rounded-lg
                        px-3
                        py-1
                        text-red-400
                        hover:bg-gray-700
                        hover:text-red-300
                    "
                >
                    ×
                </button>

            </div>

        ))}

    </div>

</div>
</>
}