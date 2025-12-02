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

export const GET = async (_req, _res, ctx) => {
  if (!ensureWorkspace(ctx)) return;
  const { serviceId, outageId } = ctx.params;
  const service = ctx.config.services.find((s) => s.id === serviceId);

  if (!service) {
    ctx.json(404, { error: "Service not found" });
    return;
  }

  const includeFailures =
    String(ctx.query.includeFailures || "false") === "true";
  const includeComments =
    String(ctx.query.includeComments || "false") === "true";
  const now = Date.now();
  const hits = await fetchHits(serviceId, 0, now);
  const criticalSeconds = resolveCriticalSeconds(ctx, service);
  const minimumDurationMs = Math.max(0, criticalSeconds * 1000);
  const configuredOutages =
    service.outage || service.outages || service.outageComments || [];
  const outages = buildOutages(hits, {
    serviceId: service.id,
    configuredOutages,
    minimumDurationMs,
  });
  const outage = outages.find((o) => o.id === outageId);

  if (!outage) {
    ctx.json(404, { error: "Outage not found" });
    return;
  }

  ctx.json(200, {
    id: outage.id,
    status: outage.status,
    createdAt: outage.createdAt,
    resolvedAt: outage.resolvedAt,
    title: outage.title || null,
    failures: includeFailures ? outage.failures || [] : [],
    comments: includeComments ? outage.comments || [] : [],
  });
};
