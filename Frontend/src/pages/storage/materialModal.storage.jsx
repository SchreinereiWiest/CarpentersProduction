import { useEffect, useState } from "react";
import axios from "axios";
import { loadShopSettings } from "../purchasing/procurementApi.js";
import { normalizeShopSettings } from "../purchasing/procurementUtils.js";


export function MaterialModal({ onClose, onSaved, material = null }) {

    const [suppliers, setSuppliers] = useState([]);

    const [formData, setFormData] = useState({

        materialNumber: material?.materialNumber ?? "",
        name: material?.name ?? "",
        manufacturer: material?.manufacturer ?? "",
        category: material?.category ?? "",
        thickness: material?.thickness ?? "",
        pricePerSquareMeter: material?.pricePerSquareMeter ?? "",
        edgeArticleNumber: material?.edgeArticleNumber ?? "",
        edgePricePerMeter: material?.edgePricePerMeter ?? "",
        edgePurchaseLength: material?.edgePurchaseLength ?? 75,
        supplierId: material?.supplierId ?? "",
        width: material?.width ?? "",
        height: material?.height ?? "",
        minimumStorage: material?.minimumStorage ?? "",
        maser: material?.maser === true

    });


    const [loading, setLoading] =
        useState(false);


    const [error, setError] =
        useState(null);


    useEffect(() => {

        let active = true;

        loadShopSettings()
            .then(settings => {
                if (active) setSuppliers(normalizeShopSettings(settings).suppliers);
            })
            .catch(loadError => {
                console.warn("Lieferanten konnten nicht geladen werden:", loadError);
            });

        return () => { active = false; };

    }, []);


    function handleChange(event) {

        const {
            name,
            value,
            type,
            checked
        } = event.target;


        setFormData(previous => ({

            ...previous,

            [name]: type === "checkbox" ? checked : value

        }));

    }


    async function handleSubmit(event) {

        event.preventDefault();


        setLoading(true);
        setError(null);


        try {

            const payload = {

                        materialNumber:
                            formData.materialNumber || null,

                        name:
                            formData.name,

                        width: Number(formData.width),

                        height: Number(formData.height),

                        minimumStorage: formData.minimumStorage ? Number(formData.minimumStorage) : null,

                        maser: Boolean(formData.maser),

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

                        edgeArticleNumber:
                            formData.edgeArticleNumber || null,

                        edgePricePerMeter:
                            formData.edgePricePerMeter !== ""
                                ? Number(formData.edgePricePerMeter)
                                : null,

                        edgePurchaseLength:
                            formData.edgePurchaseLength
                                ? Number(formData.edgePurchaseLength)
                                : 75,

                        supplierId:
                            formData.supplierId || null

                    };

            const response = material
                ? await axios.put(`/api/materials/${material.id}`, payload)
                : await axios.post("/api/materials/create", payload);


            onSaved(
                response.data.material
            );


            onClose();


        } catch (error) {

            console.error(
                "Material konnte nicht gespeichert werden:",
                error
            );


            setError(
                error.response?.data?.error ||
                "Material konnte nicht gespeichert werden."
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
                    max-h-[calc(100dvh-1rem)]
                    flex
                    flex-col
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
                        px-4
                        py-4
                        sm:px-6
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
                            {material ? "Material bearbeiten" : "Neues Material"}
                        </h2>


                        <p
                            className="
                                mt-1
                                text-sm
                                text-gray-400
                            "
                        >
                            {material
                                ? "Materialdaten aktualisieren"
                                : "Material zur Materialdatenbank hinzufügen"}
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
                    className="overflow-y-auto p-4 sm:p-6"
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

                        <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3">
                            <input
                                type="checkbox"
                                name="maser"
                                checked={formData.maser}
                                onChange={handleChange}
                                className="h-4 w-4 accent-blue-500"
                            />
                            <div>
                                <label className="block cursor-pointer font-medium">
                                    Maserung der Platte vorhanden
                                </label>
                                <p className="text-sm text-gray-400">
                                    Steuert die Drehrichtung beim Nesting
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-2 border-t border-gray-700 pt-5">
                            <h3 className="font-semibold text-white">Kantendaten</h3>
                            <p className="mt-1 text-sm text-gray-400">
                                Einkaufsdaten für die zu dieser Materialnummer gehörende Kante.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Kantenartikelnummer
                            </label>
                            <input
                                type="text"
                                name="edgeArticleNumber"
                                value={formData.edgeArticleNumber}
                                onChange={handleChange}
                                placeholder="z. B. K-W980"
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Kantenpreis pro Meter
                            </label>
                            <input
                                type="number"
                                name="edgePricePerMeter"
                                value={formData.edgePricePerMeter}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="z. B. 0.85"
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm text-gray-300">
                                Standardeinkaufsmenge (m)
                            </label>
                            <input
                                type="number"
                                name="edgePurchaseLength"
                                value={formData.edgePurchaseLength}
                                onChange={handleChange}
                                min="0.01"
                                step="0.01"
                                placeholder="75"
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Standardrolle: 75 m</p>
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


                            <select
                                name="supplierId"
                                value={
                                    formData.supplierId
                                }
                                onChange={
                                    handleChange
                                }
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
                            >
                                <option value="">Ohne Lieferant</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                ))}
                            </select>

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
