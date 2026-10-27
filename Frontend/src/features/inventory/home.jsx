import { Fragment, useEffect, useMemo, useState } from 'react'
import SideBar from '../../shared/components/sideBar.jsx'
import axios from 'axios';
import {MaterialModal} from "./materialModal.jsx"
import { updateQuantity } from './updateMaterial.jsx';

const normalizeText = value => String(value ?? "").trim().toLocaleLowerCase("de-DE");


function groupMaterials(materials, query) {
    const normalizedQuery = normalizeText(query);
    const groups = new Map();

    materials
        .filter(material => !normalizedQuery || [
            material.name,
            material.materialNumber,
            material.manufacturer,
            material.category,
            material.thickness
        ].some(value => normalizeText(value).includes(normalizedQuery)))
        .forEach(material => {
            const category = String(material.category ?? "").trim();
            const key = normalizeText(category) || "__uncategorized__";
            const group = groups.get(key) ?? {
                key,
                label: category || "Ohne Kategorie",
                materials: []
            };

            group.materials.push(material);
            groups.set(key, group);
        });

    return [...groups.values()].sort((left, right) =>
        left.label.localeCompare(right.label, "de-DE", { sensitivity: "base" })
    );
}

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
const [searchQuery, setSearchQuery] = useState("");
const materialGroups = useMemo(
    () => groupMaterials(materials, searchQuery),
    [materials, searchQuery]
);
const visibleMaterialCount = materialGroups.reduce(
    (count, group) => count + group.materials.length,
    0
);

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
                    min-w-0
                    overflow-y-auto
                    p-4
                    sm:p-6
                    xl:p-8
                ">

        <div className="
                        flex
                        flex-col
                        items-start
                        justify-between
                        gap-4
                        mb-6
                        sm:items-center
                        sm:flex-row
                        xl:mb-8
                    ">

            <div>

                <h1 className="
                                text-2xl
                                sm:text-3xl
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
                            w-full
                            rounded-lg
                            bg-blue-600
                            px-4
                            py-2
                            font-medium
                            hover:bg-blue-500
                            sm:w-auto
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

            {!loading && !error && (
                <div className="mb-4">
                    <label htmlFor="material-search" className="sr-only">
                        Materialien suchen
                    </label>
                    <div className="relative max-w-xl">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500" aria-hidden="true">
                            ⌕
                        </span>
                        <input
                            id="material-search"
                            type="search"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Materialien suchen …"
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-10 pr-4 text-white outline-none placeholder:text-gray-500 focus:border-blue-500"
                        />
                    </div>
                    {searchQuery && (
                        <p className="mt-2 text-sm text-gray-400">
                            {visibleMaterialCount} {visibleMaterialCount === 1 ? "Material" : "Materialien"} gefunden
                        </p>
                    )}
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

                <table className="responsive-card-table
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

                        {materialGroups.map(group => (
                        <Fragment key={group.key}>
                        <tr className="inventory-category-divider bg-gray-900/70">
                            <td colSpan={6} className="px-6 py-3">
                                <div className="flex items-center gap-4">
                                    <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-blue-300">
                                        {group.label}
                                    </span>
                                    <span className="h-px flex-1 bg-gray-600" aria-hidden="true" />
                                    <span className="text-xs text-gray-500">
                                        {group.materials.length}
                                    </span>
                                </div>
                            </td>
                        </tr>

                        {group.materials.map(material => (

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

                            <td data-label="Material" className="
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

                            <td data-label="Hersteller" className="px-6 py-4">

                                {material.manufacturer || "-"}

                            </td>

                            <td data-label="Kategorie" className="px-6 py-4">

                                {material.category || "-"}

                            </td>

                            <td data-label="Stärke" className="px-6 py-4">

                                {material.thickness
                                ? `${material.thickness} mm`
                                : "-"
                                }

                            </td>

                            <td data-label="Preis / m²" className="px-6 py-4">

                                {material.pricePerSquareMeter
                                ? `${material.pricePerSquareMeter} $`
                                : "-"
                                }

                            </td>

                            <td data-label="Lagerbestand" className="px-6 py-4">

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
                        </Fragment>
                        ))}

                        {visibleMaterialCount === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                    Keine Materialien für „{searchQuery}“ gefunden.
                                </td>
                            </tr>
                        )}

                    </tbody>

                </table>

            </div>

            )}

    </main>

</div>

);

}

export default ShowStorage;
