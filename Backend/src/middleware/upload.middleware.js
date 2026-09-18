import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";

import prisma from "../config/prisma.js";

import { s3Upload, s3Download } from "../config/s3.js"

export async function createUpload(req, res) {

    try {

        /*
         * Datei aus multipart/form-data
         */
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                error: "No file uploaded"
            });
        }


        /*
         * Formulardaten
         */
        const {
            entityId,
            entity,
            customerId,
            fileName,
            mimeType,
            fileSize
        } = req.body;

        const parsedFileSize = parseInt(fileSize, 10);


        /*
         * S3-Prefix bestimmen
         */
        let prefix = "";

        switch (entity) {

            case "project":
                prefix = `projects/${entityId}`;
                break;

            case "customer":
                prefix = `customers/${entityId}`;
                break;

            default:
                return res.status(400).json({
                    error: "Invalid entity type"
                });
        }


        /*
         * Eindeutigen Dateinamen erzeugen
         */
        const objectId = `${crypto.randomUUID()}-${fileName}`;

        const objectKey = `${prefix}/${objectId}`;


        /*
         * --------------------------------------------------
         * 1. S3Object in Datenbank anlegen
         * --------------------------------------------------
         */

        const storageObject = await prisma.s3Object.create({

            data: {

                provider: "garage",

                bucketName:
                    process.env.S3_BUCKET,

                objectKey,

                endpoint:
                    process.env.S3_PUBLIC_ENDPOINT,

            },

        });


        /*
         * --------------------------------------------------
         * 2. File-Eintrag in Datenbank anlegen
         * --------------------------------------------------
         */




        /*
         * --------------------------------------------------
         * 3. Datei zu Garage hochladen
         * --------------------------------------------------
         */

        const command = new PutObjectCommand({

            Bucket:
                process.env.S3_BUCKET,

            Key:
                objectKey,

            Body:
                file.buffer,

            ContentType:
                mimeType || file.mimetype,

        });


        await s3Upload.send(command);


        /*
         * --------------------------------------------------
         * 4. Upload erfolgreich -> Status aktualisieren
         * --------------------------------------------------
         */

        const fileEntry = await prisma.file.create({
             data: { 
                project: { 
                    connect: { 
                        id: entityId 
                    } 
                }, 
                customer: { 
                    connect: { 
                        id: customerId 
                    } 
                }, 
                storageObject: { 
                    connect: { 
                        id: storageObject.id, 
                    }, 
                }, fileName: fileName, 
                mimeType: mimeType, 
                fileSize: parsedFileSize, 
                status: "completed", 
            }, 
        });


        /*
         * --------------------------------------------------
         * 5. Antwort an Frontend
         * --------------------------------------------------
         */

        return res.json({

            success: true,

            objectKey,

            fileEntry: fileEntry

        });

    }
    catch (error) {

        console.error(
            "S3 upload failed:",
            error
        );

        return res.status(500).json({

            error:
                "File upload failed",

            message:
                error.message

        });

    }

}


export async function createDownloadUrl(req, res) {
    console.log(req.params.id);
    try {

        const file = await prisma.file.findUnique({
            where: {
                id: req.params.id
            },
            include: {
                storageObject: true,
            },
        });


        if (!file) {
            return res.status(404).json({
                message: "File not found"
            });
        }



        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: file.storageObject.objectKey
        });


        const url = await getSignedUrl(
            s3Download,
            command,
            {
                expiresIn: 900
            }
        );

        res.json({
            url
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Could not create download url"
        });
    }


}


export async function deleteFile(req, res) {

    try {

        const { fileId } = req.params;


        /*
         * --------------------------------------------------
         * 1. Datei aus Datenbank laden
         * --------------------------------------------------
         */

        const fileEntry = await prisma.file.findUnique({
            where: {
                id: fileId
            },
            include: {
                storageObject: true
            }
        });


        if (!fileEntry) {

            return res.status(404).json({
                error: "File not found"
            });

        }


        /*
         * Prüfen, ob ein S3-Objekt vorhanden ist
         */

        if (!fileEntry.storageObject) {

            return res.status(404).json({
                error: "Storage object not found"
            });

        }


        const storageObject = fileEntry.storageObject;


        /*
         * --------------------------------------------------
         * 2. Datei aus Garage löschen
         * --------------------------------------------------
         */

        const command = new DeleteObjectCommand({

            Bucket:
                storageObject.bucketName,

            Key:
                storageObject.objectKey

        });


        await s3Upload.send(command);


        /*
         * --------------------------------------------------
         * 3. File-Eintrag aus Datenbank löschen
         * --------------------------------------------------
         */

        await prisma.file.delete({

            where: {
                id: fileId
            }

        });


        /*
         * --------------------------------------------------
         * 4. S3Object aus Datenbank löschen
         * --------------------------------------------------
         */

        await prisma.s3Object.delete({

            where: {
                id: storageObject.id
            }

        });


        /*
         * --------------------------------------------------
         * 5. Antwort
         * --------------------------------------------------
         */

        return res.json({

            success: true,

            message: "File deleted successfully",

            fileId: fileId,

            objectKey: storageObject.objectKey

        });

    }
    catch (error) {

        console.error(
            "S3 delete failed:",
            error
        );


        return res.status(500).json({

            error:
                "File deletion failed",

            message:
                error.message

        });

    }

};
