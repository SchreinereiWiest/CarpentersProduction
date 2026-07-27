import bcrypt from "bcrypt";

import prisma from "../config/prisma.js";

const createUser = async () => {

    const password = "admin";

    const passwordHash = await bcrypt.hash(
        password,
        12
    );

    const user = await prisma.user.create({

        data: {

            email: "admin",

            passwordHash,

            role: "admin",

            isActive: true,
        },
    });

    console.log(user);

};

createUser()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });