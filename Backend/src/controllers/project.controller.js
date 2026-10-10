import prisma from "../config/prisma.js";
import {s3Download, s3Upload} from "../config/s3.js"
import {
    PutObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";
import { enqueueStorageDeletions, processStorageDeletions } from "../services/storageDeletion.service.js";

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
          },
          ...(!isPrivileged ? {
            OR: [
              { createdById: req.user.id },
              { timeEntries: { some: { userId: req.user.id } } }
            ]
          } : {})
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

        default:
            return res.status(400).json({
                error: "Invalid file name"
            });
    }


    const prefix = `projects/${id}`;
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

                    project: {
                        connect: {
                            id: id
                        }
                    },

                    storageObject: {
                        connect: {
                            id: storageObject.id
                        }
                    },

                    uploadedBy: {
                        connect: {
                            id: req.user.id
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
