import crypto from "crypto";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import { PassThrough } from "stream";
import { pipeline } from "stream/promises";
import { createGunzip, createGzip } from "zlib";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import tar from "tar-stream";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";
import { s3Download, s3Upload } from "../../infrastructure/storage/s3.js";
import {
    BACKUP_TABLES,
    BACKUP_TYPES,
    backupTables,
    DATABASE_BACKUP,
    FULL_BACKUP,
    prepareShopRestore,
    SHOP_BACKUP_TABLES,
    SHOP_DATABASE_BACKUP
} from "./storage-backup.policy.js";

const BACKUP_FORMAT = "carpenters-production-tenant";
const BACKUP_VERSION = 1;
const MANIFEST_PATH = "manifest.json";
const DATABASE_PATH = "database.json";
const MAX_MANIFEST_SIZE = 10 * 1024 * 1024;
const MAX_DATABASE_SIZE = 512 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 100000;
const RESTORE_ORDER = [
    "tenant_secrets",
    "customers",
    "customer_addresses",
    "projects",
    "communications",
    "appointments",
    "s3_objects",
    "files",
    "project_storage",
    "suppliers",
    "materials",
    "shop_configurations",
    "shop_article_groups",
    "shop_articles",
    "shop_hardware_mappings",
    "time_entries",
    "calculation_snapshots",
    "management_periods",
    "management_transactions",
    "management_payments",
    "management_assets",
    "management_loans",
    "management_repayments",
    "audit_logs"
];

const DELETE_ORDER = [...RESTORE_ORDER].reverse();

const backupExtension = backupType => {
    if (backupType === DATABASE_BACKUP) return "cdbbackup";
    if (backupType === SHOP_DATABASE_BACKUP) return "cshopbackup";
    return "cbackup";
};

const backupDefaultName = backupType => {
    if (backupType === DATABASE_BACKUP) return "Datenbank-Backup";
    if (backupType === SHOP_DATABASE_BACKUP) return "Shop-Datenbank-Backup";
    return "Manuelles Backup";
};

function safeName(value) {
    return String(value || "Manuelles Backup")
        .trim()
        .slice(0, 120)
        .replace(/[\u0000-\u001f]/g, "") || "Manuelles Backup";
}

function backupForClient(backup) {
    return {
        ...backup,
        fileSize: backup.fileSize == null ? null : Number(backup.fileSize)
    };
}

function sendArchiveEntry(pack, header, body) {
    return new Promise((resolve, reject) => {
        const entry = pack.entry(header, error => error ? reject(error) : resolve());
        if (Buffer.isBuffer(body) || typeof body === "string") {
            entry.end(body);
            return;
        }
        pipeline(body, entry).catch(reject);
    });
}

async function tenantDatabaseSnapshot(tablesToExport) {
    const tenantId = getTenantId();
    return prisma.$transaction(async transaction => {
        const tables = {};
        for (const table of tablesToExport) {
            const [result] = await transaction.$queryRawUnsafe(
                `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) AS data FROM "${table}" t WHERE tenant_id = $1::uuid`,
                tenantId
            );
            tables[table] = result?.data || [];
        }
        return { tenantId, tables };
    }, { isolationLevel: "RepeatableRead", timeout: 120000 });
}

async function sha256(filePath) {
    const hash = crypto.createHash("sha256");
    for await (const chunk of createReadStream(filePath)) hash.update(chunk);
    return hash.digest("hex");
}

async function createArchive(filePath, tenant, snapshot, backupType) {
    const tablesToExport = backupTables(backupType);
    const objects = snapshot.tables.s3_objects || [];
    const binaryEntries = backupType === FULL_BACKUP ? objects.map(object => ({
        id: object.id,
        archivePath: `objects/${object.id}`,
        bucketName: object.bucket_name,
        objectKey: object.object_key
    })) : [];
    const manifest = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        backupType,
        tenantId: tenant.id,
        tenantName: tenant.name,
        exportedAt: new Date().toISOString(),
        tables: Object.fromEntries(tablesToExport.map(table => [table, snapshot.tables[table]?.length || 0])),
        excluded: ["tenants", "tenant_memberships", "tenant_licenses", "users", "tenant_backups", "storage_deletion_jobs", "sync_mutations"],
        binaryEntries
    };

    const pack = tar.pack();
    const output = pipeline(pack, createGzip({ level: 6 }), createWriteStream(filePath));
    const manifestBody = Buffer.from(JSON.stringify(manifest), "utf8");
    const databaseBody = Buffer.from(JSON.stringify({ tenantId: tenant.id, tables: snapshot.tables }), "utf8");

    await sendArchiveEntry(pack, { name: MANIFEST_PATH, size: manifestBody.length }, manifestBody);
    await sendArchiveEntry(pack, { name: DATABASE_PATH, size: databaseBody.length }, databaseBody);

    for (const entry of binaryEntries) {
        const object = await s3Download.send(new GetObjectCommand({
            Bucket: entry.bucketName,
            Key: entry.objectKey
        }));
        await sendArchiveEntry(pack, {
            name: entry.archivePath,
            size: Number(object.ContentLength || 0)
        }, object.Body);
    }

    pack.finalize();
    await output;
    return manifest;
}

