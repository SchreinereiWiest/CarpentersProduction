import prisma from "../config/prisma.js";
import {s3Download, s3Upload} from "../config/s3.js"
import {
    PutObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { publishFileChange } from "../services/fileChangeEvents.service.js";
import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";
import { enqueueStorageDeletions, processStorageDeletions } from "../services/storageDeletion.service.js";
import { getTenantId } from "../context/tenantContext.js";

export const newProject = async (req, res) => {

    try {

        const project = await prisma.project.create({
            data: {
                customerId: req.body.customerId,
                title: req.body.title,
                description: req.body.description,
                createdById: req.user.id,
            },
        });

        return res.status(201).json(project);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}


export const updateProject = async (req, res) => {

    try {

        const project = await prisma.project.update({
            where: {
                id: req.params.id
            },
            data: {
                customerId: req.body.customerId,
                title: req.body.title,
                description: req.body.description,
                status: req.body.status
            },
        });

        return res.status(201).json(project);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}


export const deleteProject = async (req, res) => {

    try {

        const { projectId } = req.params;

        /*
         * --------------------------------------------------
         * 1. Projekt laden
         * --------------------------------------------------
         */

        const project = await prisma.project.findUnique({

            where: {
                id: projectId
            },
            include: {
                files: {
                    include: { storageObject: true }
                },
                storage: {
                    include: { storageObject: true }
                }
            }

        });


        if (!project) {

            return res.status(404).json({
                error: "Project not found"
            });

        }


        /*
         * --------------------------------------------------
         * 2. Alle Dateien des Projekts laden
         * --------------------------------------------------
         */

        const storageObjectIds = [...new Set([
            ...project.files.map(file => file.storageObjectId),
            ...project.storage.map(item => item.storageObjectId)
        ])];

        /*
         * --------------------------------------------------
         * 4. Datenbankdaten und Audit-Log atomar schreiben
         * --------------------------------------------------
         */

        const objectsToDelete = await prisma.$transaction(async transaction => {

            await transaction.project.delete({
                where: {
                    id: projectId
                }
            });

            const orphanedObjects = storageObjectIds.length
                ? await transaction.s3Object.findMany({
                    where: {
                        id: { in: storageObjectIds },
                        files: { none: {} },
                        projectStorage: { none: {} }
                    },
                    select: { id: true, bucketName: true, objectKey: true }
                })
                : [];

            await enqueueStorageDeletions(transaction, orphanedObjects);

            if (orphanedObjects.length) {
                await transaction.s3Object.deleteMany({
                    where: { id: { in: orphanedObjects.map(object => object.id) } }
                });
            }

            await transaction.auditLog.create({
                data: {
                    actorUserId: req.user.id,
                    action: "project.delete",
                    entityType: "Project",
                    entityId: projectId,
                    metadata: {
                        projectTitle: project.title,
                        deletedFiles: project.files.length,
                        deletedStorageObjects: orphanedObjects.length
                    },
                    ipAddress: req.ip || null,
                    userAgent: req.get("user-agent") || null
                }
            });

            return orphanedObjects;

        });

        void processStorageDeletions(objectsToDelete).catch(error => {
            console.error("Immediate storage deletion failed:", error);
        });


        /*
         * --------------------------------------------------
         * 5. Antwort
         * --------------------------------------------------
         */

        return res.json({

            success: true,

            message: "Project deleted successfully",

            projectId: projectId,

            deletedFiles: project.files.length,
            storageDeletionJobs: objectsToDelete.length

        });

    }
    catch (error) {

        console.error(
            "Project deletion failed:",
            error
        );


        return res.status(500).json({
            error: "Project deletion failed"
        });

    }

};


export const getAllProjectsID = async (req, res) => {
    const id = req.params.id;

    
  try {

    const projects = await prisma.project.findMany({
        where: {
          customerId: id
        },
        orderBy: [
          {
            title: "asc",
          },
        ],

      });

    res.status(200).json({
      projects
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};


export const getAllProjects = async (req, res) => {
    
  try {

    const isPrivileged = ["admin", "manager"].includes(req.user?.role);
    const visibleStatuses = isPrivileged
      ? ["active", "inactive"]
      : ["active"];

    const projects = await prisma.project.findMany({
        where: {
          status: {
            in: visibleStatuses
          }
        },
        orderBy: [
          {
            title: "asc",
          },
        ],
        include : {
            customer: true
        }

      });

    res.status(200).json({
      projects
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Kept as an alias for existing API consumers.
export const getAllActive = getAllProjects;


export const getProject = async (req, res) => {
  try {

   const project = await prisma.project.findUnique({
  where: {
    id: req.params.id,
  },
  include: {
    files: true,
  },
});

    res.status(200).json({
      project
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};


export const getGeneratedProjectData = async (req, res) => {

    const { id } = req.params;
    const {name} = req.params;

    let fileName = "";

    switch(name) {
        case "nesting": 
        fileName = "nesting.json"
        break;

        case "list": 
        fileName = "list.json"
        break;

        case "cabinet":
        fileName = "cabinet.json";
        break;

        case "procurement":
        fileName = "procurement.json";
        break;

        case "aufmas":
            fileName = "aufmas.json";
            break;

      default:
        fileName="";
        break;
    }

    try {

        const file = await prisma.file.findFirst({

            where: {
                projectId: id,
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

            res.set("ETag", `"${file.serverVersion}"`);
            return res.json({
                exists: true,
                downloadUrl,
                fileId: file.id,
                serverVersion: file.serverVersion,
                updatedAt: file.updatedAt,
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


export async function createGeneratedProjectData(req,res){

    const { id, name } = req.params;

    let fileName = "";

    switch (name) {

        case "nesting":
            fileName = "nesting.json";
            break;

        case "list":
            fileName = "list.json";
            break;

        case "cabinet":
            fileName = "cabinet.json";
            break;

        case "procurement":
            fileName = "procurement.json";
            break;

        case "aufmas":
            fileName = "aufmas.json";
            break;

        default:
            return res.status(400).json({
                error: "Invalid file name"
            });
    }


    const prefix = `tenants/${getTenantId()}/projects/${id}`;
    const idempotencyKey = req.get("idempotency-key") || null;
    const ifMatch = req.get("if-match");
    const expectedVersion = ifMatch == null
        ? null
        : Number(String(ifMatch).replace(/^W\//, "").replaceAll('"', ""));

    if (ifMatch != null && !Number.isInteger(expectedVersion)) {
        return res.status(400).json({
            error: "INVALID_IF_MATCH",
            message: "If-Match must contain a numeric server version"
        });
    }

    if (idempotencyKey) {
        const completedMutation = await prisma.syncMutation.findFirst({
            where: { idempotencyKey }
        });

        if (completedMutation) {
            if (completedMutation.response?.version != null) {
                res.set("ETag", `"${completedMutation.response.version}"`);
            }
            return res.status(200).json(completedMutation.response);
        }
    }


    /*
     * JSON-Daten aus dem Request
     */
    const jsonContent = JSON.stringify(req.body);

    const body = Buffer.from(jsonContent, "utf-8");


    /*
     * --------------------------------------------------
     * 2. Prüfen, ob bereits ein File-Eintrag existiert
     * --------------------------------------------------
     */

    const existingFile = await prisma.file.findFirst({

        where: {
            projectId: id,
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
        if (expectedVersion != null && expectedVersion !== 0) {
            return res.status(412).json({
                error: "VERSION_CONFLICT",
                fileId: null,
                expectedVersion,
                currentVersion: 0
            });
        }

        const version = 1;
        const objectKey = `${prefix}/versions/${version}-${idempotencyKey || Date.now()}-${fileName}`;
        try {
            const response = await prisma.$transaction(async transaction => {
                // Auch die erstmalige Erstellung wird pro Projekt/Dateiname
                // serialisiert. Der Verlierer erkennt den inzwischen
                // vorhandenen Datensatz, bevor er S3 berührt.
                const lockKey = `${getTenantId()}:${id}:${fileName}`;
                await transaction.$executeRaw`
                    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
                `;

                if (idempotencyKey) {
                    const duplicate = await transaction.syncMutation.findFirst({
                        where: { idempotencyKey }
                    });
                    if (duplicate) return duplicate.response;
                }

                const createdByOtherClient = await transaction.file.findFirst({
                    where: { projectId: id, fileName, deletedAt: null }
                });
                if (createdByOtherClient) {
                    const conflict = new Error("VERSION_CONFLICT");
                    conflict.code = "VERSION_CONFLICT";
                    conflict.currentVersion = createdByOtherClient.serverVersion;
                    conflict.fileId = createdByOtherClient.id;
                    throw conflict;
                }

                await s3Upload.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: objectKey,
                    Body: body,
                    ContentType: "application/json"
                }));

                const storageObject = await transaction.s3Object.create({
                    data: {
                        provider: "garage",
                        bucketName: process.env.S3_BUCKET,
                        objectKey,
                        endpoint: process.env.S3_PUBLIC_ENDPOINT
                    }
                });

                const fileEntry = await transaction.file.create({
                    data: {
                        project: { connect: { id } },
                        storageObject: { connect: { id: storageObject.id } },
                        uploadedBy: { connect: { id: req.user.id } },
                        fileName,
                        mimeType: "application/json",
                        fileSize: body.length,
                        status: "complete",
                        serverVersion: version
                    }
                });

                const result = {
                    fileId: fileEntry.id,
                    version,
                    status: "synced",
                    objectKey,
                    fileEntry
                };

                if (idempotencyKey) {
                    await transaction.syncMutation.create({
                        data: {
                            idempotencyKey,
                            fileId: fileEntry.id,
                            response: JSON.parse(JSON.stringify(result))
                        }
                    });
                }

                return result;
            }, { timeout: 30_000 });

            res.set("ETag", `"${response.version}"`);
            publishFileChange({
                tenantId: req.tenant.id,
                action: "updated",
                resourceType: "project-json",
                fileId: response.fileId,
                projectId: id,
                fileName,
                serverVersion: response.version
            });
            return res.json(response);
        } catch (error) {
            if (error?.code === "VERSION_CONFLICT") {
                return res.status(412).json({
                    error: "VERSION_CONFLICT",
                    fileId: error.fileId ?? null,
                    expectedVersion: expectedVersion ?? 0,
                    currentVersion: error.currentVersion ?? 1
                });
            }
            throw error;
        }
    }


    /*
     * --------------------------------------------------
     * 4. File existiert bereits
     * --------------------------------------------------
     */

    const versionToMatch = expectedVersion ?? existingFile.serverVersion;

    if (existingFile.serverVersion !== versionToMatch) {
        return res.status(412).json({
            error: "VERSION_CONFLICT",
            fileId: existingFile.id,
            expectedVersion: versionToMatch,
            currentVersion: existingFile.serverVersion
        });
    }

    const nextVersion = versionToMatch + 1;
    const objectKey = `${prefix}/versions/${nextVersion}-${idempotencyKey || Date.now()}-${fileName}`;

    try {
        const response = await prisma.$transaction(async transaction => {
            // Das bedingte Update sperrt die Dateizeile. Ein zweiter Client mit
            // derselben Basisversion erhaelt count=0 und laedt keinen Inhalt hoch.
            const claim = await transaction.file.updateMany({
                where: { id: existingFile.id, serverVersion: versionToMatch },
                data: { serverVersion: { increment: 1 } }
            });

            if (claim.count !== 1) {
                const conflict = new Error("VERSION_CONFLICT");
                conflict.code = "VERSION_CONFLICT";
                throw conflict;
            }

            await s3Upload.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: objectKey,
                Body: body,
                ContentType: "application/json"
            }));

            await enqueueStorageDeletions(transaction, [{
                bucketName: existingFile.storageObject.bucketName,
                objectKey: existingFile.storageObject.objectKey
            }]);

            await transaction.s3Object.update({
                where: { id: existingFile.storageObject.id },
                data: {
                    provider: "garage",
                    bucketName: process.env.S3_BUCKET,
                    objectKey,
                    endpoint: process.env.S3_PUBLIC_ENDPOINT
                }
            });

            const fileEntry = await transaction.file.update({
                where: { id: existingFile.id },
                data: {
                    fileName,
                    mimeType: "application/json",
                    fileSize: body.length,
                    status: "complete"
                }
            });

            const result = {
                fileId: fileEntry.id,
                version: nextVersion,
                status: "synced",
                objectKey,
                fileEntry
            };

            if (idempotencyKey) {
                await transaction.syncMutation.create({
                    data: {
                        idempotencyKey,
                        fileId: fileEntry.id,
                        response: JSON.parse(JSON.stringify(result))
                    }
                });
            }

            return result;
        }, { timeout: 30_000 });

        res.set("ETag", `"${response.version}"`);
        publishFileChange({
            tenantId: req.tenant.id,
            action: "updated",
            resourceType: "project-json",
            fileId: response.fileId,
            projectId: id,
            fileName,
            serverVersion: response.version
        });
        return res.json(response);
    } catch (error) {
        if (error?.code === "VERSION_CONFLICT") {
            if (idempotencyKey) {
                const duplicate = await prisma.syncMutation.findFirst({
                    where: { idempotencyKey }
                });
                if (duplicate) {
                    res.set("ETag", `"${duplicate.response.version}"`);
                    return res.status(200).json(duplicate.response);
                }
            }
            const current = await prisma.file.findFirst({
                where: { id: existingFile.id },
                select: { serverVersion: true }
            });

            return res.status(412).json({
                error: "VERSION_CONFLICT",
                fileId: existingFile.id,
                expectedVersion: versionToMatch,
                currentVersion: current?.serverVersion ?? existingFile.serverVersion
            });
        }

        throw error;
    }

}

export const getOfflineProjects = async (req, res) => {
    const mode = req.query.mode === "active" ? "active" : "selected";
    const requestedIds = String(req.query.projectIds || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
    const privileged = ["admin", "manager"].includes(req.user?.role);

    const projects = await prisma.project.findMany({
        where: {
            deletedAt: null,
            ...(privileged ? {} : { status: "active" }),
            ...(mode === "active"
                ? { status: "active" }
                : { id: { in: requestedIds } })
        },
        include: {
            customer: {
                include: {
                    addresses: { where: { deletedAt: null } }
                }
            },
            files: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    projectId: true,
                    fileName: true,
                    originalName: true,
                    mimeType: true,
                    fileSize: true,
                    category: true,
                    status: true,
                    serverVersion: true,
                    updatedAt: true
                }
            },
            storage: true,
            communications: { where: { deletedAt: null } },
            appointments: { where: { deletedAt: null } },
            timeEntries: true
        },
        orderBy: { title: "asc" }
    });

    const materials = await prisma.material.findMany({
        orderBy: { name: "asc" }
    });

    return res.json({
        schemaVersion: 1,
        downloadedAt: new Date().toISOString(),
        projects,
        materials
    });
};
