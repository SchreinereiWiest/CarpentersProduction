
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://app.localhost",
  credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

// user login und reauthorize
app.use("/auth", authRoutes);

app.use("/customers", customerRoutes);

app.use("/projects", projectRoutes);

app.use("/files", fileRoutes);

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});

