import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import {
  comparePassword,
} from "../utils/passwords.js";


// User login
// Überprüfung der credentials und Erstellung eines JWT-Tokens, das im Cookie gespeichert wird

export const login = async (req, res) => {

  try {

    //check login 
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credetials",
      });
    }

    const valid = await comparePassword(
      password,
      user.passwordHash
    );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    //wenn user found und password valid, dann token erstellen und im cookie speichern

    //create cookie and sign
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "24h" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: false, // lokal
        sameSite: "lax",
        // maxAge: 7 * 24 * 60 * 60
    });

    res.json({
        user: {
            id: user.id,
            email: user.email,
            role: user.role
        }
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};