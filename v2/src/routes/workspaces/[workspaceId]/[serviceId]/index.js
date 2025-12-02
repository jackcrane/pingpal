import { bucketizeHits } from "../../../../lib/analytics.js";
import { fetchHits } from "../../../../lib/store.js";

const ensureWorkspace = (ctx) => {
  const requested = ctx.params.workspaceId;
  if (requested !== ctx.config.workspace.id) {
    ctx.json(404, { error: "Workspace not found" });
    return false;
  }
  return true;
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
  const hits = await fetchHits(serviceId, now - intervalMs, now);
  if (!hits || hits.length === 0) {
    ctx.json(200, {
      service: {
        id: service.id,
        name: service.name,
        url: service.url,
      },
      success_percentage: null,
      averaged_data: null,
      data: [],
      meta: {
        intervalMs,
        bucketCount,
        hits_considered: 0,
        generatedAt: new Date().toISOString(),
        message: "No data collected yet for this service",
      },
    });
    return;
  }

  const { buckets, averaged_data, success_percentage } = bucketizeHits(hits, {
    bucketCount,
    intervalMs,
  });
  const filteredBuckets = (buckets || []).filter((b) => b.total > 0);
  const hasBucketData = filteredBuckets.length > 0;
  if (!hasBucketData) {
    ctx.json(200, {
      service: {
        id: service.id,
        name: service.name,
        url: service.url,
      },
      success_percentage: null,
      averaged_data: null,
      data: [],
      meta: {
        intervalMs,
        bucketCount,
        hits_considered: hits.length,
        generatedAt: new Date().toISOString(),
        message: "No bucket data available for this service",
      },
    });
    return;
  }

  ctx.json(200, {
    service: {
      id: service.id,
      name: service.name,
      url: service.url,
    },
    success_percentage,
    averaged_data,
    data: filteredBuckets,
    meta: {
      intervalMs,
      bucketCount,
      hits_considered: hits.length,
      generatedAt: new Date().toISOString(),
    },
  });
};
