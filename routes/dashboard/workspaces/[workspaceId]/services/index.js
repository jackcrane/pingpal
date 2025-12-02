import { prisma } from "../../../../../lib/prisma.js";
import { requireAuth } from "../../../utils.js";

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const DEFAULT_CHECK_INTERVAL = 60;
const DEFAULT_MAX_LATENCY = 5000;
const DEFAULT_EXPECTED_STATUS = 200;

const normalizeMethod = (method) => {
  if (typeof method !== "string") {
    return "GET";
  }
  const sanitized = method.toUpperCase();
  return ALLOWED_METHODS.includes(sanitized) ? sanitized : "GET";
};

const parseExpectedStatus = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return BigInt(DEFAULT_EXPECTED_STATUS);
  }
  const clamped = Math.min(599, Math.max(100, parsed));
  return BigInt(clamped);
};

const parsePositiveBigInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return BigInt(fallback);
  }
  return BigInt(Math.floor(parsed));
};

const sanitizeOptionalString = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const serializeService = (service) => ({
  ...service,
  expectedStatus: Number(service.expectedStatus),
  maxLatency: Number(service.maxLatency),
  checkInterval: Number(service.checkInterval),
});

export const post = async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) {
      return;
    }

    const workspaceId = req.params.workspaceId;
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        users: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const {
      name,
      domain,
      method,
      expectedStatus,
      checkInterval,
      maxLatency,
      expectedText,
      body,
      headers,
    } = req.body ?? {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedDomain = typeof domain === "string" ? domain.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ error: "Service name is required" });
    }

    if (!trimmedDomain) {
      return res.status(400).json({ error: "Service domain is required" });
    }

    const service = await prisma.service.create({
      data: {
        name: trimmedName,
        domain: trimmedDomain,
        expectedStatus: parseExpectedStatus(expectedStatus),
        method: normalizeMethod(method),
        maxLatency: parsePositiveBigInt(maxLatency, DEFAULT_MAX_LATENCY),
        checkInterval: parsePositiveBigInt(checkInterval, DEFAULT_CHECK_INTERVAL),
        expectedText: sanitizeOptionalString(expectedText),
        body: sanitizeOptionalString(body),
        headers: sanitizeOptionalString(headers),
        workspaceId,
      },
    });

    return res.status(201).json(serializeService(service));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
