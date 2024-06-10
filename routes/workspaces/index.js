import { prisma } from "../../lib/prisma.js";

export const get = async (req, res) => {
  const workspaces = await prisma.workspace.findMany();
  return res.json(
    workspaces.map((workspace) => {
      return { ...workspace, url: `/workspaces/${workspace.id}` };
    })
  );
};
