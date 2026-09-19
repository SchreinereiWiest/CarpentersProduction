import prisma from "../config/prisma.js";
import {s3Download, s3Upload} from "../config/s3.js"
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from "@aws-sdk/client-s3";
import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";

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
                (Date.now()-entry.startedAt.getTime())/1000/60
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


export const getDayEntrys = async (req, res) => {

    const [year, month, day] = req.params.date
        .split("-")
        .map(Number);

    const startOfDay = new Date(year, month - 1, day);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfNextDay = new Date(year, month - 1, day + 1);
    startOfNextDay.setHours(0, 0, 0, 0);

    console.log(startOfDay, startOfNextDay);
    
    try {

        const entries = await prisma.timeEntry.findMany({
            where: {
                startedAt: {
                    gte: startOfDay,
                    lt: startOfNextDay
                }
            },

            orderBy: {
                startedAt: "asc"
            }
        });

        console.log(entries);

        return res.json(entries);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};



export const getOpenEntrys = async (req, res) => {

    try {
        const entries = await prisma.timeEntry.findMany({

            where:{
                startedAt: null
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

                startedAt: new Date(req.body.startTime),

                endedAt: new Date(req.body.endTime),

                duration: req.body.duration,

            }

        });

        console.log(entry);

        return res.status(201).json(entry);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}


export const manualTime = async (req, res) => {

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

                duration: req.body.duration,

            }

        });

        console.log(entry);

        return res.status(201).json(entry);
    }

    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}


export const getGeneratedTimeData = async (req, res) => {

    const { id } = req.params;
    const {date} = req.params;

    
    const fileName = `weekData-${date}.json`;
        

    try {

        const file = await prisma.file.findFirst({

            where: {
                uploadedById: id,
                fileName: fileName,
                deletedAt: null
            },
            include: {
                storageObject: true
            }
        });


        // Datei existiert bereits
        if (file) {

            const command = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: file.storageObject.objectKey
                    });
            
            const downloadUrl = await getSignedUrl(
            s3Download,
            command,
            {
                expiresIn: 900
            }
            );

            return res.json({
                exists: true,
                downloadUrl,
            });
        }

        // Datei existiert noch nicht
        return res.json({
            exists: false
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Generated project data could not be loaded"
        });

    }

};


export async function createGeneratedTimeData(req,res){

    const { id, date} = req.params;
    
    const fileName = `weekData-${date}.json`;
            
    const prefix = `Time/${id}`;
    const objectKey = `${prefix}/${fileName}`;


    /*
     * JSON-Daten aus dem Request
     */
    const jsonContent = JSON.stringify(req.body);

    const body = Buffer.from(jsonContent, "utf-8");


    /*
     * --------------------------------------------------
     * 1. Datei direkt zu Garage hochladen
     * --------------------------------------------------
     */

    const command = new PutObjectCommand({

        Bucket: process.env.S3_BUCKET,

        Key: objectKey,

        Body: body,

        ContentType: "application/json"

    });


    await s3Upload.send(command);


    /*
     * --------------------------------------------------
     * 2. Prüfen, ob bereits ein File-Eintrag existiert
     * --------------------------------------------------
     */

    const existingFile = await prisma.file.findFirst({

        where: {
            uploadedById: id,
            fileName: fileName,
            deletedAt: null
        },

        include: {
            storageObject: true
        }

    });


    /*
     * --------------------------------------------------
     * 3. Noch kein File vorhanden
     * --------------------------------------------------
     */

    if (!existingFile) {

        const storageObject =
            await prisma.s3Object.create({

                data: {

                    provider: "garage",

                    bucketName:
                        process.env.S3_BUCKET,

                    objectKey:

                        objectKey,

                    endpoint:
                        process.env.S3_PUBLIC_ENDPOINT

                }

            });

        const fileEntry =
            await prisma.file.create({

                data: {

                    uploadedBy: {
                        connect: {
                            id: id
                        }
                    },

                    storageObject: {
                        connect: {
                            id: storageObject.id
                        }
                    },

                    fileName:
                        fileName,

                    mimeType:
                        "application/json",

                    fileSize:
                        body.length,

                    status:
                        "complete"

                }

            });


        return res.json({

            success: true,

            objectKey,

            fileEntry

        });

    }


    /*
     * --------------------------------------------------
     * 4. File existiert bereits
     * --------------------------------------------------
     */

    const storageObject =
        await prisma.s3Object.update({

            where: {
                id: existingFile.storageObject.id
            },

            data: {

                provider:
                    "garage",

                bucketName:
                    process.env.S3_BUCKET,

                objectKey:
                    objectKey,

                endpoint:
                    process.env.S3_PUBLIC_ENDPOINT

            }

        });


    const fileEntry =
        await prisma.file.update({

            where: {
                id: existingFile.id
            },

            data: {

                fileName:
                    fileName,

                mimeType:
                    "application/json",

                fileSize:
                    body.length,

                status:
                    "complete"

            }

        });


    return res.json({

        success: true,

        objectKey,

        fileEntry

    });

}