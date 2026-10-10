import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import prisma from "../config/prisma.js";
import { s3Upload } from "../config/s3.js";

const BATCH_SIZE = 25;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

const retryAt = attempts => new Date(
    Date.now() + Math.min(60 * 60 * 1000, 2 ** Math.min(attempts, 10) * 1000)
);

export async function enqueueStorageDeletions(transaction, objects) {
    if (!objects.length) return;

    await Promise.all(objects.map(object =>
        transaction.storageDeletionJob.upsert({
            where: {
                bucketName_objectKey: {
                    bucketName: object.bucketName,
                    objectKey: object.objectKey
                }
            },
            create: {
                bucketName: object.bucketName,
                objectKey: object.objectKey,
                status: "pending",
                nextAttemptAt: new Date()
            },
            update: {
                status: "pending",
                attempts: 0,
                lastError: null,
                nextAttemptAt: new Date(),
                completedAt: null
            }
        })
    ));
}

export async function processStorageDeletionJob(jobId) {
    const claimed = await prisma.storageDeletionJob.updateMany({
        where: {
            id: jobId,
            status: { in: ["pending", "failed"] },
            nextAttemptAt: { lte: new Date() }
        },
        data: {
            status: "processing",
            attempts: { increment: 1 },
            lastError: null
        }
    });

    if (claimed.count !== 1) return false;

    const job = await prisma.storageDeletionJob.findUnique({ where: { id: jobId } });

    try {
        await s3Upload.send(new DeleteObjectCommand({
            Bucket: job.bucketName,
            Key: job.objectKey
        }));

        await prisma.storageDeletionJob.update({
            where: { id: job.id },
            data: { status: "succeeded", completedAt: new Date(), lastError: null }
        });
        return true;
    } catch (error) {
        await prisma.storageDeletionJob.update({
            where: { id: job.id },
            data: {
                status: "failed",
                lastError: String(error?.message || error).slice(0, 2000),
                nextAttemptAt: retryAt(job.attempts)
            }
        });
        return false;
    }
}

export async function processStorageDeletions(objects) {
    if (!objects.length) return;

    const jobs = await prisma.storageDeletionJob.findMany({
        where: {
            OR: objects.map(object => ({
                bucketName: object.bucketName,
                objectKey: object.objectKey
            }))
        },
        select: { id: true }
    });

    await Promise.allSettled(jobs.map(job => processStorageDeletionJob(job.id)));
}

export async function reconcileStorageDeletions() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);

    await prisma.storageDeletionJob.updateMany({
        where: { status: "processing", updatedAt: { lt: staleBefore } },
        data: { status: "failed", nextAttemptAt: new Date(), lastError: "Worker interrupted" }
    });

    const jobs = await prisma.storageDeletionJob.findMany({
        where: {
            status: { in: ["pending", "failed"] },
            nextAttemptAt: { lte: new Date() }
        },
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
        select: { id: true }
    });

    await Promise.allSettled(jobs.map(job => processStorageDeletionJob(job.id)));
}

export function startStorageDeletionWorker() {
    const run = () => reconcileStorageDeletions().catch(error => {
        console.error("Storage deletion reconciliation failed:", error);
    });

    const initialRun = setTimeout(run, 1000);
    const interval = setInterval(run, 60 * 1000);
    initialRun.unref();
    interval.unref();
}
