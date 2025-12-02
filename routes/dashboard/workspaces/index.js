import { prisma } from "../../../lib/prisma.js";
import { requireAuth } from "../utils.js";

const VALID_TIERS = ["FREE", "LAUNCH", "PRO"];
const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/i;

export const get = async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) {
      return;
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        users: {
          some: {
            id: userId,
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

export const post = async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) {
      return;
    }

    const { name, subdomain, tier } = req.body ?? {};
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedSubdomain =
      typeof subdomain === "string" ? subdomain.trim() : "";

    if (!trimmedName || !trimmedSubdomain) {
      return res
        .status(400)
        .json({ error: "Both name and subdomain are required" });
    }

    if (!SUBDOMAIN_REGEX.test(trimmedSubdomain)) {
      return res.status(400).json({
        error: "Subdomain must only contain letters, numbers, or hyphens",
      });
    }

    const normalizedSubdomain = trimmedSubdomain.toLowerCase();
    const existingWorkspace = await prisma.workspace.findUnique({
      where: {
        subdomain: normalizedSubdomain,
      },
    });

    if (existingWorkspace) {
      return res
        .status(409)
        .json({ error: "That subdomain is already taken" });
    }

    const requestedTier = (tier ?? "FREE").toString().toUpperCase();
    const normalizedTier = VALID_TIERS.includes(requestedTier)
      ? requestedTier
      : "FREE";

    const workspace = await prisma.workspace.create({
      data: {
        name: trimmedName,
        subdomain: normalizedSubdomain,
        tier: normalizedTier,
        users: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        services: true,
      },
    });

    return res.status(201).json(workspace);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
