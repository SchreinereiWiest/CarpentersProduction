import crypto from "crypto";
import { createReadStream, promises as fs } from "fs";
import { PassThrough } from "stream";
import { pipeline } from "stream/promises";
import { createGunzip, createGzip } from "zlib";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import tar from "tar-stream";

import prisma from "../config/prisma.js";
import { s3Download, s3Upload } from "../config/s3.js";

const ARCHIVE_FORMAT = "carpenters-production-project";
const ARCHIVE_VERSION = 1;
const MANIFEST_PATH = "manifest.json";
const MAX_MANIFEST_SIZE = 5 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 10000;

const pick = (source, fields) => Object.fromEntries(
    fields.filter(field => source?.[field] !== undefined).map(field => [field, source[field]])
);

const projectFields = [
    "projectNumber", "title", "description", "projectType", "status", "priority",
    "estimatedValue", "finalValue", "startDate", "installationDate", "completionDate",
    "specialRequirements", "customerNotes", "internalNotes", "createdById", "createdAt", "updatedAt", "deletedAt"
];
const customerFields = [
    "customerNumber", "firstName", "lastName", "companyName", "email", "phoneMobile",
    "phoneLandline", "preferredContact", "newsletterOptIn", "newsletterOptInAt",
    "customerStatus", "customerRating", "source", "notes", "createdById", "createdAt", "updatedAt", "deletedAt"
];
const addressFields = [
    "street", "houseNumber", "postalCode", "city", "country", "floor",
    "elevatorAvailable", "parkingInfo", "createdAt", "updatedAt", "deletedAt"
];

const dateFields = new Set([
    "startDate", "installationDate", "completionDate", "createdAt", "updatedAt", "deletedAt",
    "newsletterOptInAt", "followUpDate", "startAt", "endAt", "startedAt", "endedAt", "uploadedAt"
]);

function restoreDates(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [
        key,
        dateFields.has(key) && value ? new Date(value) : value
    ]));
}

function safeDownloadName(value) {
    const cleaned = String(value || "project")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "project";
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

async function loadProjectForArchive(projectId) {
    return prisma.project.findUnique({
        where: { id: projectId },
        include: {
            customer: { include: { addresses: true } },
            communications: true,
            appointments: true,
            timeEntries: true,
            files: { include: { storageObject: true } },
            storage: { include: { storageObject: true } }
        }
    });
}

export async function exportProject(req, res) {
    try {
        const project = await loadProjectForArchive(req.params.id);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const fileEntries = project.files.map(file => ({
            kind: "file",
            archivePath: `files/${file.id}`,
            data: pick(file, [
                "fileName", "originalName", "mimeType", "fileSize", "category",
                "uploadedById", "uploadedAt", "deletedAt", "status"
            ]),
            storage: pick(file.storageObject, [
                "provider", "region", "endpoint", "accessUrl", "etag", "storageClass", "isArchived"
            ])
        }));
        const storageEntries = project.storage.map(item => ({
            kind: "projectStorage",
            archivePath: `storage/${item.id}`,
            data: pick(item, ["dataType", "schemaVersion", "createdAt"]),
            storage: pick(item.storageObject, [
                "provider", "region", "endpoint", "accessUrl", "etag", "storageClass", "isArchived"
            ])
        }));
        const manifest = {
            format: ARCHIVE_FORMAT,
            version: ARCHIVE_VERSION,
            exportedAt: new Date().toISOString(),
            project: pick(project, projectFields),
            customer: {
                originalId: project.customer.id,
                data: pick(project.customer, customerFields),
                addresses: project.customer.addresses.map(address => ({
                    originalId: address.id,
                    data: pick(address, addressFields)
                }))
            },
            communications: project.communications.map(item => pick(item, [
                "type", "subject", "content", "followUpDate", "createdById", "createdAt", "updatedAt", "deletedAt"
            ])),
            appointments: project.appointments.map(item => ({
                ...pick(item, [
                    "appointmentType", "title", "description", "startAt", "endAt", "status",
                    "createdById", "createdAt", "updatedAt", "deletedAt"
                ]),
                originalAddressId: item.addressId
            })),
            timeEntries: project.timeEntries.map(item => pick(item, [
                "userId", "workType", "customWorkType", "startedAt", "endedAt", "duration", "note", "createdAt"
            ])),
            binaryEntries: [...fileEntries, ...storageEntries]
        };

        const archiveName = `${safeDownloadName(project.title)}.cproject`;
        res.status(200);
        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Disposition", `attachment; filename="${archiveName}"`);
        res.setHeader("Cache-Control", "no-store");

        const pack = tar.pack();
        const gzip = createGzip({ level: 6 });
        pipeline(pack, gzip, res).catch(error => {
            console.error("Project export stream failed:", error);
            if (!res.headersSent) res.status(500).json({ error: "Project export failed" });
            else res.destroy(error);
        });

        const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
        await sendArchiveEntry(pack, { name: MANIFEST_PATH, size: manifestBody.length }, manifestBody);

        for (const entry of manifest.binaryEntries) {
            const source = entry.kind === "file"
                ? project.files.find(file => entry.archivePath === `files/${file.id}`)
                : project.storage.find(item => entry.archivePath === `storage/${item.id}`);
            if (!source?.storageObject) throw new Error(`Missing storage object for ${entry.archivePath}`);

            const object = await s3Download.send(new GetObjectCommand({
                Bucket: source.storageObject.bucketName,
                Key: source.storageObject.objectKey
            }));
            await sendArchiveEntry(pack, {
                name: entry.archivePath,
                size: Number(object.ContentLength ?? entry.data.fileSize ?? 0)
            }, object.Body);
        }

        pack.finalize();
    } catch (error) {
        console.error("Project export failed:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Project export failed", message: error.message });
        }
        res.destroy(error);
    }
}