export async function listBackups(_req, res) {
    const backups = await prisma.tenantBackup.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { createdBy: { select: { id: true, login: true, email: true } } }
    });
    res.json({ backups: backups.map(backupForClient) });
}

async function createBackupByType(req, res, backupType) {
    const name = safeName(req.body?.name || backupDefaultName(backupType));
    const backup = await prisma.tenantBackup.create({
        data: { name, backupType, createdById: req.user.id, status: "creating" }
    });
    const extension = backupExtension(backupType);
    const tempPath = path.join(os.tmpdir(), `tenant-backup-${backup.id}.${extension}`);

    try {
        const tablesToExport = backupTables(backupType);
        const snapshot = await tenantDatabaseSnapshot(tablesToExport);
        const manifest = await createArchive(tempPath, req.tenant, snapshot, backupType);
        const stats = await fs.stat(tempPath);
        const checksum = await sha256(tempPath);
        const objectKey = `tenants/${getTenantId()}/backups/${backup.id}.${extension}`;

        await s3Upload.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: objectKey,
            Body: createReadStream(tempPath),
            ContentLength: stats.size,
            ContentType: "application/gzip",
            Metadata: { checksum, format: BACKUP_FORMAT, version: String(BACKUP_VERSION), type: backupType }
        }));

        const completed = await prisma.tenantBackup.update({
            where: { id: backup.id },
            data: {
                status: "completed",
                bucketName: process.env.S3_BUCKET,
                objectKey,
                fileSize: BigInt(stats.size),
                checksum,
                fileCount: manifest.binaryEntries.length,
                tableCount: tablesToExport.length,
                completedAt: new Date(),
                error: null
            },
            include: { createdBy: { select: { id: true, login: true, email: true } } }
        });

        await prisma.auditLog.create({
            data: {
                actorUserId: req.user.id,
                action: backupType === DATABASE_BACKUP
                    ? "storage.database-backup.create"
                    : backupType === SHOP_DATABASE_BACKUP
                        ? "storage.shop-database-backup.create"
                        : "storage.backup.create",
                entityType: "TenantBackup",
                entityId: backup.id,
                metadata: { backupType, fileCount: manifest.binaryEntries.length, fileSize: stats.size },
                ipAddress: req.ip || null,
                userAgent: req.get("user-agent") || null
            }
        });
        return res.status(201).json({ backup: backupForClient(completed) });
    } catch (error) {
        console.error("Tenant backup failed:", error);
        await prisma.tenantBackup.update({
            where: { id: backup.id },
            data: { status: "failed", error: String(error.message || error).slice(0, 2000) }
        }).catch(() => {});
        return res.status(500).json({ message: "Backup konnte nicht erstellt werden." });
    } finally {
        await fs.unlink(tempPath).catch(() => {});
    }
}

export const createBackup = (req, res) => createBackupByType(req, res, FULL_BACKUP);
export const createDatabaseBackup = (req, res) => createBackupByType(req, res, DATABASE_BACKUP);
export const createShopDatabaseBackup = (req, res) => createBackupByType(req, res, SHOP_DATABASE_BACKUP);

export async function downloadBackup(req, res) {
    const backup = await prisma.tenantBackup.findUnique({ where: { id: req.params.id } });
    if (!backup?.objectKey || backup.status !== "completed") {
        return res.status(404).json({ message: "Backup not found" });
    }
    const url = await getSignedUrl(s3Download, new GetObjectCommand({
        Bucket: backup.bucketName,
        Key: backup.objectKey
    }), { expiresIn: 900 });
    const extension = backupExtension(backup.backupType || FULL_BACKUP);
    return res.json({ url, fileName: `${backup.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}.${extension}` });
}

