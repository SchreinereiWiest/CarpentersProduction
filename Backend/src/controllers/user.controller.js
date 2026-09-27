

import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";


// ============================================================
// GET USERS
// ============================================================

export const getUsers = async (req, res) => {

    try {

        const users =
            await prisma.user.findMany({

                where: {
                    deletedAt: null
                },

                orderBy: [
                    {
                        lastName: "asc"
                    },
                    {
                        firstName: "asc"
                    },
                    {
                        email: "asc"
                    }
                ],

                select: {

                    id: true,

                    firstName: true,
                    lastName: true,

                    login:true,

                    email: true,
                    role: true,
                    isActive: true,

                    createdAt: true,
                    updatedAt: true,

                    _count: {
                        select: {
                            files: true,
                            customersCreated: true,
                            projectsCreated: true,
                            communications: true,
                            appointments: true,
                            timeTable: true
                        }
                    }
                }
            });


        return res.status(200).json({
            users
        });

    } catch (error) {

        console.error(
            "getUsers:",
            error
        );

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ============================================================
// GET USER
// ============================================================

export const getUser = async (req, res) => {

    try {

        const user =
            await prisma.user.findFirst({

                where: {
                    id: req.params.id,
                    deletedAt: null
                },

                select: {

                    id: true,

                    firstName: true,
                    lastName: true,

                    login: true,

                    email: true,
                    role: true,
                    isActive: true,

                    createdAt: true,
                    updatedAt: true,
                    deletedAt: true,

                    files: {
                        orderBy: {
                            uploadedAt: "desc"
                        },

                        select: {
                            id: true,
                            fileName: true,
                            mimeType: true,
                            fileSize: true,
                            uploadedAt: true,
                        }
                    },

                    _count: {
                        select: {
                            files: true,
                            customersCreated: true,
                            projectsCreated: true,
                            communications: true,
                            appointments: true,
                            timeTable: true
                        }
                    }
                }
            });


        if (!user) {

            return res.status(404).json({
                error: "Benutzer nicht gefunden"
            });
        }


        return res.status(200).json({
            user
        });

    } catch (error) {

        console.error(
            "getUser:",
            error
        );

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ============================================================
// NEW USER
// ============================================================

export const newUser = async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            login,
            email,
            password,
            role = "user"
        } = req.body;


        if (
            !email ||
            !password || !login
        ) {

            return res.status(400).json({
                error:
                    "E-Mail und Passwort sind erforderlich"
            });
        }


        if (
            password.length < 8
        ) {

            return res.status(400).json({
                error:
                    "Das Passwort muss mindestens 8 Zeichen lang sein"
            });
        }


        const normalizedEmail =
            email
                .trim()
                .toLowerCase();


        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email:
                        normalizedEmail
                }
            });

        const existingLogin =
            await prisma.user.findUnique({
                where: {
                    login:
                       login
                }
            });


        if (existingUser || existingLogin) {

            return res.status(409).json({
                error:
                    "Diese E-Mail-Adresse wird bereits verwendet"
            });
        }


        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        const user =
            await prisma.user.create({

                data: {

                    firstName:
                        firstName?.trim() ||
                        null,

                    lastName:
                        lastName?.trim() ||
                        null,

                    login: login,

                    email:
                        normalizedEmail,

                    passwordHash,

                    role,

                    isActive:
                        true
                },

                select: {

                    id: true,

                    firstName: true,
                    lastName: true,

                    login: true,

                    email: true,

                    role: true,
                    isActive: true,

                    createdAt: true,
                    updatedAt: true
                }
            });


        return res.status(201).json({
            user
        });

    } catch (error) {

        console.error(
            "newUser:",
            error
        );


        if (
            error.code === "P2002"
        ) {

            return res.status(409).json({
                error:
                    "Diese E-Mail-Adresse wird bereits verwendet"
            });
        }


        return res.status(500).json({
            error:
                "Internal server error"
        });
    }
};


