import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import { allowedOrigins } from "./config/security.js";
import { verifyCsrfToken, verifyRequestOrigin } from "./middleware/csrf.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import projectRoutes from "./modules/projects/project.routes.js";
import customerRoutes from "./modules/customers/customer.routes.js";
import fileRoutes from "./modules/files/file.routes.js";
import inventoryRoutes from "./modules/inventory/storage.routes.js";
import licenseRoutes from "./modules/licensing/license.routes.js";
import managementRoutes from "./modules/management/management.routes.js";
import purchasingRoutes from "./modules/purchasing/shop.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import timeRoutes from "./modules/time-tracking/time.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import storageAdminRoutes from "./modules/storage-admin/storage-admin.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && !req.secure) {
      return res.status(426).json({ message: "HTTPS required" });
    }
    return next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  }));
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));
  app.use(cookieParser());
  app.use(verifyRequestOrigin);
  app.use(verifyCsrfToken);

  app.use("/api/auth", authRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/materials", inventoryRoutes);
  app.use("/api/time", timeRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/shop", purchasingRoutes);
  app.use("/api/management", managementRoutes);
  app.use("/api/license", licenseRoutes);
  app.use("/api/storage-admin", storageAdminRoutes);

  app.use((error, _req, res, _next) => {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      error: error?.code || "INTERNAL_SERVER_ERROR",
      message: status >= 500 ? "Internal server error" : error.message
    });
  });

  return app;
}

export default createApp();
