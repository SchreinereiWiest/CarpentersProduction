import jwt from "jsonwebtoken";
import { systemPrisma } from "../infrastructure/database/prisma.js";
import { runWithTenant } from "../infrastructure/database/tenant-context.js";
import { assertActiveLicense, LicenseError } from "../modules/licensing/services/index.js";

/**
 * Gemeinsame Sitzungsprüfung für alle geschützten Endpunkte.
 *
 * Der JWT ist nur ein Verweis auf Benutzer und Mandant. Mitgliedschaft, Rolle,
 * Benutzerstatus, Firmenstatus, authVersion und Lizenz werden bei jedem Request
 * aus vertrauenswürdigen serverseitigen Quellen neu geprüft.
 */

async function authenticateRequest(req, res) {

    try {

        const token = req.cookies?.token;

        if (!token) {
            res.status(401).json({ message: "Not authenticated" });
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Tokens aus der Zeit vor der Mandantenmigration werden absichtlich
        // abgelehnt; ein stiller Fallback auf die Entwicklungsfirma wäre unsicher.
        if (!decoded.tenantId) {
            res.status(401).json({ message: "Tenant session is missing" });
            return null;
        }

        // User ist die globale Identität. Rolle und Firmenzugriff stammen immer
        // aus der konkreten TenantMembership.
        const membership = await systemPrisma.tenantMembership.findUnique({
            where: {
                tenantId_userId: {
                    tenantId: decoded.tenantId,
                    userId: decoded.id
                }
            },
            include: { user: true, tenant: true }
        });

        const user = membership?.user;

        if (
            !user
            || !membership.isActive
            || !user.isActive
            || user.deletedAt
            || membership.tenant.status !== "active"
            || decoded.authVersion !== user.authVersion
        ) {
            res.status(401).json({ message: "Session revoked" });
            return null;
        }

        // Diese Prüfung nutzt den mandantengetrennten Lizenzcache und verursacht
        // daher keinen Lizenzserver-Aufruf pro Datenbankabfrage.
        req.license = await assertActiveLicense(membership.tenant);

        req.tenant = {
            id: membership.tenant.id,
            name: membership.tenant.name,
            slug: membership.tenant.slug,
            status: membership.tenant.status
        };

        // Nachgelagerte Rollenprüfungen dürfen nur diese Membership-Rolle nutzen,
        // nicht das historische globale role-Feld des User-Modells.
        req.user = {
            id: user.id,
            email: user.email,
            login: user.login,
            role: membership.role,
            membershipId: membership.id,
            tenantId: membership.tenantId,
            authVersion: user.authVersion
        };

        return req.user;

    } catch (error) {

        if (error instanceof LicenseError) {
            res.status(error.statusCode).json({ error: error.code, message: error.message });
            return null;
        }

        res.status(401).json({ message: "Invalid token" });
        return null;

    }
}

export const authenticate = async (req, res, next) => {
    if (!await authenticateRequest(req, res)) return;
    // Express muss innerhalb des ALS-Kontexts fortgesetzt werden, damit alle im
    // Controller erzeugten Promises denselben Mandanten erben.
    return runWithTenant({ tenantId: req.tenant.id, userId: req.user.id }, next);
};

export const authenticateAdmin = async (req, res, next) => {
    if (!await authenticateRequest(req, res)) return;

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
    }

    return runWithTenant({ tenantId: req.tenant.id, userId: req.user.id }, next);
};

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Not authorized" });
    }

    next();
};

export const requireFeature = feature => (req, res, next) => {
    // Lizenzfunktionen werden im Backend erzwungen. Ausgeblendete React-Menüs
    // wären allein kein Schutz vor direkten API-Aufrufen.
    if (!req.license) return res.status(401).json({ message: "Not authenticated" });
    if (!req.license.features.includes(feature)) {
        return res.status(403).json({
            error: "LICENSE_FEATURE_MISSING",
            message: `Das Modul '${feature}' ist in dieser Lizenz nicht freigeschaltet`
        });
    }
    next();
};
