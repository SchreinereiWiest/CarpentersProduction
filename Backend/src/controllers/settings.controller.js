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

export const getSettingsData = async (req, res) => {

    const {name} = req.params;

    let fileName = "";

    switch(name) {
        case "cabinet": 
        fileName = "settings-cabinet.json";
        break;

        case "nesting": 
        fileName = "settings-nesting.json";
        break;

        case "cnc":
        fileName = "settings-cnc.json";
        break;

        case "cache":
        fileName = "settings-cache.json";
        break;

      default:
        return res.status(400).json({
            message: "Invalid settings name"
        });
    }

    try {

        const file = await prisma.file.findFirst({

            where: {
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


export async function createSettingsData(req,res){

    const {name } = req.params;

    let fileName = "";

    switch(name) {
        case "cabinet": 
        fileName = "settings-cabinet.json";
        break;

        case "nesting": 
        fileName = "settings-nesting.json";
        break;

        case "cnc":
        fileName = "settings-cnc.json";
        break;

        case "cache":
        fileName = "settings-cache.json";
        break;

      default:
        return res.status(400).json({
            message: "Invalid settings name"
        });
    }

    const prefix = `settings`;
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