async function readEntry(stream, maximum) {
    const chunks = [];
    let length = 0;
    for await (const chunk of stream) {
        length += chunk.length;
        if (length > maximum) throw new Error("Backup entry is too large");
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}

function validateArchive(manifest, database, expectedType = null) {
    const tenantId = getTenantId();
    if (manifest?.format !== BACKUP_FORMAT || manifest?.version !== BACKUP_VERSION) {
        throw new Error("Ungültiges oder nicht unterstütztes Backup-Format");
    }
    const backupType = manifest.backupType || FULL_BACKUP;
    if (!BACKUP_TYPES.has(backupType) || (expectedType && backupType !== expectedType)) {
        if (expectedType === DATABASE_BACKUP) throw new Error("Die Datei ist kein Datenbank-Backup");
        if (expectedType === SHOP_DATABASE_BACKUP) throw new Error("Die Datei ist kein Shop-Datenbank-Backup");
        throw new Error("Die Datei ist kein vollständiges Backup");
    }
    if (!manifest.tenantId || manifest.tenantId !== database?.tenantId) {
        throw new Error("Die Tenant-Angaben im Backup stimmen nicht überein");
    }
    // Nur der Shop-Katalog ist für den Transfer zwischen Unternehmen gedacht.
    // Alle übrigen Restore-Typen bleiben strikt an ihren Ursprungstenant gebunden.
    if (backupType !== SHOP_DATABASE_BACKUP && manifest.tenantId !== tenantId) {
        throw new Error("Das Backup gehört zu einem anderen Unternehmen");
    }
    const requiredTables = backupTables(backupType);
    if (!database.tables || requiredTables.some(table => !Array.isArray(database.tables[table]))) {
        throw new Error("Der Datenbank-Snapshot ist unvollständig");
    }
    if (backupType === SHOP_DATABASE_BACKUP
        && Object.keys(database.tables).some(table => !SHOP_BACKUP_TABLES.includes(table))) {
        throw new Error("Das Shop-Backup enthält nicht erlaubte Datenbanktabellen");
    }
    if (!Array.isArray(manifest.binaryEntries)) throw new Error("Die Dateiliste ist ungültig");
    const paths = new Set();
    for (const entry of manifest.binaryEntries) {
        if (!/^objects\/[a-f0-9-]+$/i.test(entry.archivePath)
            || paths.has(entry.archivePath)
            || !String(entry.objectKey).startsWith(`tenants/${manifest.tenantId}/`)) {
            throw new Error("Das Backup enthält einen ungültigen Dateipfad");
        }
        paths.add(entry.archivePath);
    }
    if (backupType !== FULL_BACKUP && manifest.binaryEntries.length) {
        throw new Error("Ein Datenbank-Backup darf keine Garage-Dateien enthalten");
    }
    return backupType;
}

const RESTORE_VALIDATED = "RESTORE_VALIDATION_ROLLBACK";

async function replaceTenantDatabase(database, req, backupType, { validateOnly = false } = {}) {
    const tenantId = getTenantId();
    let tables = database.tables;
    if (backupType === SHOP_DATABASE_BACKUP) {
        tables = prepareShopRestore(database, tenantId);
    } else {
        // Ein Restore auf einer anderen Storage-Konfiguration soll die lokale
        // Bucket-/Endpoint-Konfiguration verwenden, nicht Werte aus dem Archiv.
        tables = {
            ...database.tables,
            s3_objects: database.tables.s3_objects.map(object => ({
                ...object,
                tenant_id: tenantId,
                bucket_name: process.env.S3_BUCKET,
                endpoint: process.env.S3_PUBLIC_ENDPOINT || null
            }))
        };
    }

    await prisma.$transaction(async transaction => {
        if (backupType === SHOP_DATABASE_BACKUP) {
            for (const table of ["shop_hardware_mappings", "shop_articles", "shop_article_groups", "shop_configurations"]) {
                await transaction.$executeRawUnsafe(`DELETE FROM "${table}" WHERE tenant_id = $1::uuid`, tenantId);
            }
            for (const table of SHOP_BACKUP_TABLES) {
                const rows = tables[table];
                if (!rows.length) continue;
                if (table === "suppliers") {
                    await transaction.$executeRawUnsafe(
                        `INSERT INTO "suppliers" SELECT * FROM json_populate_recordset(NULL::"suppliers", $1::json)
                         ON CONFLICT ("id") DO UPDATE SET
                           "name" = EXCLUDED."name",
                           "external_id" = EXCLUDED."external_id",
                           "procurement_type" = EXCLUDED."procurement_type",
                           "procurement_config" = EXCLUDED."procurement_config",
                           "updated_at" = EXCLUDED."updated_at"`,
                        JSON.stringify(rows)
                    );
                } else {
                    await transaction.$executeRawUnsafe(
                        `INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json)`,
                        JSON.stringify(rows)
                    );
                }
            }
        } else {
            for (const table of DELETE_ORDER) {
                await transaction.$executeRawUnsafe(`DELETE FROM "${table}" WHERE tenant_id = $1::uuid`, tenantId);
            }
            for (const table of RESTORE_ORDER) {
                const rows = tables[table];
                if (!rows.length) continue;
                await transaction.$executeRawUnsafe(
                    `INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json)`,
                    JSON.stringify(rows)
                );
            }
        }
        if (validateOnly) {
            const rollback = new Error(RESTORE_VALIDATED);
            rollback.code = RESTORE_VALIDATED;
            throw rollback;
        }
        await transaction.auditLog.create({
            data: {
                actorUserId: req.user.id,
                action: backupType === SHOP_DATABASE_BACKUP
                    ? "storage.shop-database-backup.restore"
                    : "storage.backup.restore",
                entityType: "Tenant",
                entityId: tenantId,
                metadata: { backupType, restoredAt: new Date().toISOString() },
                ipAddress: req.ip || null,
                userAgent: req.get("user-agent") || null
            }
        });
    }, { timeout: 180000 }).catch(error => {
        if (validateOnly && (error.code === RESTORE_VALIDATED || error.message === RESTORE_VALIDATED)) return;
        throw error;
    });
}

async function restoreArchive(filePath, req, expectedType = null) {
    const extract = tar.extract();
    const uploadedPaths = new Set();
    let manifest = null;
    let database = null;
    let entryCount = 0;
    let processingError = null;
    let backupType = null;
    const previousObjects = await prisma.s3Object.findMany({
        select: { bucketName: true, objectKey: true }
    });

    extract.on("entry", (header, stream, next) => {
        stream.on("error", error => { if (!processingError) processingError = error; });
        (async () => {
            entryCount += 1;
            if (entryCount > MAX_ARCHIVE_ENTRIES) throw new Error("Das Backup enthält zu viele Einträge");

            if (header.name === MANIFEST_PATH && !manifest) {
                if (header.size > MAX_MANIFEST_SIZE) throw new Error("Das Backup-Manifest ist zu groß");
                manifest = JSON.parse(await readEntry(stream, MAX_MANIFEST_SIZE));
                next();
                return;
            }
            if (header.name === DATABASE_PATH && manifest && !database) {
                if (header.size > MAX_DATABASE_SIZE) throw new Error("Der Datenbank-Snapshot ist zu groß");
                database = JSON.parse(await readEntry(stream, MAX_DATABASE_SIZE));
                backupType = validateArchive(manifest, database, expectedType);
                // Prüft Relationen, Datentypen und Fremdschlüssel vollständig in
                // einer zurückgerollten Transaktion, bevor Dateien überschrieben werden.
                await replaceTenantDatabase(database, null, backupType, { validateOnly: true });
                next();
                return;
            }
            if (!manifest || !database) throw new Error("Manifest und Datenbank müssen am Anfang des Backups stehen");

            const metadata = manifest.binaryEntries.find(item => item.archivePath === header.name);
            if (!metadata || uploadedPaths.has(header.name)) throw new Error("Unerwarteter Backup-Eintrag");
            const uploadBody = new PassThrough();
            const bridge = pipeline(stream, uploadBody);
            try {
                await s3Upload.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: metadata.objectKey,
                    Body: uploadBody,
                    ContentLength: Number(header.size),
                    ContentType: "application/octet-stream"
                }));
                await bridge;
            } catch (error) {
                uploadBody.destroy();
                await bridge.catch(() => {});
                throw error;
            }
            uploadedPaths.add(header.name);
            next();
        })().catch(error => {
            processingError = error;
            stream.resume();
            extract.destroy(error);
        });
    });

    await pipeline(createReadStream(filePath), createGunzip(), extract);
    if (processingError) throw processingError;
    backupType = validateArchive(manifest, database, expectedType);
    if (uploadedPaths.size !== manifest.binaryEntries.length) {
        throw new Error("Das Backup enthält nicht alle erwarteten Dateien");
    }
    await replaceTenantDatabase(database, req, backupType);
    if (backupType === FULL_BACKUP) {
        const restoredKeys = new Set(manifest.binaryEntries.map(entry => entry.objectKey));
        const obsoleteObjects = previousObjects.filter(object => !restoredKeys.has(object.objectKey));
        await Promise.allSettled(obsoleteObjects.map(object => s3Upload.send(new DeleteObjectCommand({
            Bucket: object.bucketName,
            Key: object.objectKey
        }))));
    }
    return manifest;
}

