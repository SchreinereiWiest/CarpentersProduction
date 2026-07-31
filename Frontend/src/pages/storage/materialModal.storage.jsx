import { useState } from "react";
import axios from "axios";


export function MaterialModal({ onClose, onCreated }) {

    const [formData, setFormData] = useState({

        materialNumber: "",
        name: "",
        manufacturer: "",
        category: "",
        thickness: "",
        pricePerSquareMeter: "",
        supplier: ""

    });


    const [loading, setLoading] =
        useState(false);


    const [error, setError] =
        useState(null);


    function handleChange(event) {

        const {
            name,
            value
        } = event.target;


        setFormData(previous => ({

            ...previous,

            [name]: value

        }));

    }


    async function handleSubmit(event) {

        event.preventDefault();


        setLoading(true);
        setError(null);


        try {

            const response =
                await axios.post(
                    "/api/materials/create",
                    {

                        materialNumber:
                            formData.materialNumber || null,

                        name:
                            formData.name,

                        width: Number(formData.width),

                        height: Number(formData.height),

                        minimumStorage: formData.minimumStorage ? Number(formData.minimumStorage) : null,

                        maser: formData.maser,

                        manufacturer:
                            formData.manufacturer || null,

                        category:
                            formData.category || null,

                        thickness:
                            formData.thickness
                                ? Number(formData.thickness)
                                : null,

                        pricePerSquareMeter:
                            formData.pricePerSquareMeter
                                ? Number(
                                    formData.pricePerSquareMeter
                                )
                                : null,

                        supplier:
                            formData.supplier || null

                    }
                );


            onCreated(
                response.data.material
            );


            onClose();


        } catch (error) {

            console.error(
                "Material konnte nicht erstellt werden:",
                error
            );


            setError(
                error.response?.data?.error ||
                "Material konnte nicht erstellt werden."
            );


        } finally {

            setLoading(false);

        }

    }


    return (

        <div
            className="
                fixed
                inset-0
                z-50
                flex
                items-center
                justify-center
                bg-black/60
                backdrop-blur-sm
                p-4
            "
        >

            <div
                className="
                    w-full
                    max-w-2xl
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    shadow-2xl
                "
            >

                {/* Header */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-gray-700
                        px-6
                        py-4
                    "
                >

                    <div>

                        <h2
                            className="
                                text-xl
                                font-semibold
                                text-white
                            "
                        >
                            Neues Material
                        </h2>


                        <p
                            className="
                                mt-1
                                text-sm
                                text-gray-400
                            "
                        >
                            Material zur Materialdatenbank hinzufügen
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            text-2xl
                            leading-none
                            text-gray-400
                            hover:text-white
                        "
                    >
                        ×
                    </button>

                </div>


                {/* Form */}

                <form
                    onSubmit={handleSubmit}
                    className="p-6"
                >

                    <div
                        className="
                            grid
                            grid-cols-1
                            gap-5
                            md:grid-cols-2
                        "
                    >

                        {/* Materialnummer */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Materialnummer
                            </label>


                            <input
                                type="text"
                                name="materialNumber"
                                value={
                                    formData.materialNumber
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="z. B. W980"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>


                        {/* Name */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Bezeichnung *
                            </label>


                            <input
                                type="text"
                                name="name"
                                value={
                                    formData.name
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="z. B. Platinweiss"
                                required
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>


                        {/* Hersteller */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Hersteller
                            </label>


                            <input
                                type="text"
                                name="manufacturer"
                                value={
                                    formData.manufacturer
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="z. B. Egger"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>


                        {/* Kategorie */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Kategorie
                            </label>


                            <input
                                type="text"
                                name="category"
                                value={
                                    formData.category
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="z. B. Dekorplatte"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>


                        {/* Stärke */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Stärke (mm)
                            </label>


                            <input
                                type="number"
                                name="thickness"
                                value={
                                    formData.thickness
                                }
                                onChange={
                                    handleChange
                                }
                                min="0"
                                step="0.1"
                                placeholder="19"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>


                        {/* Preis */}

                        <div>

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Preis pro m²
                            </label>


                            <input
                                type="number"
                                name="pricePerSquareMeter"
                                value={
                                    formData.pricePerSquareMeter
                                }
                                onChange={
                                    handleChange
                                }
                                min="0"
                                step="0.01"
                                placeholder="42.50"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Breite
                            </label>

                            <input
                                type="number"
                                name="width"
                                value={formData.width}
                                onChange={handleChange}
                                required
                                min="1"
                                step="1"
                                placeholder="z. B. 2800"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    focus:border-blue-500
                                "
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Höhe
                            </label>

                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                required
                                min="1"
                                step="1"
                                placeholder="z. B. 2070"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    focus:border-blue-500
                                "
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Mindestbestand
                            </label>

                            <input
                                type="number"
                                name="minimumStorage"
                                value={formData.minimumStorage}
                                onChange={handleChange}
                                min="0"
                                step="1"
                                placeholder="z. B. 2"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    focus:border-blue-500
                                "
                            />
                        </div>

                        {/* Maserung */}

                    <div className="
                        flex
                        items-center
                        gap-3
                        rounded-lg
                        border
                        border-gray-700
                        bg-gray-900
                        px-4
                        py-3
                    ">

                        <input
                            type="checkbox"
                            name="maser"
                            checked={formData.maser}
                            onChange={handleChange}
                            className="
                                h-4
                                w-4
                                accent-blue-500
                            "
                        />

                        <div>

                            <label className="
                                block
                                cursor-pointer
                                font-medium
                            ">
                                Maserung vorhanden
                            </label>

                            <p className="
                                text-sm
                                text-gray-400
                            ">
                                NestingDirection
                            </p>

                        </div>

                    </div>


                        {/* Lieferant */}

                        <div className="md:col-span-2">

                            <label
                                className="
                                    mb-2
                                    block
                                    text-sm
                                    font-medium
                                    text-gray-300
                                "
                            >
                                Lieferant
                            </label>


                            <input
                                type="text"
                                name="supplier"
                                value={
                                    formData.supplier
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="z. B. Häfele"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-gray-600
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    placeholder:text-gray-500
                                    focus:border-blue-500
                                "
                            />

                        </div>

                    </div>

                    


                    {/* Error */}

                    {error && (

                        <div
                            className="
                                mt-5
                                rounded-lg
                                border
                                border-red-800
                                bg-red-900/30
                                px-4
                                py-3
                                text-sm
                                text-red-300
                            "
                        >
                            {error}
                        </div>

                    )}


                    {/* Buttons */}

                    <div
                        className="
                            mt-8
                            flex
                            justify-end
                            gap-3
                        "
                    >

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="
                                rounded-lg
                                border
                                border-gray-600
                                px-5
                                py-2
                                text-gray-300
                                transition
                                hover:bg-gray-700
                                hover:text-white
                            "
                        >
                            Abbrechen
                        </button>


                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                rounded-lg
                                bg-blue-600
                                px-5
                                py-2
                                font-medium
                                text-white
                                transition
                                hover:bg-blue-500
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >

                            {loading
                                ? "Speichern..."
                                : "Material speichern"
                            }

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}


export default MaterialModal;