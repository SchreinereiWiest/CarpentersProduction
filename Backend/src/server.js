
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

dotenv.config();

const app = express();

app.use(cors({
  origin: ["cp.moebelschreinerei-wiest.de", "s3.moebelschreinerei-wiest.de"],

  credentials: true,
}));

app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.originalUrl);
    next();
});

app.use(express.json());

app.use(cookieParser());

// user login und reauthorize
app.use("/api/auth", authRoutes);

app.use("/api/customers", customerRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/files", fileRoutes);

app.use("/api/materials", storageRoutes);

app.use("/api/time", timeRoutes);

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});

