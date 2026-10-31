import { importSupplierDatanorm } from "./datanorm.service.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uploadSupplierDatanorm = async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id || "")) return res.status(400).json({ error: "Invalid supplier id" });
    if (!Array.isArray(req.files) || req.files.length === 0) return res.status(400).json({ error: "Mindestens eine DATANORM- oder ZIP-Datei ist erforderlich" });
    try {
        res.json(await importSupplierDatanorm(req.params.id, req.files));
    } catch (error) {
        console.error("DATANORM-Import fehlgeschlagen:", error.message);
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};
