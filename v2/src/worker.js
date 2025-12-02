import cron from "node-cron";
import { loadConfig } from "./lib/config.js";
import { recordHit } from "./lib/store.js";

const tickIntervalSeconds = 1;
const lastRun = new Map();

const computeOk = ({
  statusCode,
  latencyMs,
  expectedStatus,
  maxLatencyMs,
  body,
  expectedText,
}) => {
  const okStatus =
    typeof statusCode === "number"
      ? expectedStatus
        ? statusCode === expectedStatus
        : statusCode >= 200 && statusCode < 400
      : true;
  const okLatency =
    typeof maxLatencyMs === "number" && typeof latencyMs === "number"
      ? latencyMs <= maxLatencyMs
      : true;
  const requiresText =
    typeof expectedText === "string" && expectedText.length > 0;
  const okText = requiresText
    ? typeof body === "string"
      ? body.includes(expectedText)
      : false
    : true;
  return {
    okStatus,
    okLatency,
    okText,
    ok: okStatus && okLatency && okText,
    reason: okStatus
      ? okLatency
        ? okText
          ? undefined
          : "EXPECTED_TEXT"
        : "LATENCY"
      : "STATUS_CODE",
  };
};

const fetchWithTimeout = async (
  url,
  { timeoutMs = 10000, method = "GET", headers = {} }
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");
    clearTimeout(timer);
    return { statusCode: res.status, latencyMs, body: text };
  } catch (err) {
    clearTimeout(timer);
    return { error: err.message, latencyMs: Date.now() - started };
  }
};

const shouldRun = (serviceId, intervalMs) => {
  const previous = lastRun.get(serviceId);
  const now = Date.now();
  if (!previous) return true;
  return now - previous >= intervalMs;
};

const markRun = (serviceId) => {
  lastRun.set(serviceId, Date.now());
};

const runCheck = async (service, defaults, workspaceId) => {
  if (process.env.SKIP_SERVICE_CHECKS === "true") {
    console.log("Skipping service check");
    return;
  }

  const intervalSeconds =
    service.intervalSeconds || defaults.intervalSeconds || 60;
  const timeoutMs = service.timeoutMs || defaults.timeoutMs || 10000;
  const expectedStatus = service.expectedStatus ?? defaults.expectedStatus;
  const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs;
  const expectedText = service.expectedText ?? defaults.expectedText ?? null;
  const historyLimit = service.historyLimit || defaults.historyLimit || 5000;
  const method = service.method || defaults.method || "GET";
  const headers = service.headers || defaults.headers || {};

  if (!service.url) {
    console.warn(`Service ${service.id} has no URL configured; skipping`);
    return;
  }

  const intervalMs = intervalSeconds * 1000;
  if (!shouldRun(service.id, intervalMs)) return;
  markRun(service.id);

  const result = await fetchWithTimeout(service.url, {
    timeoutMs,
    method,
    headers,
  });
  const computed = computeOk({
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    expectedStatus,
    maxLatencyMs,
    body: result.body,
    expectedText,
  });
  const isError = Boolean(result.error);
  const finalOk = !isError && computed.ok;
  const reason = isError ? "REQUEST_FAILURE" : computed.reason;

  console.log(
    "[HIT] " + service.id,
    result.statusCode,
    result.latencyMs,
    finalOk,
    reason
  );

  await recordHit(
    service.id,
    {
      id: `hit-${Date.now()}`,
      workspaceId,
      timestamp: Date.now(),
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      ok: finalOk,
      success: finalOk,
      expectedLatencyMs: maxLatencyMs,
      reason,
      error: result.error,
    },
    historyLimit
  );
};

export const startWorker = () => {
  cron.schedule(`*/${tickIntervalSeconds} * * * * *`, async () => {
    try {
      const { workspace, services, defaults } = loadConfig();
      if (!services || services.length === 0) return;
      await Promise.all(
        services.map((service) =>
          runCheck(service, defaults || {}, workspace.id).catch((err) => {
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