async function downloadBackupToFile(backup, filePath) {
    const object = await s3Download.send(new GetObjectCommand({
        Bucket: backup.bucketName,
        Key: backup.objectKey
    }));
    await pipeline(object.Body, createWriteStream(filePath));
}

export async function restoreBackup(req, res) {
    if (req.body?.confirmation !== "WIEDERHERSTELLEN") {
        return res.status(400).json({ message: "Bestätigung fehlt" });
    }
    const backup = await prisma.tenantBackup.findUnique({ where: { id: req.params.id } });
    if (!backup?.objectKey || backup.status !== "completed") {
        return res.status(404).json({ message: "Backup not found" });
    }
    const backupType = backup.backupType || FULL_BACKUP;
    const extension = backupExtension(backupType);
    const tempPath = path.join(os.tmpdir(), `tenant-restore-${crypto.randomUUID()}.${extension}`);
    try {
        await downloadBackupToFile(backup, tempPath);
        const manifest = await restoreArchive(tempPath, req, backupType);
        await prisma.tenantBackup.update({ where: { id: backup.id }, data: { restoredAt: new Date() } });
        return res.json({ success: true, restoredFiles: manifest.binaryEntries.length });
    } catch (error) {
        console.error("Tenant restore failed:", error);
        return res.status(400).json({ message: error.message || "Backup konnte nicht wiederhergestellt werden." });
    } finally {
        await fs.unlink(tempPath).catch(() => {});
    }
}

