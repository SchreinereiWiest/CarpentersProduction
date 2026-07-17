import prisma from "../config/prisma.js";


export const uploadcomplete = async (req, res) => {
  try {

    const file = await prisma.file.update({
      where: {
        id: req.body.id,
      },

      data: {
        status: "complete",
    }});

    res.status(200).json(file);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};


