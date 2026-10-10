import "dotenv/config";

const production = process.env.NODE_ENV === "production";

const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

export const allowedOrigins = new Set(configuredOrigins.length
    ? configuredOrigins
    : production
      ? ["https://cp.moebelschreinerei-wiest.de"]
      : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.10.100.52",
        "https://cp.moebelschreinerei-wiest.de"
      ]
);

export const isAllowedOrigin = origin => !origin || allowedOrigins.has(origin);

export const sessionCookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/",
    maxAge: 72 * 60 * 60 * 1000
};

export const csrfCookieOptions = {
    httpOnly: false,
    secure: production,
    sameSite: "strict",
    path: "/",
    maxAge: 72 * 60 * 60 * 1000
};

export const sessionCookieClearOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/"
};

export const csrfCookieClearOptions = {
    httpOnly: false,
    secure: production,
    sameSite: "strict",
    path: "/"
};
