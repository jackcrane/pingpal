import cron from "node-cron";
import mysql from "mysql2/promise";
import amqplib from "amqplib";
import { createClient as createRedisClient } from "redis";
import { Client as PgClient } from "pg";
import { loadConfig } from "./lib/config.js";
import { recordHit } from "./lib/store.js";
import {
  resolveConnectionString,
  resolveHttpTarget,
  SecretDecipherError,
  UNDECIPHERABLE_REASON,
} from "./lib/signing.js";
import { handleNotifications } from "./lib/notifications.js";

const tickIntervalSeconds = 1;
const lastRun = new Map();
const dbTypes = new Set(["postgres", "mysql"]);

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

const computeSqlOk = ({
  rowCount,
  latencyMs,
  maxLatencyMs,
  expectedRows,
  minRows,
  maxRows,
}) => {
  const normalizedRowCount = Number.isFinite(rowCount) ? rowCount : 0;
  const okLatency =
    typeof maxLatencyMs === "number" && typeof latencyMs === "number"
      ? latencyMs <= maxLatencyMs
      : true;
  const matchesExact =
    typeof expectedRows === "number"
      ? normalizedRowCount === expectedRows
      : true;
  const meetsMin =
    typeof minRows === "number" ? normalizedRowCount >= minRows : true;
  const meetsMax =
    typeof maxRows === "number" ? normalizedRowCount <= maxRows : true;
  const okRows = matchesExact && meetsMin && meetsMax;
  return {
    okLatency,
    okRows,
    ok: okRows && okLatency,
    reason: okRows ? (okLatency ? undefined : "LATENCY") : "ROW_COUNT",
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

const coerceNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
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

const resolveAcceptanceValue = (service, defaults, key) => {
  const safeService = service || {};
  const safeDefaults = defaults || {};
  if (
    safeService.acceptance &&
    Object.prototype.hasOwnProperty.call(safeService.acceptance, key)
  ) {
    const coerced = coerceNumber(safeService.acceptance[key]);
    if (coerced !== undefined) return coerced;
  }
  if (Object.prototype.hasOwnProperty.call(safeService, key)) {
    const coerced = coerceNumber(safeService[key]);
    if (coerced !== undefined) return coerced;
  }
  if (
    safeDefaults.acceptance &&
    Object.prototype.hasOwnProperty.call(safeDefaults.acceptance, key)
  ) {
    const coerced = coerceNumber(safeDefaults.acceptance[key]);
    if (coerced !== undefined) return coerced;
  }
  if (Object.prototype.hasOwnProperty.call(safeDefaults, key)) {
    const coerced = coerceNumber(safeDefaults[key]);
    if (coerced !== undefined) return coerced;
  }
  return undefined;
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

const withTimeout = (promise, timeoutMs, onTimeout) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Promise.resolve(promise);
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      Promise.resolve(onTimeout?.())
        .catch(() => {})
        .finally(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        });
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
};

const runPostgresQuery = async ({ connectionString, query, timeoutMs }) => {
  const started = Date.now();
  const client = new PgClient({ connectionString });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await client.end();
    } catch {
      // ignore
    }
  };
  try {
    const runner = async () => {
      await client.connect();
      const response = await client.query(query);
      const rowCount =
        typeof response.rowCount === "number"
          ? response.rowCount
          : Array.isArray(response.rows)
          ? response.rows.length
          : 0;
      return { rowCount };
    };
    const { rowCount } = await withTimeout(runner(), timeoutMs, close);
    return { rowCount, latencyMs: Date.now() - started };
  } catch (err) {
    return { error: err.message, latencyMs: Date.now() - started };
  } finally {
    await close();
  }
};

const runMysqlQuery = async ({ connectionString, query, timeoutMs }) => {
  const started = Date.now();
  let connection = null;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore
      }
    }
  };
  try {
    const runner = async () => {
      connection = await mysql.createConnection(connectionString);
      const [rows] = await connection.query(query);
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      return { rowCount };
    };
    const { rowCount } = await withTimeout(runner(), timeoutMs, close);
    return { rowCount, latencyMs: Date.now() - started };
  } catch (err) {
    return { error: err.message, latencyMs: Date.now() - started };
  } finally {
    await close();
  }
};

