import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import prisma from "../../infrastructure/database/prisma.js";
import { s3Download, s3Upload } from "../../infrastructure/storage/s3.js";
import {
    enqueueStorageDeletions,
    processStorageDeletions
} from "../../infrastructure/storage/storage-deletion.service.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { publishFileChange } from "../files/file-change-events.service.js";

const pageNumber = value => Math.max(1, Number.parseInt(value, 10) || 1);
const pageSize = value => Math.min(100, Math.max(10, Number.parseInt(value, 10) || 50));

const tenantObjectPrefix = () => `tenants/${getTenantId()}/`;
const tenantStoragePath = objectKey => objectKey.startsWith(tenantObjectPrefix())
    ? objectKey.slice(tenantObjectPrefix().length)
    : objectKey;

const objectKeyFolderFilter = folderPath => ({
    OR: [
        { objectKey: { startsWith: `${tenantObjectPrefix()}${folderPath}/` } },
        // Vor der Tenant-Migration gespeicherte Objekte besitzen noch Keys wie
        // projects/<id>/... oder settings/... . Die DB-Tenantgrenze bleibt aktiv.
        { objectKey: { startsWith: `${folderPath}/` } }
    ]
});

async function listGarageObjects() {
    const objects = [];
    let continuationToken;
    do {
        const response = await s3Upload.send(new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET,
            Prefix: `tenants/${getTenantId()}/`,
            ContinuationToken: continuationToken
        }));
        objects.push(...(response.Contents || []));
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
    return objects;
}

async function garageOrphans(garageObjects) {
    const tracked = await prisma.s3Object.findMany({ select: { objectKey: true } });
    const trackedKeys = new Set(tracked.map(item => item.objectKey));
    // Backup-Archive werden in tenant_backups statt s3_objects verwaltet. Der
    // gesamte reservierte Prefix bleibt auch während einer Erstellung geschützt.
    const backupPrefix = `tenants/${getTenantId()}/backups/`;
    return garageObjects.filter(object => object.Key
        && !trackedKeys.has(object.Key)
        && !object.Key.startsWith(backupPrefix));
}

const toClientObject = object => ({
    id: object.id,
    objectKey: object.objectKey,
    path: tenantStoragePath(object.objectKey),
    provider: object.provider,
    bucketName: object.bucketName,
    uploadedAt: object.uploadedAt,
    storageClass: object.storageClass,
    archived: object.isArchived,
    files: object.files.map(file => ({
        id: file.id,
        name: file.originalName || file.fileName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.fileSize,
        category: file.category,
        uploadedAt: file.uploadedAt,
        project: file.project ? { id: file.project.id, title: file.project.title } : null,
        customer: file.customer ? {
            id: file.customer.id,
            name: file.customer.companyName
                || [file.customer.firstName, file.customer.lastName].filter(Boolean).join(" ")
        } : null
    })),
    projectStorage: object.projectStorage.map(item => ({
        id: item.id,
        dataType: item.dataType,
        schemaVersion: item.schemaVersion,
        project: { id: item.project.id, title: item.project.title }
    })),
    linked: object.files.length + object.projectStorage.length > 0
});

