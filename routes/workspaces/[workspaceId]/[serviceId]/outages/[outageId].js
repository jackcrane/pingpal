import { OutageStatus } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma.js";

export const get = async (req, res) => {
  const outage = await prisma.outage.findUnique({
    where: {
      id: req.params.outageId,
    },
    include: {
      failures:
        req.query.includeFailures && req.query.includeFailures === "true"
          ? {
              select: {
                id: true,
                status: true,
                autogeneratedMessage: true,
                reason: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            }
          : false,
    },
  });

  res.json(outage);
};