function validateManifest(manifest) {
    if (manifest?.format !== ARCHIVE_FORMAT || manifest?.version !== ARCHIVE_VERSION) {
        throw new Error("Unsupported or invalid project archive");
    }
    if (!manifest.project?.title || !manifest.customer?.data) {
        throw new Error("The project archive is incomplete");
    }
    if (!Array.isArray(manifest.binaryEntries) || !Array.isArray(manifest.communications)
        || !Array.isArray(manifest.appointments) || !Array.isArray(manifest.timeEntries)) {
        throw new Error("The project archive has an invalid manifest");
    }
    const paths = new Set();
    for (const entry of manifest.binaryEntries) {
        if (!["file", "projectStorage"].includes(entry.kind)
            || typeof entry.archivePath !== "string"
            || !/^(files|storage)\/[a-zA-Z0-9-]+$/.test(entry.archivePath)
            || paths.has(entry.archivePath)) {
            throw new Error("The project archive contains invalid file entries");
        }
        paths.add(entry.archivePath);
    }
}

async function validUserIds(manifest) {
    const ids = new Set([
        ...manifest.communications.map(item => item.createdById),
        ...manifest.appointments.map(item => item.createdById),
        ...manifest.timeEntries.map(item => item.userId),
        ...manifest.binaryEntries.map(item => item.data?.uploadedById),
        manifest.project.createdById,
        manifest.customer.data.createdById
    ].filter(Boolean));
    if (!ids.size) return new Set();
    const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true } });
    return new Set(users.map(user => user.id));
}

async function resolveCustomer(customerSnapshot, addressMap, createdRecords, users) {
    let customer = await prisma.customer.findUnique({ where: { id: customerSnapshot.originalId } });
    const data = restoreDates(pick(customerSnapshot.data, customerFields));

    if (!customer && data.customerNumber) {
        customer = await prisma.customer.findUnique({ where: { customerNumber: data.customerNumber } });
    }
    if (!customer && data.email) {
        customer = await prisma.customer.findFirst({ where: { email: data.email } });
    }
    if (!customer) {
        data.createdById = users.has(data.createdById) ? data.createdById : null;
        customer = await prisma.customer.create({ data });
        createdRecords.customerId = customer.id;
    }

    for (const addressSnapshot of customerSnapshot.addresses || []) {
        let address = await prisma.customerAddress.findFirst({
            where: { id: addressSnapshot.originalId, customerId: customer.id }
        });
        if (!address) {
            address = await prisma.customerAddress.create({
                data: { ...restoreDates(pick(addressSnapshot.data, addressFields)), customerId: customer.id }
            });
            createdRecords.addressIds.push(address.id);
        }
        addressMap.set(addressSnapshot.originalId, address.id);
    }
    return customer;
}

