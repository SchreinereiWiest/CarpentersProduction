import express from "express";

import {
  bootstrap,
  getAllUsers,
  login,
  logout
} from "./auth.controller.js";
import { authenticate, authorizeRoles } from "../../middleware/auth.middleware.js";

const router = express.Router();

// routes für authentication
// login für anmeldung bei auth.contorller
// authenticate middleware für reauthorization

router.post("/login", login);
router.post("/bootstrap", bootstrap);

router.post("/logout", authenticate, logout);

router.get("/users", authenticate, authorizeRoles("admin", "manager"), getAllUsers);

//reauthorize
router.get("/me", authenticate, async (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        login: req.user.login,
        role: req.user.role,
        tenant: req.tenant,
        features: req.license.features
    });
});

export default router;
