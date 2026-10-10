import jwt from "jsonwebtoken";

// token überprüfung middleware
// wenn kein token erkannt access verweigert

export const authenticate = (req, res, next) => {

    try {

        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({ message: "Invalid token" });

    }
};

export const authenticateAdmin = (req, res, next) => {

    try {

        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        req.user = decoded;

        if(req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized" });
        }

        next();

    } catch (error) {

        return res.status(401).json({ message: "Invalid token" });

    }
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
