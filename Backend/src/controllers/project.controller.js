import prisma from "../config/prisma.js";


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

export const getAllProjects = async (req, res) => {
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