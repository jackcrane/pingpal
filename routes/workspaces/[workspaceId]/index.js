import { prisma } from "../../../lib/prisma.js";

export const get = async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: {
      id: req.params.workspaceId,
    },
    include: {
      services: {
        select: {
          id: true,
          name: true,
          lastCheck: true,
        },
      },
      headerLink: true,
      footerLinks: true,
    },
  });
  if (!workspace) {
    return res.status(404).json({
      error: "Workspace not found",
    });
  }
  return res.json(workspace);
};
