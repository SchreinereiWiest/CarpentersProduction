import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";

import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";

import prisma from "../config/prisma.js";


const s3 = new S3Client({

    endpoint: process.env.S3_PUBLIC_ENDPOINT,

    region:"garage",

    forcePathStyle: true,

    credentials:{
        accessKeyId:
            process.env.S3_ACCESS_KEY,

        secretAccessKey:
            process.env.S3_SECRET_KEY
    },

    requestChecksumCalculation: "WHEN_REQUIRED",
});


export async function createUploadUrl(req,res){

    let prefix = "";

    const {
        entityId,
        entity,
        customerId,
        fileName,
        mimeType,
        fileSize
    } = req.body;

    switch (entity) {
    case "project":
        prefix = `projects/${entityId}`;
        break;

    case "customer":
        prefix = `customers/${entityId}`;
        break;
    default:
        return res.status(400).json({error:"Invalid entity type"});
    }

    const objectId = `${crypto.randomUUID()}-${fileName}`;

    const objectKey = `${prefix}/${objectId}`;


    const command = new PutObjectCommand({

        Bucket: process.env.S3_BUCKET,

        Key:objectKey,

        ContentType:mimeType

    });


    const uploadUrl =
        await getSignedUrl(
            s3,
            command,
            {
                expiresIn:900
            }
        );

    const storageObject = await prisma.s3Object.create({
    data: {
        provider: "garage",
        bucketName: process.env.S3_BUCKET,
        objectKey,
        endpoint: process.env.S3_PUBLIC_ENDPOINT,
    },
});

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
        },


                fileName: fileName,
                mimeType: mimeType,
                fileSize: fileSize,

                status: "pending",

            },
    });


    res.json({
        uploadUrl,
        objectKey,
        fileEntry
    });
}

export async function createDownloadUrl(req,res) {
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
        s3,
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