async function resolveImportCustomer(manifest, req, state, users) {
    const overrideCustomerId = String(req.body?.customerId || "").trim();

    if (!overrideCustomerId) {
        return resolveCustomer(manifest.customer, state.addressMap, state.created, users);
    }

    const customer = await prisma.customer.findUnique({
        where: { id: overrideCustomerId },
        include: { addresses: { orderBy: { createdAt: "asc" } } }
    });

    if (!customer) {
        throw new Error("The selected customer does not exist");
    }

    // In contact import mode, no customer data from the archive is created.
    // Appointment addresses are mapped to the selected customer's addresses
    // by position, with its first address as a fallback.
    const targetAddresses = customer.addresses || [];
    for (const [index, addressSnapshot] of (manifest.customer.addresses || []).entries()) {
        const targetAddress = targetAddresses[index] || targetAddresses[0];
        if (targetAddress) state.addressMap.set(addressSnapshot.originalId, targetAddress.id);
    }

    return customer;
}

async function createImportedProject(manifest, req, state) {
    const users = await validUserIds(manifest);
    state.users = users;
    const customer = await resolveImportCustomer(manifest, req, state, users);
    const rawProject = restoreDates(pick(manifest.project, projectFields));
    if (rawProject.projectNumber) {
        const collision = await prisma.project.findUnique({ where: { projectNumber: rawProject.projectNumber } });
        if (collision) rawProject.projectNumber = null;
    }

    state.project = await prisma.project.create({
        data: {
            ...rawProject,
            customerId: customer.id,
            createdById: users.has(rawProject.createdById) ? rawProject.createdById : req.user?.id || null
        }
    });

    if (manifest.communications.length) {
        await prisma.communication.createMany({
            data: manifest.communications.map(item => ({
                ...restoreDates(pick(item, [
                    "type", "subject", "content", "followUpDate", "createdAt", "updatedAt", "deletedAt"
                ])),
                customerId: customer.id,
                projectId: state.project.id,
                createdById: users.has(item.createdById) ? item.createdById : null
            }))
        });
    }
    if (manifest.appointments.length) {
        await prisma.appointment.createMany({
            data: manifest.appointments.map(item => ({
                ...restoreDates(pick(item, [
                    "appointmentType", "title", "description", "startAt", "endAt", "status",
                    "createdAt", "updatedAt", "deletedAt"
                ])),
                customerId: customer.id,
                projectId: state.project.id,
                addressId: state.addressMap.get(item.originalAddressId) || null,
                createdById: users.has(item.createdById) ? item.createdById : null
            }))
        });
    }
    if (manifest.timeEntries.length) {
        await prisma.timeEntry.createMany({
            data: manifest.timeEntries.map(item => ({
                ...restoreDates(pick(item, ["workType", "customWorkType", "startedAt", "endedAt", "duration", "note", "createdAt"])),
                projectId: state.project.id,
                userId: users.has(item.userId) ? item.userId : null
            }))
        });
    }
}

async function importBinaryEntry(entryStream, metadata, state) {
    const storageObject = await prisma.s3Object.create({
        data: {
            provider: metadata.storage?.provider || "garage",
            bucketName: process.env.S3_BUCKET,
            objectKey: `projects/${state.project.id}/${crypto.randomUUID()}`,
            region: metadata.storage?.region || null,
            endpoint: process.env.S3_PUBLIC_ENDPOINT,
            accessUrl: null,
            storageClass: metadata.storage?.storageClass || null,
            isArchived: metadata.storage?.isArchived || false
        }
    });
    state.created.storageObjectIds.push(storageObject.id);
    state.created.objectKeys.push(storageObject.objectKey);

    // tar-stream v3 uses a streamx Source. The AWS Node HTTP handler does not
    // recognize that object as a valid request body, so bridge it to a native
    // Node stream while preserving backpressure for large project files.
    const uploadBody = new PassThrough();
    const bridge = pipeline(entryStream, uploadBody);

    try {
        await s3Upload.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: storageObject.objectKey,
            Body: uploadBody,
            ContentLength: Number(metadata.archiveSize || 0) || undefined,
            ContentType: metadata.kind === "file" ? metadata.data.mimeType || "application/octet-stream" : "application/octet-stream"
        }));
        await bridge;
    } catch (error) {
        uploadBody.destroy();
        await bridge.catch(() => {});
        throw error;
    }

    if (metadata.kind === "file") {
        await prisma.file.create({
            data: {
                ...restoreDates(pick(metadata.data, [
                    "fileName", "originalName", "mimeType", "fileSize", "category", "uploadedAt", "deletedAt", "status"
                ])),
                projectId: state.project.id,
                customerId: state.project.customerId,
                storageObjectId: storageObject.id,
                uploadedById: state.users.has(metadata.data.uploadedById) ? metadata.data.uploadedById : null
            }
        });
    } else {
        await prisma.projectStorage.create({
            data: {
                ...restoreDates(pick(metadata.data, ["dataType", "schemaVersion", "createdAt"])),
                projectId: state.project.id,
                storageObjectId: storageObject.id
            }
        });
    }
}

