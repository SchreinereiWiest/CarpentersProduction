import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";

export const s3 = new S3Client({

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