async function importBackupByType(req, res, backupType) {
    if (req.body?.confirmation !== "WIEDERHERSTELLEN") {
        return res.status(400).json({ message: "Bestätigung fehlt" });
    }
    if (!req.file?.path) return res.status(400).json({ message: "Keine Backup-Datei hochgeladen" });
    try {
        const manifest = await restoreArchive(req.file.path, req, backupType);
        const stats = await fs.stat(req.file.path);
        const checksum = await sha256(req.file.path);
        const backupId = crypto.randomUUID();
        const extension = backupExtension(backupType);
        const objectKey = `tenants/${getTenantId()}/backups/${backupId}.${extension}`;
        await s3Upload.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: objectKey,
            Body: createReadStream(req.file.path),
            ContentLength: stats.size,
            ContentType: "application/gzip"
        }));
        const backup = await prisma.tenantBackup.create({
            data: {
                id: backupId,
                name: safeName(req.file.originalname?.replace(/\.(?:cshopbackup|cdbbackup|cbackup)$/i, "")),
                backupType,
                status: "completed",
                objectKey,
                bucketName: process.env.S3_BUCKET,
                fileSize: BigInt(stats.size),
                checksum,
                fileCount: manifest.binaryEntries.length,
                tableCount: backupTables(backupType).length,
                createdById: req.user.id,
                completedAt: new Date(),
                restoredAt: new Date()
            }
        });
        return res.status(201).json({ success: true, backup: backupForClient(backup) });
    } catch (error) {
        console.error("Imported tenant restore failed:", error);
        return res.status(400).json({ message: error.message || "Backup konnte nicht eingespielt werden." });
    } finally {
        await fs.unlink(req.file.path).catch(() => {});
    }
}

export const importBackup = (req, res) => importBackupByType(req, res, FULL_BACKUP);
export const importDatabaseBackup = (req, res) => importBackupByType(req, res, DATABASE_BACKUP);
export const importShopDatabaseBackup = (req, res) => importBackupByType(req, res, SHOP_DATABASE_BACKUP);

export async function deleteBackup(req, res) {
    const backup = await prisma.tenantBackup.findUnique({ where: { id: req.params.id } });
    if (!backup) return res.status(404).json({ message: "Backup not found" });
    if (backup.objectKey) {
        await s3Upload.send(new DeleteObjectCommand({ Bucket: backup.bucketName, Key: backup.objectKey }));
    }
    await prisma.tenantBackup.delete({ where: { id: backup.id } });
    return res.json({ success: true });
}
