import express from "express";
import prisma from "../config/prisma.js";
import { getUser, getUsers, newUser, updateUser, changeUserPassword, deleteUser } from "../controllers/user.controller.js";
import { authenticate, authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new", authenticateAdmin, newUser);

router.get("/get/:id", authenticateAdmin, getUser);

router.get("/all", authenticateAdmin, getUsers);

router.put("/update/:id", authenticateAdmin, updateUser);

router.put("/password/:id", authenticateAdmin, changeUserPassword);

router.delete("/delete/:id", authenticateAdmin, deleteUser);

export default router;