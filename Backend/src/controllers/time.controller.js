import prisma from "../config/prisma.js";

export const startTime = async (req, res) => {

    try {
        const entry = await prisma.timeEntry.create({

            data: {

                project: {
                    connect: {
                        id: req.params.id
                    }
                },

                user: {
                    connect: {
                        id: req.body.userId
                    }
                },

                workType: req.body.workType,

                startedAt: new Date(),
            }

        });

        return res.status(201).json(entry);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}

export const stopTime = async (req, res) => {

    try {
        const entry = await prisma.timeEntry.findUnique({
    where:{
        id:req.params.id
    }
        });
        let duration = 0
        try {
        duration =
            Math.floor(
                (Date.now()-entry.startedAt.getTime())/1000
            );
        } catch {
            duration = 1;
        }

        await prisma.timeEntry.update({

            where:{
                id:req.params.id
            },

            data:{

                endedAt:new Date(),

                duration

            }

        });

        return res.status(201).json(entry);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}

export const getTime = async (req, res) => {

    try {
        const entries = await prisma.timeEntry.findMany({

            where:{
                projectId:req.params.id
            },

            orderBy:{
                createdAt:"desc"
            }

        });

    return res.json(entries);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}


export const newTime = async (req, res) => {

    try {

        const entry = await prisma.timeEntry.create({

            data: {

                project: {
                    connect: {
                        id: req.params.id
                    }
                },

                user: {
                    connect: {
                        id: req.body.userId
                    }
                },

                workType: req.body.workType,

                startedAt: req.body.startTime,

                endedAt: req.body.endTime,

                duration: req.body.duration,

            }

        });

        return res.status(201).json(entry);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}