// ============================================================
// UPDATE USER
// ============================================================

export const updateUser = async (
    req,
    res
) => {

    try {

        const {
            firstName,
            lastName,
            login,
            email,
            role,
            isActive
        } = req.body;


        const data = {};


        if (
            firstName !== undefined
        ) {
            data.firstName =
                firstName?.trim() || null;
        }


        if (
            lastName !== undefined
        ) {
            data.lastName =
                lastName?.trim() || null;
        }

        if (
            login !== undefined
        ) {
            if (!login.trim()) {

                return res.status(400).json({
                    error:
                        "login darf nicht leer sein"
                });
            }

            data.login =
                login?.trim() || null;
        }


        if (
            email !== undefined
        ) {

            if (!email.trim()) {

                return res.status(400).json({
                    error:
                        "E-Mail-Adresse darf nicht leer sein"
                });
            }


            data.email =
                email
                    .trim()
                    .toLowerCase();
        }


        if (
            role !== undefined
        ) {
            data.role = role;
        }


        if (
            isActive !== undefined
        ) {
            data.isActive =
                Boolean(isActive);
        }


        const user =
            await prisma.user.update({

                where: {
                    id:
                        req.params.id
                },

                data,

                select: {

                    id: true,

                    firstName: true,
                    lastName: true,

                    login: true,

                    email: true,

                    role: true,
                    isActive: true,

                    createdAt: true,
                    updatedAt: true
                }
            });


        return res.status(200).json({
            user
        });

    } catch (error) {

        console.error(
            "updateUser:",
            error
        );


        if (
            error.code === "P2002"
        ) {

            return res.status(409).json({
                error:
                    "Diese E-Mail-Adresse wird bereits verwendet"
            });
        }


        if (
            error.code === "P2025"
        ) {

            return res.status(404).json({
                error:
                    "Benutzer nicht gefunden"
            });
        }


        return res.status(500).json({
            error:
                "Internal server error"
        });
    }
};


// ============================================================
// CHANGE PASSWORD
// ============================================================

export const changeUserPassword = async (
    req,
    res
) => {

    try {

        const {
            password
        } = req.body;


        if (
            !password ||
            password.length < 8
        ) {

            return res.status(400).json({
                error:
                    "Das Passwort muss mindestens 8 Zeichen lang sein"
            });
        }


        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        await prisma.user.update({

            where: {
                id:
                    req.params.id
            },

            data: {
                passwordHash
            }
        });


        return res.status(200).json({
            message:
                "Passwort erfolgreich geändert"
        });

    } catch (error) {

        console.error(
            "changeUserPassword:",
            error
        );


        if (
            error.code === "P2025"
        ) {

            return res.status(404).json({
                error:
                    "Benutzer nicht gefunden"
            });
        }


        return res.status(500).json({
            error:
                "Internal server error"
        });
    }
};


// ============================================================
// DELETE USER
// ============================================================

export const deleteUser = async (
    req,
    res
) => {

    try {

        const userId =
            req.params.id;


        /*
         * Soft Delete
         *
         * Deine Tabelle besitzt bereits deletedAt.
         * Dadurch bleiben die vom Benutzer erzeugten
         * Daten erhalten.
         */

        const user =
            await prisma.user.update({

                where: {
                    id: userId
                },

                data: {

                    isActive:
                        false,

                    deletedAt:
                        new Date()
                },

                select: {

                    id: true,

                    firstName: true,
                    lastName: true,

                    email: true,

                    role: true,
                    isActive: true,

                    deletedAt: true
                }
            });


        return res.status(200).json({
            user
        });

    } catch (error) {

        console.error(
            "deleteUser:",
            error
        );


        if (
            error.code === "P2025"
        ) {

            return res.status(404).json({
                error:
                    "Benutzer nicht gefunden"
            });
        }


        return res.status(500).json({
            error:
                "Internal server error"
        });
    }
};