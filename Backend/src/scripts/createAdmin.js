import bcrypt from "bcrypt";
import "dotenv/config";

import prisma from "../config/prisma.js";

const createUser = async () => {

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const login = process.env.BOOTSTRAP_ADMIN_LOGIN;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !login || !password || password.length < 12) {
        throw new Error(
            "BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_LOGIN und ein mindestens 12 Zeichen langes BOOTSTRAP_ADMIN_PASSWORD sind erforderlich"
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        12
    );

    const user = await prisma.user.create({

        data: {

            email,

            login,

            passwordHash,

            role: "admin",

            isActive: true,
        },

        select: {
            id: true,
            email: true,
            login: true,
            role: true,
            isActive: true
        }
    });

    console.log(user);

};

createUser()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
