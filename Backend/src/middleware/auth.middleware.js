import jwt from "jsonwebtoken";
import { systemPrisma } from "../config/prisma.js";
import { runWithTenant } from "../context/tenantContext.js";
import { assertActiveLicense, LicenseError } from "../services/license/index.js";

// token überprüfung middleware
// wenn kein token erkannt access verweigert

async function authenticateRequest(req, res) {

    try {

        const token = req.cookies?.token;

        if (!token) {
            res.status(401).json({ message: "Not authenticated" });
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        if (!decoded.tenantId) {
            res.status(401).json({ message: "Tenant session is missing" });
            return null;
        }

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

        req.license = await assertActiveLicense(membership.tenant);

        req.tenant = {
            id: membership.tenant.id,
            name: membership.tenant.name,
            slug: membership.tenant.slug,
            status: membership.tenant.status
        };

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
    if (!req.license) return res.status(401).json({ message: "Not authenticated" });
    if (!req.license.features.includes(feature)) {
        return res.status(403).json({
            error: "LICENSE_FEATURE_MISSING",
            message: `Das Modul '${feature}' ist in dieser Lizenz nicht freigeschaltet`
        });
    }
    next();
};
