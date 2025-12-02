import { buildOutages } from "../../../../../lib/analytics.js";
import { fetchHits } from "../../../../../lib/store.js";

const ensureWorkspace = (ctx) => {
  const requested = ctx.params.workspaceId;
  if (requested !== ctx.config.workspace.id) {
    ctx.json(404, { error: "Workspace not found" });
    return false;
  }
  return true;
};

const resolveCriticalSeconds = (ctx, service) => {
  const serviceValue = Number(service.criticalOutageSeconds);
  if (Number.isFinite(serviceValue)) return serviceValue;
  const defaultValue = Number(ctx.config.defaults?.criticalOutageSeconds);
  if (Number.isFinite(defaultValue)) return defaultValue;
  return 180;
};

const parseInterval = (value) => {
  if (!value || typeof value !== "string") return 90 * 24 * 60 * 60 * 1000;
  const match = value.match(/^([0-9]+)([smhdw])$/);
  if (!match) return 90 * 24 * 60 * 60 * 1000;
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    case "w":
      return amount * 7 * 24 * 60 * 60 * 1000;
    default:
      return 90 * 24 * 60 * 60 * 1000;
  }
};

export const GET = async (_req, _res, ctx) => {
  if (!ensureWorkspace(ctx)) return;
  const { serviceId } = ctx.params;
  const service = ctx.config.services.find((s) => s.id === serviceId);

  if (!service) {
    ctx.json(404, { error: "Service not found" });
    return;
  }

  const includeClosed = String(ctx.query.includeClosed || "false") === "true";
  const intervalMs = parseInterval(ctx.query.interval || "90d");
  const now = Date.now();
  const hits = await fetchHits(serviceId, now - intervalMs, now);
  const criticalSeconds = resolveCriticalSeconds(ctx, service);
  const minimumDurationMs = Math.max(0, criticalSeconds * 1000);
  const outages = buildOutages(hits, {
    serviceId: service.id,
    outageComments: service.outageComments || [],
    minimumDurationMs,
  });

  const filtered = includeClosed
    ? outages
    : outages.filter((outage) => outage.status === "OPEN");

  ctx.json(
    200,
    filtered.map((outage) => ({
      id: outage.id,
      status: outage.status,
      createdAt: outage.createdAt,
      resolvedAt: outage.resolvedAt,
    }))
  );
};
