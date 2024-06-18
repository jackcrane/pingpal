import { prisma } from "../../lib/prisma.js";

export const get = async (req, res) => {
  const { subdomain } = req.query;
  const workspace = await prisma.workspace.findUnique({
    where: {
      subdomain,
    },
  });
  return res.json(workspace);
};
