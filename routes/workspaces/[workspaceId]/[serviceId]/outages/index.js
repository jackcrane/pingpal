import { OutageStatus } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma.js";

export const get = async (req, res) => {
  try {
    const outages = await prisma.outage.findMany({
      where: {
        serviceId: req.params.serviceId,
        ...(req.query.includeClosed && req.query.includeClosed === "true"
          ? {}
          : { status: OutageStatus.OPEN }),
      },
      include: {
        failures: req.query.includeFailures ? true : false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    });

    res.json(outages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
