import { prisma } from "../../../lib/prisma.js";

export const get = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        users: {
          some: {
            userId: req.user.userId,
          },
        },
      },
    });

    return res.json(workspaces);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
