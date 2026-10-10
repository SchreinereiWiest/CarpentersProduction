import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

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

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                login: true,
                role: true,
                isActive: true,
                deletedAt: true,
                authVersion: true
            }
        });

        if (
            !user
            || !user.isActive
            || user.deletedAt
            || decoded.authVersion !== user.authVersion
        ) {
            res.status(401).json({ message: "Session revoked" });
            return null;
        }

        req.user = {
            id: user.id,
            email: user.email,
            login: user.login,
            role: user.role,
            authVersion: user.authVersion
        };

        return req.user;

    } catch (error) {

        res.status(401).json({ message: "Invalid token" });
        return null;

    }
}

export const authenticate = async (req, res, next) => {
    if (await authenticateRequest(req, res)) next();
};

export const authenticateAdmin = async (req, res, next) => {
    if (!await authenticateRequest(req, res)) return;

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
    }

    next();
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