export async function getStorageOverview(req, res) {
    const page = pageNumber(req.query.page);
    const take = pageSize(req.query.pageSize);
    const search = String(req.query.search || "").trim();
    const prefix = String(req.query.prefix || "").replace(/^\/+|\.\.|\\/g, "").trim();
    const filters = [];
    if (prefix) filters.push(objectKeyFolderFilter(prefix));
    if (search) filters.push({ OR: [
            { objectKey: { contains: search, mode: "insensitive" } },
            { files: { some: { fileName: { contains: search, mode: "insensitive" } } } },
            { files: { some: { originalName: { contains: search, mode: "insensitive" } } } }
        ] });
    const where = filters.length ? { AND: filters } : {};

    const [total, objects, allTrackedObjects, fileStats, projectStorageCount, orphanCount, pendingDeletionCount, garageObjects] = await Promise.all([
        prisma.s3Object.count({ where }),
        prisma.s3Object.findMany({
            where,
            orderBy: { uploadedAt: "desc" },
            skip: (page - 1) * take,
            take,
            include: {
                files: {
                    select: {
                        id: true,
                        fileName: true,
                        originalName: true,
                        mimeType: true,
                        fileSize: true,
                        category: true,
                        uploadedAt: true,
                        project: { select: { id: true, title: true } },
                        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } }
                    }
                },
                projectStorage: {
                    select: {
                        id: true,
                        dataType: true,
                        schemaVersion: true,
                        project: { select: { id: true, title: true } }
                    }
                }
            }
        }),
        prisma.s3Object.findMany({
            select: {
                objectKey: true,
                _count: { select: { files: true, projectStorage: true } }
            }
        }),
        prisma.file.aggregate({ _count: { _all: true }, _sum: { fileSize: true } }),
        prisma.projectStorage.count(),
        prisma.s3Object.count({ where: { files: { none: {} }, projectStorage: { none: {} } } }),
        prisma.storageDeletionJob.count({ where: { status: { in: ["pending", "processing", "failed"] } } }),
        listGarageObjects()
    ]);
    const untrackedGarageObjects = await garageOrphans(garageObjects);
    const directoryPrefix = prefix ? `${prefix}/` : "";
    const folders = new Map();
    const hierarchyObjects = [
        ...allTrackedObjects.map(object => ({
            path: tenantStoragePath(object.objectKey),
            count: Math.max(1, object._count.files + object._count.projectStorage)
        })),
        ...untrackedGarageObjects.map(object => ({
            path: tenantStoragePath(object.Key),
            count: 1
        }))
    ];
    for (const object of hierarchyObjects) {
        if (!object.path.startsWith(directoryPrefix)) continue;
        const relativePath = object.path.slice(directoryPrefix.length);
        const [folderName, ...remainingPath] = relativePath.split("/");
        if (!folderName || !remainingPath.length || (!prefix && folderName === "backups")) continue;
        const folder = folders.get(folderName) || {
            name: folderName,
            path: [prefix, folderName].filter(Boolean).join("/"),
            count: 0,
            size: 0
        };
        folder.count += object.count;
        folders.set(folderName, folder);
    }

    res.json({
        summary: {
            objectCount: allTrackedObjects.length + untrackedGarageObjects.length,
            fileCount: fileStats._count._all,
            trackedBytes: fileStats._sum.fileSize || 0,
            projectStorageCount,
            orphanCount: orphanCount + untrackedGarageObjects.length,
            untrackedGarageCount: untrackedGarageObjects.length,
            pendingDeletionCount
        },
        folders: [...folders.values()].sort((left, right) => left.name.localeCompare(right.name, "de")),
        objects: objects.map(toClientObject),
        pagination: { page, pageSize: take, total, pages: Math.max(1, Math.ceil(total / take)) }
    });
}

export async function downloadStorageObject(req, res) {
    const object = await prisma.s3Object.findUnique({ where: { id: req.params.id } });
    if (!object) return res.status(404).json({ message: "Storage object not found" });

    const url = await getSignedUrl(s3Download, new GetObjectCommand({
        Bucket: object.bucketName,
        Key: object.objectKey
    }), { expiresIn: 900 });

    return res.json({ url, expiresIn: 900 });
}

export async function deleteStorageObject(req, res) {
    const object = await prisma.s3Object.findUnique({
        where: { id: req.params.id },
        include: { files: { select: { id: true } }, projectStorage: { select: { id: true } } }
    });
    if (!object) return res.status(404).json({ message: "Storage object not found" });

    const deletion = { id: object.id, bucketName: object.bucketName, objectKey: object.objectKey };
    await prisma.$transaction(async transaction => {
        await transaction.file.deleteMany({ where: { storageObjectId: object.id } });
        await transaction.projectStorage.deleteMany({ where: { storageObjectId: object.id } });
        await enqueueStorageDeletions(transaction, [deletion]);
        await transaction.s3Object.delete({ where: { id: object.id } });
        await transaction.auditLog.create({
            data: {
                actorUserId: req.user.id,
                action: "storage.object.delete",
                entityType: "S3Object",
                entityId: object.id,
                metadata: {
                    objectKey: object.objectKey,
                    files: object.files.length,
                    projectStorage: object.projectStorage.length
                },
                ipAddress: req.ip || null,
                userAgent: req.get("user-agent") || null
            }
        });
    });

    void processStorageDeletions([deletion]).catch(error => {
        console.error("Immediate storage deletion failed:", error);
    });
    return res.json({ success: true, deletionScheduled: true });
}

function normalizeFolderPath(value) {
    const folderPath = String(value || "").trim().replace(/^\/+|\/+$/g, "");
    if (!folderPath
        || folderPath.includes("..")
        || folderPath.includes("\\")
        || /[\u0000-\u001f]/.test(folderPath)
        || folderPath.split("/").some(part => !part)) {
        return null;
    }
    return folderPath;
}

