
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";
import storageRoutes from "./routes/storage.routes.js"
import timeRoutes from "./routes/time.routes.js";
import userRoutes from "./routes/user.routes.js"
import settingsRoutes from "./routes/settings.routes.js"
import { allowedOrigins } from "./config/security.js";
import { verifyCsrfToken, verifyRequestOrigin } from "./middleware/csrf.middleware.js";
import { startStorageDeletionWorker } from "./services/storageDeletion.service.js";

dotenv.config();

const app = express();

// Traefik is the only trusted reverse proxy in the Compose deployment.
app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.status(426).json({ message: "HTTPS required" });
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },

  credentials: true,
}));

app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.originalUrl);
    next();
});

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

app.use(cookieParser());
app.use(verifyRequestOrigin);
app.use(verifyCsrfToken);

// user login und reauthorize
app.use("/api/auth", authRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/files", fileRoutes);

app.use("/api/materials", storageRoutes);

app.use("/api/time", timeRoutes);

app.use("/api/user", userRoutes);

app.use("/api/settings", settingsRoutes);

app.listen(5000, () => {
  console.log("Backend running on port 5000");
  startStorageDeletionWorker();
});
