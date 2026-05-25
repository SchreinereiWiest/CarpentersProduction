import express from "express";
import prisma from "../config/prisma.js";

import {
  login,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/new", login);

//reauthorize
router.get("/me", authenticate, async (req, res) => {

    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id
        }
    });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({
        id: user.id,
        email: user.email,
        role: user.role
    });
});

export default router;