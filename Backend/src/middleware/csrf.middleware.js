import crypto from "crypto";

import { csrfCookieOptions, isAllowedOrigin } from "../config/security.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sameToken(left, right) {
    if (typeof left !== "string" || typeof right !== "string") return false;

    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueCsrfToken(res) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("XSRF-TOKEN", token, csrfCookieOptions);
    return token;
}

export function verifyRequestOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get("origin");
    if (!isAllowedOrigin(origin)) {
        return res.status(403).json({ message: "Origin not allowed" });
    }

    next();
}

export function verifyCsrfToken(req, res, next) {
    if (SAFE_METHODS.has(req.method) || req.path === "/api/auth/login") {
        return next();
    }

    const cookieToken = req.cookies?.["XSRF-TOKEN"];
    const headerToken = req.get("x-xsrf-token") || req.get("x-csrf-token");

    if (!sameToken(cookieToken, headerToken)) {
        return res.status(403).json({ message: "Invalid CSRF token" });
    }

    next();
}
