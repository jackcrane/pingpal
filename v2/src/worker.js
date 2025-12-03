import cron from "node-cron";
import { loadConfig } from "./lib/config.js";
import { recordHit } from "./lib/store.js";
import {
  resolveConnectionString,
  resolveHttpTarget,
  SecretDecipherError,
  UNDECIPHERABLE_REASON,
} from "./lib/signing.js";
import { handleNotifications } from "./lib/notifications.js";
import {
  runServiceCheck,
  resolveServiceType,
  coerceNumber,
} from "./lib/serviceEngine.js";

const tickIntervalSeconds = 1;
const lastRun = new Map();
const shouldRun = (serviceId, intervalMs) => {
  const previous = lastRun.get(serviceId);
  const now = Date.now();
  if (!previous) return true;
  return now - previous >= intervalMs;
};

const markRun = (serviceId) => {
  lastRun.set(serviceId, Date.now());
};

const coerceBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const resolveNotifications = (service, defaults) => {
  const defaultOptions =
    defaults && typeof defaults.notifications === "object"
      ? defaults.notifications
      : {};
  const serviceOptions =
    service && typeof service.notifications === "object"
      ? service.notifications
      : {};
  const merged = { ...defaultOptions, ...serviceOptions };
  const threshold = coerceNumber(merged.degradedThresholdMs);
  return {
    notifyOnOutage: coerceBoolean(merged.notifyOnOutage, false),
    notifyOnRecovery: coerceBoolean(merged.notifyOnRecovery, false),
    notifyOnDegraded: coerceBoolean(merged.notifyOnDegraded, false),
    degradedThresholdMs:
      threshold !== undefined && Number.isFinite(threshold) ? threshold : null,
  };
};

const runCheck = async (service, defaults, workspace) => {
  if (process.env.SKIP_SERVICE_CHECKS === "true") {
    console.log("Skipping service check", service.id);
    return;
  }

  const intervalSeconds =
    service.intervalSeconds || defaults.intervalSeconds || 60;
  const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs;
  const historyLimit = service.historyLimit || defaults.historyLimit || 5000;
  const notifications = resolveNotifications(service, defaults);
  const requestedType = resolveServiceType(service, defaults);
  const workspaceId = workspace?.id || "default";

  const intervalMs = intervalSeconds * 1000;
  if (!shouldRun(service.id, intervalMs)) return;
  markRun(service.id);

  let result = null;
  let resolvedType = requestedType;
  const handleUndecipherable = async (errorMessage) => {
    console.warn(
      `[HIT] ${service.id}:${resolvedType} undecipherable source: ${errorMessage}`
    );
    await recordHit(
      service.id,
      {
        id: `hit-${Date.now()}`,
        workspaceId,
        timestamp: Date.now(),
        statusCode: null,
        latencyMs: null,
        ok: false,
        success: false,
        expectedLatencyMs: maxLatencyMs,
        reason: UNDECIPHERABLE_REASON,
        error: errorMessage,
        type: resolvedType,
      },
      historyLimit
    );
  };
  try {
    const engineResult = await runServiceCheck({
      service,
      defaults,
      resolveHttpTarget,
      resolveConnectionString,
      type: requestedType,
    });
    resolvedType = engineResult.type;
    result = engineResult.result;
  } catch (err) {
    if (err instanceof SecretDecipherError) {
      await handleUndecipherable(err.message);
      return;
    }
    console.warn(
      `[HIT] ${service.id}:${requestedType} failed to execute: ${err.message}`
    );
    return;
  }

  console.log(
    "[HIT]",
    `${service.id}:${resolvedType}`,
    result.statusCode ?? "-",
    result.latencyMs,
    result.ok,
    result.reason,
    result.details?.rowCount !== undefined
      ? `rows=${result.details.rowCount}`
      : ""
  );

  const timestamp = Date.now();
  const hitPayload = {
    id: `hit-${timestamp}`,
    workspaceId,
    timestamp,
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    ok: result.ok,
    success: result.ok,
    expectedLatencyMs: maxLatencyMs,
    reason: result.reason,
    error: result.error,
    type: resolvedType,
    details: result.details || undefined,
  };

  await recordHit(service.id, hitPayload, historyLimit);

  try {
    await handleNotifications({
      workspace: workspace || { id: workspaceId, name: workspaceId },
      service,
      notifications,
      hit: hitPayload,
    });
  } catch (err) {
    console.error(
      `[notify] Failed to process notifications for ${service.id}:`,
      err.message
    );
  }
};

export const startWorker = () => {
  cron.schedule(`*/${tickIntervalSeconds} * * * * *`, async () => {
    try {
      const { workspace, services, defaults } = loadConfig();
      if (!services || services.length === 0) return;
      await Promise.all(
        services.map((service) =>
          runCheck(service, defaults || {}, workspace).catch((err) => {
            console.error(
              `Worker error for service ${service.id}:`,
              err.message
            );
          })
        )
      );
    } catch (err) {
      console.error("Worker configuration error:", err.message);
    }
  });
  console.log("Worker scheduler started");
};
