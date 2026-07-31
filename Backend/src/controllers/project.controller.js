import prisma from "../config/prisma.js";
import {s3} from "../config/s3.js"
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";
import {
    getSignedUrl
} from "@aws-sdk/s3-request-presigner";

export const newProject = async (req, res) => {

    try {

        const project = await prisma.project.create({
            data: {
                customerId: req.body.customerId,
                title: req.body.title,
                description: req.body.description,
            },
        });

        return res.status(201).json(project);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }

}

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

export const getAllActive = async (req, res) => {
    
  try {

    const projects = await prisma.project.findMany({
        where: {
        status: {
            not: "archived"
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
            s3,
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

    const { id } = req.params;
    const {name} = req.params;

    let prefix = `projects/${id}`;
    let fileName = "";

    switch(name) {
      case "nesting": 
        fileName = "nesting.json"
        break;

      case "list": 
        fileName = "list.json"
        break;

      default:
        fileName="";
        break;
    }

    const objectKey = `${prefix}/${fileName}`;

    const command = new PutObjectCommand({

        Bucket: process.env.S3_BUCKET,

        Key:objectKey,

        ContentType: "application/json"

    });


    const uploadUrl =
            await getSignedUrl(
                s3,
                command,
                {
                    expiresIn:900
                }
            );

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
        
        if (!file) {
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
                              id: id
                          }
                      },


                      storageObject: {
                  connect: {
                      id: storageObject.id,
                  },
              },


                      fileName: fileName,
                      mimeType: "application/json",
                      status: "complete",

                  },
          });


   res.json({
        uploadUrl,
        objectKey,
        fileEntry
    });

        } else {
          const storageObject = await prisma.s3Object.update({
            where: {
              id: file.storageObject.id
            },
    data: {
        provider: "garage",
        bucketName: process.env.S3_BUCKET,
        objectKey,
        endpoint: process.env.S3_PUBLIC_ENDPOINT,
    },
});

    const fileEntry = await prisma.file.update({
      where: {
        id: file.id
      },
        data: {
                        project: {
                    connect: {
                        id: id
                    }
                },


                storageObject: {
            connect: {
                id: storageObject.id,
            },
        },


                fileName: fileName,
                mimeType: "application/json",
                status: "complete",

            },
    });

   res.json({
        uploadUrl,
        objectKey,
        fileEntry
    });
        }

    

}
