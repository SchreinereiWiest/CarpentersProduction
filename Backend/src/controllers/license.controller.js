import { activateLicense, getLicense } from "../services/license/index.js";

export async function getCurrentLicense(req, res) {
    const license = await getLicense(req.tenant, { refresh: req.query.refresh === "true" });
    res.json({ tenant: req.tenant, license });
}

export async function activateCurrentLicense(req, res) {
    const licenseKey = String(req.body?.licenseKey ?? "").trim();
    if (!licenseKey) return res.status(400).json({ error: "Lizenzschlüssel ist erforderlich" });

    const license = await activateLicense(req.tenant, licenseKey);
    res.json({ tenant: req.tenant, license });
}