async function rollbackImport(state) {
    for (const objectKey of state.created.objectKeys) {
        try {
            await s3Upload.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: objectKey }));
        } catch (error) {
            console.error("Could not roll back imported object:", objectKey, error);
        }
    }
    if (state.project?.id) {
        await prisma.communication.deleteMany({ where: { projectId: state.project.id } });
        await prisma.appointment.deleteMany({ where: { projectId: state.project.id } });
        await prisma.project.delete({ where: { id: state.project.id } }).catch(() => {});
    }
    if (state.created.storageObjectIds.length) {
        await prisma.s3Object.deleteMany({ where: { id: { in: state.created.storageObjectIds } } }).catch(() => {});
    }
    if (state.created.customerId) {
        await prisma.customer.delete({ where: { id: state.created.customerId } }).catch(() => {});
    } else if (state.created.addressIds.length) {
        await prisma.customerAddress.deleteMany({ where: { id: { in: state.created.addressIds } } }).catch(() => {});
    }
}

export async function importProject(req, res) {
    const state = {
        manifest: null,
        project: null,
        importedPaths: new Set(),
        addressMap: new Map(),
        users: new Set(),
        created: { customerId: null, addressIds: [], storageObjectIds: [], objectKeys: [] }
    };

    try {
        if (!req.file?.path) return res.status(400).json({ error: "No project archive uploaded" });

        const extract = tar.extract();
        let entryCount = 0;
        let processingError = null;

        extract.on("entry", (header, stream, next) => {
            // streamx emits errors on the individual entry source as well as
            // on the extractor. Keep the entry error handled so a failed S3
            // upload can be rolled back instead of terminating Node.
            stream.on("error", error => {
                if (!processingError) processingError = error;
            });

            (async () => {
                entryCount += 1;
                if (entryCount > MAX_ARCHIVE_ENTRIES) throw new Error("The project archive contains too many entries");

                if (!state.manifest) {
                    if (header.name !== MANIFEST_PATH || header.size > MAX_MANIFEST_SIZE) {
                        throw new Error("The manifest must be the first archive entry");
                    }
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    state.manifest = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                    validateManifest(state.manifest);
                    await createImportedProject(state.manifest, req, state);
                    next();
                    return;
                }

                const metadata = state.manifest.binaryEntries.find(item => item.archivePath === header.name);
                if (!metadata || state.importedPaths.has(header.name)) throw new Error("Unexpected archive entry");
                metadata.archiveSize = header.size;
                await importBinaryEntry(stream, metadata, state);
                state.importedPaths.add(header.name);
                next();
            })().catch(error => {
                processingError = error;
                stream.resume();
                extract.destroy(error);
            });
        });

        await pipeline(createReadStream(req.file.path), createGunzip(), extract);
        if (processingError) throw processingError;
        if (!state.manifest || state.importedPaths.size !== state.manifest.binaryEntries.length) {
            throw new Error("The project archive is incomplete");
        }

        return res.status(201).json({
            success: true,
            projectId: state.project.id,
            project: state.project,
            importedFiles: state.importedPaths.size
        });
    } catch (error) {
        console.error("Project import failed:", error);
        await rollbackImport(state);
        return res.status(400).json({ error: "Project import failed", message: error.message });
    } finally {
        if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    }
}