export async function deleteStorageFolder(req, res) {
    const folderPath = normalizeFolderPath(req.body?.path);
    if (!folderPath) return res.status(400).json({ message: "Ungültiger Ordnerpfad" });
    if (folderPath.split("/")[0] === "backups") {
        return res.status(400).json({ message: "Der Backup-Ordner wird über die Backup-Verwaltung gelöscht." });
    }
    if (req.body?.confirmation !== "ORDNER LÖSCHEN") {
        return res.status(400).json({ message: "Bestätigung fehlt" });
    }

    const objectPrefix = `${tenantObjectPrefix()}${folderPath}/`;
    const [registeredObjects, garageObjects] = await Promise.all([
        prisma.s3Object.findMany({
            where: objectKeyFolderFilter(folderPath),
            include: {
                files: { select: { id: true, projectId: true, fileName: true, serverVersion: true } },
                projectStorage: { select: { id: true } }
            }
        }),
        listGarageObjects()
    ]);

    const registeredKeys = new Set(registeredObjects.map(object => object.objectKey));
    const untrackedObjects = garageObjects.filter(object => object.Key?.startsWith(objectPrefix)
        && !registeredKeys.has(object.Key));
    if (!registeredObjects.length && !untrackedObjects.length) {
        return res.status(404).json({ message: "Ordner nicht gefunden oder bereits leer" });
    }

    const deletionObjects = registeredObjects.map(object => ({
        id: object.id,
        bucketName: object.bucketName,
        objectKey: object.objectKey
    }));
    const fileChanges = registeredObjects.flatMap(object => object.files);

    if (registeredObjects.length) {
        const ids = registeredObjects.map(object => object.id);
        await prisma.$transaction(async transaction => {
            await transaction.file.deleteMany({ where: { storageObjectId: { in: ids } } });
            await transaction.projectStorage.deleteMany({ where: { storageObjectId: { in: ids } } });
            await enqueueStorageDeletions(transaction, deletionObjects);
            await transaction.s3Object.deleteMany({ where: { id: { in: ids } } });
            await transaction.auditLog.create({
                data: {
                    actorUserId: req.user.id,
                    action: "storage.folder.delete",
                    entityType: "S3Object",
                    metadata: {
                        folderPath,
                        registeredObjects: registeredObjects.length,
                        untrackedObjects: untrackedObjects.length,
                        files: fileChanges.length
                    },
                    ipAddress: req.ip || null,
                    userAgent: req.get("user-agent") || null
                }
            });
        });
        void processStorageDeletions(deletionObjects).catch(error => {
            console.error("Immediate folder deletion failed:", error);
        });
    }

    const untrackedResults = await Promise.allSettled(untrackedObjects.map(object => s3Upload.send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: object.Key })
    )));
    const failedObjects = untrackedResults.filter(result => result.status === "rejected").length;

    if (!registeredObjects.length) {
        await prisma.auditLog.create({
            data: {
                actorUserId: req.user.id,
                action: "storage.folder.delete",
                entityType: "S3Object",
                metadata: {
                    folderPath,
                    registeredObjects: 0,
                    untrackedObjects: untrackedObjects.length,
                    failedObjects
                },
                ipAddress: req.ip || null,
                userAgent: req.get("user-agent") || null
            }
        });
    }

    for (const file of fileChanges) {
        publishFileChange({
            tenantId: req.tenant.id,
            action: "deleted",
            resourceType: "asset",
            fileId: file.id,
            projectId: file.projectId,
            fileName: file.fileName,
            serverVersion: file.serverVersion
        });
    }

    return res.json({
        success: failedObjects === 0,
        folderPath,
        deletedObjects: registeredObjects.length + untrackedObjects.length - failedObjects,
        deletedFiles: fileChanges.length,
        failedObjects
    });
}

export async function cleanupOrphanedObjects(req, res) {
    const [objects, garageObjects] = await Promise.all([prisma.s3Object.findMany({
        where: { files: { none: {} }, projectStorage: { none: {} } },
        select: { id: true, bucketName: true, objectKey: true }
    }), listGarageObjects()]);
    const untracked = await garageOrphans(garageObjects);

    if (objects.length) {
        await prisma.$transaction(async transaction => {
            await enqueueStorageDeletions(transaction, objects);
            await transaction.s3Object.deleteMany({ where: { id: { in: objects.map(item => item.id) } } });
            await transaction.auditLog.create({
                data: {
                    actorUserId: req.user.id,
                    action: "storage.cleanup",
                    entityType: "S3Object",
                    metadata: { deletedObjects: objects.length },
                    ipAddress: req.ip || null,
                    userAgent: req.get("user-agent") || null
                }
            });
        });
        void processStorageDeletions(objects).catch(error => {
            console.error("Immediate orphan cleanup failed:", error);
        });
    }

    const directResults = await Promise.allSettled(untracked.map(object => s3Upload.send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: object.Key })
    )));
    const directFailures = directResults.filter(result => result.status === "rejected").length;

    if (untracked.length) {
        await prisma.auditLog.create({
            data: {
                actorUserId: req.user.id,
                action: "storage.cleanup.untracked",
                entityType: "S3Object",
                metadata: { deletedObjects: untracked.length - directFailures, failedObjects: directFailures },
                ipAddress: req.ip || null,
                userAgent: req.get("user-agent") || null
            }
        });
    }

    return res.json({
        success: directFailures === 0,
        deletedObjects: objects.length + untracked.length - directFailures,
        failedObjects: directFailures
    });
}
