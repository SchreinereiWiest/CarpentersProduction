import prisma from "../config/prisma.js";

export async function getMaterials(req, res) {

    try {

        const materials =
            await prisma.material.findMany({

                orderBy: {
                    name: "asc"
                }

            });


        res.status(200).json({
            materials
        });


    } catch (error) {

        console.error(
            "Fehler beim Laden der Materialien:",
            error
        );


        res.status(500).json({
            error: "Internal server error"
        });

    }

}

export async function createMaterial(req, res) {

    try {

        const {

            materialNumber,
            name,
            width,
            height,
            minimumStorage,
            maser,
            manufacturer,
            category,
            thickness,
            pricePerSquareMeter,
            supplier

        } = req.body;


        const material =
            await prisma.material.create({

                data: {

                    materialNumber,
                    name,
                    width,
                    height,
                    minimumStorage,
                    maser,
                    manufacturer,
                    category,
                    thickness,
                    pricePerSquareMeter,
                    supplier

                }

            });


        res.status(201).json({
            material
        });


    } catch (error) {

        console.error(
            "Fehler beim Erstellen des Materials:",
            error
        );


        res.status(500).json({
            error: "Internal server error"
        });

    }

}


export const updateMaterialQuantity = async (req, res) => {

    try {

        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity < 0) {
            return res.status(400).json({
                error: "Quantity cannot be negative"
            });
        }

        const material = await prisma.material.update({

            where: {
                id: id
            },

            data: {
                quantity: quantity
            }

        });

        res.status(200).json({
            material
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });

    }

};  