const runHttpServiceCheck = async ({
  url,
  timeoutMs,
  expectedStatus,
  maxLatencyMs,
  expectedText,
  method,
  headers,
}) => {
  const result = await fetchWithTimeout(url, {
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
  return {
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    ok: finalOk,
    reason,
    error: result.error,
    details: null,
  };
};

const runDatabaseServiceCheck = async ({
  type,
  connectionString,
  query,
  timeoutMs,
  maxLatencyMs,
  expectedRows,
  minRows,
  maxRows,
}) => {
  const runner = type === "postgres" ? runPostgresQuery : runMysqlQuery;
  const result = await runner({ connectionString, query, timeoutMs });
  const rowCount = Number.isFinite(result.rowCount) ? result.rowCount : 0;
  const computed = computeSqlOk({
    rowCount,
    latencyMs: result.latencyMs,
    maxLatencyMs,
    expectedRows,
    minRows,
    maxRows,
  });
  const finalOk = !result.error && computed.ok;
  const reason = result.error ? "REQUEST_FAILURE" : computed.reason;
  return {
    statusCode: null,
    latencyMs: result.latencyMs,
    ok: finalOk,
    reason,
    error: result.error,
    details: { rowCount },
  };
};

const runRedisServiceCheck = async ({
  connectionString,
  timeoutMs,
  maxLatencyMs,
}) => {
  const started = Date.now();
  const client = createRedisClient({ url: connectionString });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await client.quit();
    } catch {
      // ignore
    }
  };
  try {
    const runner = async () => {
      await client.connect();
      const response = await client.ping("pingpal-healthcheck");
      return { response };
    };
    const { response } = await withTimeout(runner(), timeoutMs, close);
    const latencyMs = Date.now() - started;
    const normalized =
      typeof response === "string" ? response.trim().toUpperCase() : "";
    const pingOk = normalized === "PONG";
    const latencyOk =
      typeof maxLatencyMs === "number" && typeof latencyMs === "number"
        ? latencyMs <= maxLatencyMs
        : true;
    return {
      statusCode: null,
      latencyMs,
      ok: pingOk && latencyOk,
      reason: pingOk ? (latencyOk ? undefined : "LATENCY") : "UNEXPECTED_RESPONSE",
      error: null,
      details: { response: response ?? null },
    };
  } catch (err) {
    return {
      statusCode: null,
      latencyMs: Date.now() - started,
      ok: false,
      reason: "REQUEST_FAILURE",
      error: err.message,
      details: null,
    };
  } finally {
    await close();
  }
};

const runRabbitServiceCheck = async ({
  connectionString,
  timeoutMs,
  maxLatencyMs,
}) => {
  const started = Date.now();
  let connection = null;
  let channel = null;
  const close = async () => {
    if (channel) {
      try {
        await channel.close();
      } catch {
        // ignore
      } finally {
        channel = null;
      }
    }
    if (connection) {
      try {
        await connection.close();
      } catch {
        // ignore
      } finally {
        connection = null;
      }
    }
  };
  try {
    const runner = async () => {
      connection = await amqplib.connect(connectionString);
      channel = await connection.createChannel();
      await channel.assertQueue("", { exclusive: true, autoDelete: true });
      const serverProps =
        connection?.serverProperties ||
        connection?.connection?.serverProperties ||
        null;
      return {
        server: serverProps
          ? {
              product: serverProps.product,
              version: serverProps.version,
            }
          : null,
      };
    };
    const { server } = await withTimeout(runner(), timeoutMs, close);
    const latencyMs = Date.now() - started;
    const latencyOk =
      typeof maxLatencyMs === "number" && typeof latencyMs === "number"
        ? latencyMs <= maxLatencyMs
        : true;
    return {
      statusCode: null,
      latencyMs,
      ok: latencyOk,
      reason: latencyOk ? undefined : "LATENCY",
      error: null,
      details: server ? { server } : null,
    };
  } catch (err) {
    return {
      statusCode: null,
      latencyMs: Date.now() - started,
      ok: false,
      reason: "REQUEST_FAILURE",
      error: err.message,
      details: null,
    };
  } finally {
    await close();
  }
};

