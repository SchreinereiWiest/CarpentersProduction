import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useEffect } from "react";
import {MaterialModal} from "./materialModal.storage.jsx"
import { updateQuantity } from './updateMaterial.storage.jsx';

function increaseQuantity(material, setMaterials) {

    updateQuantity(
        material.id,
        material.quantity + 1,
        setMaterials
    );

}


function decreaseQuantity(material, setMaterials) {

    if (material.quantity <= 0) {
        return;
    }

    updateQuantity(
        material.id,
        material.quantity - 1,
        setMaterials
    );
}

function ShowStorage() {

const [materials, setMaterials] =
useState([]);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState(null);

useEffect(() => {

const loadMaterials =
async () => {

try {

setLoading(true);

const response = await axios.get("/api/materials/get");

setMaterials(
response.data.materials
);

} catch (error) {

console.error(
"Materialien konnten nicht geladen werden:",
error
);

setError(
"Materialien konnten nicht geladen werden."
);

} finally {

setLoading(false);

}

};

loadMaterials();

}, []);

const [showMaterialModal, setShowMaterialModal] = useState(false);
const [selectedMaterial, setSelectedMaterial] = useState(null);

return (

<div className="
                bg-gray-900
                text-white
                h-screen
                overflow-hidden
                flex
            ">

    <SideBar selected={6} />

    <main className="
                    flex-1
                    overflow-y-auto
                    p-8
                ">

        <div className="
                        flex
                        items-center
                        justify-between
                        mb-8
                    ">

            <div>

                <h1 className="
                                text-3xl
                                font-bold
                            ">
                    Lagerverwaltung
                </h1>

                <p className="
                                mt-2
                                text-gray-400
                            ">
                    Materialien und Lagerbestand verwalten
                </p>

            </div>

            <button className="
                            rounded-lg
                            bg-blue-600
                            px-4
                            py-2
                            font-medium
                            hover:bg-blue-500
                        " onClick={() => {
                            setSelectedMaterial(null);
                            setShowMaterialModal(true);
                        }}
                >
                + Material hinzufügen
            </button>

        </div>

        {showMaterialModal && (

        <MaterialModal
            material={selectedMaterial}
            onClose={() => {
                setShowMaterialModal(false);
                setSelectedMaterial(null);
            }}
            onSaved={(material) => {
                setMaterials(previous => {
                    const exists = previous.some(item => item.id === material.id);
                    return exists
                        ? previous.map(item => item.id === material.id ? material : item)
                        : [...previous, material];
                });
            }}

            />

            )}

            {loading && (

            <div className="
                            text-gray-400
                        ">
                Materialien werden geladen...
            </div>

            )}

            {error && (

            <div className="
                            rounded-lg
                            border
                            border-red-800
                            bg-red-900/30
                            p-4
                            text-red-300
                        ">
                {error}
            </div>

            )}

            {!loading &&
            !error && (

            <div className="
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-700
                            bg-gray-800
                        ">

                <table className="
                                w-full
                                text-left
                            ">

                    <thead className="
                                    border-b
                                    border-gray-700
                                    bg-gray-800
                                ">

                        <tr>

                            <th className="px-6 py-4">
                                Material
                            </th>

                            <th className="px-6 py-4">
                                Hersteller
                            </th>

                            <th className="px-6 py-4">
                                Kategorie
                            </th>

                            <th className="px-6 py-4">
                                Stärke
                            </th>

                            <th className="px-6 py-4">
                                Preis / m²
                            </th>

                            <th className="px-6 py-4 text-left">
                                Lagerbestand
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {materials.map(
                        material => (

                        <tr
                            key={material.id}
                            tabIndex={0}
                            title="Material bearbeiten"
                            onClick={() => {
                                setSelectedMaterial(material);
                                setShowMaterialModal(true);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedMaterial(material);
                                    setShowMaterialModal(true);
                                }
                            }}
                            className="
                                            border-b
                                            border-gray-700
                                            cursor-pointer
                                            hover:bg-gray-700/50
                                            focus:bg-gray-700/50
                                            focus:outline-none
                                        ">

                            <td className="
                                                px-6
                                                py-4
                                            ">

                                <div className="
                                                    font-medium
                                                ">
                                    {material.name}
                                </div>

                                {material.materialNumber && (

                                <div className="
                                                        text-sm
                                                        text-gray-400
                                                    ">
                                    {material.materialNumber}
                                </div>

                                )}

                            </td>

                            <td className="px-6 py-4">

                                {material.manufacturer || "-"}

                            </td>

                            <td className="px-6 py-4">

                                {material.category || "-"}

                            </td>

                            <td className="px-6 py-4">

                                {material.thickness
                                ? `${material.thickness} mm`
                                : "-"
                                }

                            </td>

                            <td className="px-6 py-4">

                                {material.pricePerSquareMeter
                                ? `${material.pricePerSquareMeter} $`
                                : "-"
                                }

                            </td>

                            <td className="px-6 py-4">

                                <div className="
                                    flex
                                    items-center
                                    gap-3
                                ">

                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            decreaseQuantity(material, setMaterials);
                                        }}
                                        className="
                                            flex
                                            h-8
                                            w-8
                                            items-center
                                            justify-center
                                            rounded-lg
                                            bg-gray-700
                                            text-lg
                                            font-bold
                                            text-white
                                            transition
                                            hover:bg-red-600
                                            disabled:cursor-not-allowed
                                            disabled:opacity-40
                                        "
                                        disabled={material.quantity <= 0}
                                    >
                                        −
                                    </button>


                                    <span className="
                                        min-w-[40px]
                                        text-center
                                        font-semibold
                                    ">
                                        {material.quantity ?? 0}
                                    </span>


                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            increaseQuantity(material, setMaterials);
                                        }}
                                        className="
                                            flex
                                            h-8
                                            w-8
                                            items-center
                                            justify-center
                                            rounded-lg
                                            bg-gray-700
                                            text-lg
                                            font-bold
                                            text-white
                                            transition
                                            hover:bg-green-600
                                        "
                                    >
                                        +
                                    </button>

                                </div>

                            </td>

                        </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            )}

    </main>

</div>

);

}

export default ShowStorage;
