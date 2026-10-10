import prisma from "../config/prisma.js";
import jwt from "jsonwebtoken";
import {
  csrfCookieClearOptions,
  sessionCookieClearOptions,
  sessionCookieOptions
} from "../config/security.js";
import { issueCsrfToken } from "../middleware/csrf.middleware.js";

import {
  comparePassword,
} from "../utils/passwords.js";


// User login
// Überprüfung der credentials und Erstellung eines JWT-Tokens, das im Cookie gespeichert wird

export const login = async (req, res) => {

  try {

    //check login 
    const { login, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        login: login,
      },  
    });

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        error: "Invalid credentials",
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
            login: user.login,
            role: user.role,
            authVersion: user.authVersion
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "72h" }
    );

    res.cookie("token", token, sessionCookieOptions);
    const csrfToken = issueCsrfToken(res);

    res.json({
        user: {
            id: user.id,
            email: user.email,
            login: user.login,
            role: user.role
        },
        csrfToken
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { authVersion: { increment: 1 } }
    });

    res.clearCookie("token", sessionCookieClearOptions);
    res.clearCookie("XSRF-TOKEN", csrfCookieClearOptions);
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getAllUsers = async (req, res) => {

  try {

    const users = await prisma.user.findMany({
        orderBy: [
          {
            email: "asc",
          },
        ],

      });

      const filterUser = [];
      users.forEach(element => {
        filterUser.push({id: element.id, email: element.email});
      });

    res.status(200).json({
      filterUser
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};