const runCheck = async (service, defaults, workspace) => {
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
  const notifications = resolveNotifications(service, defaults);
  const typeRaw =
    typeof service.type === "string"
      ? service.type
      : typeof defaults.type === "string"
      ? defaults.type
      : "http";
  const type = typeRaw.toLowerCase();
  const workspaceId = workspace?.id || "default";

  const intervalMs = intervalSeconds * 1000;
  if (!shouldRun(service.id, intervalMs)) return;
  markRun(service.id);

  let result = null;
  const handleUndecipherable = async (errorMessage) => {
    console.warn(
      `[HIT] ${service.id}:${type} undecipherable source: ${errorMessage}`
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
        type,
      },
      historyLimit
    );
  };
  if (dbTypes.has(type)) {
    const connectionString =
      service.connectionString || service.connection || null;
    const query = service.query || service.sql || null;
    if (!connectionString) {
      console.warn(
        `Service ${service.id} (${type}) is missing a connectionString; skipping`
      );
      return;
    }
    if (!query) {
      console.warn(
        `Service ${service.id} (${type}) is missing a query; skipping`
      );
      return;
    }
    let resolvedConnection = null;
    try {
      resolvedConnection = resolveConnectionString(connectionString);
    } catch (err) {
      if (err instanceof SecretDecipherError) {
        await handleUndecipherable(err.message);
        return;
      }
      throw err;
    }
    const expectedRows = resolveAcceptanceValue(service, defaults, "expectedRows");
    const minRows = resolveAcceptanceValue(service, defaults, "minRows");
    const maxRows = resolveAcceptanceValue(service, defaults, "maxRows");
    result = await runDatabaseServiceCheck({
      type,
      connectionString: resolvedConnection,
      query,
      timeoutMs,
      maxLatencyMs,
      expectedRows,
      minRows,
      maxRows,
    });
  } else if (type === "http") {
    let resolvedUrl = null;
    try {
      resolvedUrl = resolveHttpTarget(service.url);
    } catch (err) {
      if (err instanceof SecretDecipherError) {
        await handleUndecipherable(err.message);
        return;
      }
      throw err;
    }
    result = await runHttpServiceCheck({
      url: resolvedUrl,
      timeoutMs,
      expectedStatus,
      maxLatencyMs,
      expectedText,
      method,
      headers,
    });
  } else if (type === "redis") {
    const connectionTarget =
      service.connectionString || service.connection || service.url || null;
    if (!connectionTarget) {
      console.warn(
        `Service ${service.id} (${type}) is missing a connectionString; skipping`
      );
      return;
    }
    let resolvedConnection = null;
    try {
      resolvedConnection = resolveConnectionString(connectionTarget);
    } catch (err) {
      if (err instanceof SecretDecipherError) {
        await handleUndecipherable(err.message);
        return;
      }
      throw err;
    }
    result = await runRedisServiceCheck({
      connectionString: resolvedConnection,
      timeoutMs,
      maxLatencyMs,
    });
  } else if (type === "rabbitmq" || type === "amqp") {
    const connectionTarget =
      service.connectionString || service.connection || service.url || null;
    if (!connectionTarget) {
      console.warn(
        `Service ${service.id} (${type}) is missing a connectionString; skipping`
      );
      return;
    }
    let resolvedConnection = null;
    try {
      resolvedConnection = resolveConnectionString(connectionTarget);
    } catch (err) {
      if (err instanceof SecretDecipherError) {
        await handleUndecipherable(err.message);
        return;
      }
      throw err;
    }
    result = await runRabbitServiceCheck({
      connectionString: resolvedConnection,
      timeoutMs,
      maxLatencyMs,
    });
  } else {
    console.warn(`Service ${service.id} has unsupported type "${type}"; skipping`);
    return;
  }

  console.log(
    "[HIT]",
    `${service.id}:${type}`,
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
    type,
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
