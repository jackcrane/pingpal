import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma.js";

export const get = async (req, res) => {
  const query = Prisma.sql`
    SELECT id AS id,
           createdAt AS timestamp,
           'success' AS status,
           latency
    FROM Hit
    WHERE serviceId = ${req.params.serviceId}

    UNION ALL

    SELECT id AS id,
           createdAt AS timestamp,
           'failure' AS status,
           latency
    FROM Failure
    WHERE serviceId = ${req.params.serviceId}

    ORDER BY timestamp DESC;
  `;

  const points = await prisma.$queryRaw(query);
  res.json([
    { type: "__meta", length: points.length, offset: 0 },
    ...points.map((point) => {
      return {
        ...point,
        url: `/workspaces/${req.params.workspaceId}/${req.params.serviceId}/${point.id}`,
      };
    }),
  ]);
};
