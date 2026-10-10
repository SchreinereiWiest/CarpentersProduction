import express from "express";
import {
    getUser,
    getUsers,
    newUser,
    updateUser,
    changeUserPassword,
    deleteUser,
    getCurrentUser,
    updateCurrentUser,
    changeCurrentUserPassword
} from "../controllers/user.controller.js";
import { authenticate, authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);

router.put("/me", authenticate, updateCurrentUser);

router.put("/me/password", authenticate, changeCurrentUserPassword);

router.post("/new", authenticateAdmin, newUser);

router.get("/get/:id", authenticateAdmin, getUser);

router.get("/all", authenticateAdmin, getUsers);

router.put("/update/:id", authenticateAdmin, updateUser);

router.put("/password/:id", authenticateAdmin, changeUserPassword);

router.delete("/delete/:id", authenticateAdmin, deleteUser);

export default router;
