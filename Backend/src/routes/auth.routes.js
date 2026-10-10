import express from "express";
import prisma from "../config/prisma.js";

import {
    getAllUsers,
  login,
  logout,
} from "../controllers/auth.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// routes für authentication
// login für anmeldung bei auth.contorller
// authenticate middleware für reauthorization

router.post("/login", login);
router.post("/logout", authenticate, logout);

router.get("/users", authenticate, authorizeRoles("admin", "manager"), getAllUsers);

//reauthorize
router.get("/me", authenticate, async (req, res) => {

    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id
        }
    });

    res.json({
        id: user.id,
        email: user.email,
        role: user.role
    });
});

export default router;
