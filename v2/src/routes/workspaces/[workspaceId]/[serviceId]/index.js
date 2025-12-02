import { bucketizeHits, buildOutages } from "../../../../lib/analytics.js";
import { fetchHits } from "../../../../lib/store.js";

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
  if (!value || typeof value !== "string") return 30 * 24 * 60 * 60 * 1000;
  const match = value.match(/^([0-9]+)([smhdw])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
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
      return 30 * 24 * 60 * 60 * 1000;
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

  const intervalMs = parseInterval(ctx.query.interval || "30d");
  const bucketCount = Math.max(
    1,
    Math.min(500, parseInt(ctx.query.bucketCount || "100", 10))
  );

  const now = Date.now();
  const rangeEndMs = now;
  const rangeStartMs = rangeEndMs - intervalMs;
  const hits = await fetchHits(serviceId, rangeStartMs, rangeEndMs);

  const { buckets, averaged_data, success_percentage } = bucketizeHits(hits, {
    bucketCount,
    intervalMs,
    rangeEndMs,
  });
  const criticalSeconds = resolveCriticalSeconds(ctx, service);
  const minimumDurationMs = Math.max(0, criticalSeconds * 1000);
  const outages = buildOutages(hits, {
    serviceId: service.id,
    outageComments: service.outageComments || [],
    minimumDurationMs,
  }).map((outage) => ({
    id: outage.id,
    status: outage.status,
    start: outage.start,
    end: outage.end,
    createdAt: outage.createdAt,
    resolvedAt: outage.resolvedAt,
    comments: outage.comments,
  }));

  const hasHits = Array.isArray(hits) && hits.length > 0;
  const hasBucketData = (buckets || []).some((b) => b.total > 0);
  let message = null;
  if (!hasHits) {
    message = "No data collected yet for this service";
  } else if (!hasBucketData) {
    message = "No bucket data available for this service";
  }

  const hitsConsidered = Array.isArray(hits) ? hits.length : 0;

  ctx.json(200, {
    service: {
      id: service.id,
      name: service.name,
      url: service.url,
    },
    success_percentage,
    averaged_data: hasHits ? averaged_data : null,
    data: buckets,
    outages,
    meta: {
      intervalMs,
      bucketCount,
      hits_considered: hitsConsidered,
      generatedAt: new Date(rangeEndMs).toISOString(),
      rangeStartMs,
      rangeEndMs,
      criticalOutageSeconds: criticalSeconds,
      ...(message ? { message } : {}),
    },
  });
};
