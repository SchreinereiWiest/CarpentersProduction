import { activateLicense, getLicense } from "./services/index.js";

/** Liefert Admins nur die bereinigte Lizenzansicht ihres eigenen Mandanten. */
export async function getCurrentLicense(req, res) {
    const license = await getLicense(req.tenant, { refresh: req.query.refresh === "true" });
    res.json({ tenant: req.tenant, license });
}

/**
 * Aktiviert ein signiertes Offline-Zertifikat. Signatur, tenantId und Firmenname
 * werden vollständig im Provider geprüft; der Controller nimmt keine Claims an.
 */
export async function activateCurrentLicense(req, res) {
    const licenseKey = String(req.body?.licenseKey ?? "").trim();
    if (!licenseKey) return res.status(400).json({ error: "Lizenzschlüssel ist erforderlich" });
    if (licenseKey.length > 16_384) {
        return res.status(400).json({ error: "Lizenzschlüssel ist zu lang" });
    }

    const license = await activateLicense(req.tenant, licenseKey);
    res.json({ tenant: req.tenant, license });
}
