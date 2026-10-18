import axios from 'axios';

export async function updateQuantity(materialId, newQuantity, setMaterials) {

    if (newQuantity < 0) {
        return;
    }

    try {

        const { data } = await axios.patch(
            `/api/materials/${materialId}/quantity`,
            {
                quantity: newQuantity
            }
        );

        setMaterials(previousMaterials =>
            previousMaterials.map(material =>
                material.id === materialId
                    ? {
                        ...material,
                        quantity: data.material.quantity
                    }
                    : material
            )
        );

        
    } catch (error) {

        console.error(
            "Materialbestand konnte nicht aktualisiert werden",
            error
        );

    }

}