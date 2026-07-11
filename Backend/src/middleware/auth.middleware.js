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