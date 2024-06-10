import { prisma } from "../../../lib/prisma.js";

export const get = async (req, res) => {
  const services = await prisma.service.findMany({
    where: {
      workspaceId: req.params.workspaceId,
    },
  });
  return res.json(
    services.map((service) => {
      return {
        ...service,
        url: `/workspaces/${service.workspaceId}/${service.id}`,
      };
    })
  );
};
