import { recordHit } from "../../lib/store.js";

const ensureWorkspace = (ctx) => {
  const requested = ctx.body?.workspaceId || ctx.config.workspace.id;
  if (requested !== ctx.config.workspace.id) {
    ctx.json(404, { error: "Workspace not found" });
    return false;
  }
  return true;
};

const pickReason = ({ okStatus, okLatency, okText, body }) => {
  if (!okStatus) return "STATUS_CODE";
  if (!okLatency) return "LATENCY";
  if (!okText) return "EXPECTED_TEXT";
  if (body?.error) return "REQUEST_FAILURE";
  return body?.reason || "UNKNOWN";
};

export const POST = async (_req, _res, ctx) => {
  try {
    if (!ensureWorkspace(ctx)) return;

    const { serviceId, statusCode, latencyMs, latency, ok, success } =
      ctx.body || {};
    if (!serviceId) {
      ctx.json(400, { error: "serviceId is required" });
      return;
    }

    const service = ctx.config.services.find((s) => s.id === serviceId);
    if (!service) {
      ctx.json(404, { error: "Service not found" });
      return;
    }

    const defaults = ctx.config.defaults || {};
    const effectiveLatency =
      typeof latencyMs === "number" ? latencyMs : latency;
    const expectedStatus = service.expectedStatus ?? defaults.expectedStatus;
    const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs;
    const expectedText = service.expectedText ?? defaults.expectedText ?? null;
    const bodyText =
      typeof ctx.body?.body === "string"
        ? ctx.body.body
        : typeof ctx.body?.bodyText === "string"
        ? ctx.body.bodyText
        : null;

    const okStatus =
      typeof statusCode === "number"
        ? expectedStatus
          ? statusCode === expectedStatus
          : statusCode >= 200 && statusCode < 400
        : true;
    const okLatency =
      typeof maxLatencyMs === "number" && typeof effectiveLatency === "number"
        ? effectiveLatency <= maxLatencyMs
        : true;
    const requiresText =
      typeof expectedText === "string" && expectedText.length > 0;
    const okText = requiresText
      ? typeof bodyText === "string"
        ? bodyText.includes(expectedText)
        : false
      : true;

    const computedOk =
      typeof ok === "boolean"
        ? ok
        : typeof success === "boolean"
        ? success
        : okStatus && okLatency && okText;

    const hit = {
      id: `hit-${Date.now()}`,
      serviceId,
      workspaceId: ctx.config.workspace.id,
      timestamp: Date.now(),
      statusCode,
      latencyMs: effectiveLatency,
      ok: computedOk,
      success: computedOk,
      expectedLatencyMs: maxLatencyMs,
      reason: pickReason({
        okStatus,
        okLatency,
        okText,
        body: ctx.body,
      }),
    };

    const historyLimit = service.historyLimit || defaults.historyLimit || 5000;
    const stored = await recordHit(serviceId, hit, historyLimit);

    ctx.json(201, {
      stored: true,
      ok: stored.ok,
      serviceId,
      workspaceId: stored.workspaceId,
    });
  } catch (err) {
    console.error("[routes] POST /hits error:", err.message);
    ctx.json(500, { error: "Failed to record hit" });
  }
};

export const GET = async (_req, _res, ctx) => {
  try {
    ctx.json(200, {
      message:
        "POST to /hits with { serviceId, statusCode, latencyMs, ok? } to record datapoints",
      workspaceId: ctx.config.workspace.id,
    });
  } catch (err) {
    console.error("[routes] GET /hits error:", err.message);
    ctx.json(500, { error: "Failed to load hits info" });
  }
};
