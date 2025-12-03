#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const DEFAULT_CONFIG_PATH = path.resolve(
  __dirname,
  "config/pingpal.config.json"
);
const DEFAULT_ENV_PATH = path.resolve(__dirname, "v2/.env");
const SIGNING_MODULE_URL = pathToFileURL(
  path.resolve(__dirname, "v2/src/lib/signing.js")
).href;

const dbTypes = new Set(["postgres", "postgresql", "mysql"]);

const loadLocalModule = (specifier) => {
  try {
    return require(specifier);
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND" || !err.message.includes(specifier)) {
      throw err;
    }
    const altPath = path.resolve(
      __dirname,
      "v2/node_modules",
      ...specifier.split("/")
    );
    try {
      return require(altPath);
    } catch (altErr) {
      if (altErr.code === "MODULE_NOT_FOUND") {
        throw new Error(
          `Unable to load "${specifier}". Install dependencies in ./v2 or from root.`
        );
      }
      throw altErr;
    }
  }
};

const { Client: PgClient } = loadLocalModule("pg");
const mysql = loadLocalModule("mysql2/promise");
const { createClient: createRedisClient } = loadLocalModule("redis");
const amqplib = loadLocalModule("amqplib");

let envLoaded = false;

const parseArgs = (parts) => {
  const args = {};
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    if (!token || !token.startsWith("--")) continue;
    const eqIndex = token.indexOf("=");
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }
    const key = token.slice(2);
    const next = parts[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
      continue;
    }
    args[key] = true;
  }
  return args;
};

const loadEnvFile = (envPath = DEFAULT_ENV_PATH) => {
  if (envLoaded) return;
  envLoaded = true;
  let contents;
  try {
    contents = fs.readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = value;
      }
    });
};

const loadConfig = (configPath) => {
  const resolved = path.resolve(configPath);
  const raw = fs.readFileSync(resolved, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Config at ${resolved} is not valid JSON: ${err.message}`);
  }
};

const ensureSigningLib = async (envPath = DEFAULT_ENV_PATH) => {
  loadEnvFile(envPath);
  return import(SIGNING_MODULE_URL);
};

const buildHeaders = (defaults = {}, overrides = {}) => {
  const merged = { ...defaults };
  Object.entries(overrides).forEach(([key, value]) => {
    merged[key] = value;
  });
  return merged;
};

const fetchWithTimeout = async (url, options, timeoutMs) => {
  const fetchFn = global.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("Global fetch is not available. Use Node 18 or newer.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const withTimeout = (promise, timeoutMs, onTimeout) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (typeof onTimeout === "function") {
        Promise.resolve(onTimeout()).catch(() => {});
      }
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
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

const resolveAcceptanceValue = (service, defaults = {}, key) => {
  if (service && Object.prototype.hasOwnProperty.call(service, key)) {
    return service[key];
  }
  if (
    service &&
    service.acceptance &&
    Object.prototype.hasOwnProperty.call(service.acceptance, key)
  ) {
    return service.acceptance[key];
  }
  if (defaults && Object.prototype.hasOwnProperty.call(defaults, key)) {
    return defaults[key];
  }
  if (
    defaults &&
    defaults.acceptance &&
    Object.prototype.hasOwnProperty.call(defaults.acceptance, key)
  ) {
    return defaults.acceptance[key];
  }
  return null;
};

const evaluateRowCountFailures = ({
  rowCount,
  expectedRows,
  minRows,
  maxRows,
}) => {
  if (!Number.isFinite(rowCount)) {
    return ["Row count was not a finite number"];
  }
  const issues = [];
  if (expectedRows !== null && expectedRows !== undefined) {
    if (rowCount !== expectedRows) {
      issues.push(`Expected ${expectedRows} rows but received ${rowCount}`);
    }
  }
  if (minRows !== null && minRows !== undefined) {
    if (rowCount < minRows) {
      issues.push(`Expected at least ${minRows} rows but received ${rowCount}`);
    }
  }
  if (maxRows !== null && maxRows !== undefined) {
    if (rowCount > maxRows) {
      issues.push(`Expected at most ${maxRows} rows but received ${rowCount}`);
    }
  }
  return issues;
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
    return {
      error: err.message || String(err),
      latencyMs: Date.now() - started,
    };
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
    return {
      error: err.message || String(err),
      latencyMs: Date.now() - started,
    };
  } finally {
    await close();
  }
};

const runDatabaseCheck = async ({
  type,
  connectionString,
  query,
  timeoutMs,
  expectedRows,
  minRows,
  maxRows,
}) => {
  const runner = type === "mysql" ? runMysqlQuery : runPostgresQuery;
  const result = await runner({ connectionString, query, timeoutMs });
  const failures = [];
  if (result.error) {
    failures.push(result.error);
  } else {
    failures.push(
      ...evaluateRowCountFailures({
        rowCount: result.rowCount,
        expectedRows,
        minRows,
        maxRows,
      })
    );
  }
  return {
    failures,
    latencyMs: result.latencyMs ?? null,
    rowCount: result.rowCount ?? null,
  };
};

const runRedisCheck = async ({ connectionString, timeoutMs }) => {
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
      const response = await client.ping();
      return { response };
    };
    const { response } = await withTimeout(runner(), timeoutMs, close);
    const latencyMs = Date.now() - started;
    const normalized =
      typeof response === "string" ? response.trim().toUpperCase() : "";
    const failures =
      normalized === "PONG"
        ? []
        : [`Expected PONG response but received "${response ?? ""}"`];
    return {
      failures,
      latencyMs,
      response: response ?? null,
    };
  } catch (err) {
    return {
      failures: [err.message || String(err)],
      latencyMs: Date.now() - started,
      response: null,
    };
  } finally {
    await close();
  }
};

const runRabbitCheck = async ({ connectionString, timeoutMs }) => {
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
      return { server: serverProps };
    };
    const { server } = await withTimeout(runner(), timeoutMs, close);
    return {
      failures: [],
      latencyMs: Date.now() - started,
      server:
        server && typeof server === "object"
          ? {
              product: server.product,
              version: server.version,
            }
          : null,
    };
  } catch (err) {
    return {
      failures: [err.message || String(err)],
      latencyMs: Date.now() - started,
      server: null,
    };
  } finally {
    await close();
  }
};

const runHttpCheck = async ({
  targetUrl,
  method,
  headers,
  timeoutMs,
  expectedStatus,
  expectedText,
}) => {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(
      targetUrl,
      { method, headers },
      timeoutMs
    );
    const bodyText = await response.text();
    const latency = Date.now() - startedAt;
    const failures = [];
    if (expectedStatus && response.status !== expectedStatus) {
      failures.push(
        `Expected status ${expectedStatus} but received ${response.status}`
      );
    }
    if (expectedText && !bodyText.includes(expectedText)) {
      failures.push(
        `Response body did not include expected text "${expectedText}"`
      );
    }
    return {
      failures,
      latencyMs: latency,
      status: response.status,
    };
  } catch (err) {
    return {
      failures: [err.message || String(err)],
      latencyMs: Date.now() - startedAt,
      status: null,
    };
  }
};

const logFailure = (message) => {
  console.error(`[FAIL] ${message}`);
};

const logSuccess = (message) => {
  console.log(`[OK] ${message}`);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const serviceId = args.id ?? args["service-id"];
  if (!serviceId) {
    console.error(
      "Usage: test-service.js --id SERVICE_ID [--config path] [--env path]"
    );
    process.exit(1);
  }

  const configPath = path.resolve(args.config || DEFAULT_CONFIG_PATH);
  const envPath = path.resolve(args.env || DEFAULT_ENV_PATH);

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const defaults = config.defaults || {};
  const service =
    Array.isArray(config.services) &&
    config.services.find((svc) => svc.id === serviceId);
  if (!service) {
    console.error(`Service with id "${serviceId}" was not found.`);
    process.exit(1);
  }

  let signingLib;
  try {
    signingLib = await ensureSigningLib(envPath);
  } catch (err) {
    console.error(`Failed to load signing utilities: ${err.message}`);
    process.exit(1);
  }
  const { resolveHttpTarget, resolveConnectionString } = signingLib;

  const expectedStatus =
    service.expectedStatus ?? defaults.expectedStatus ?? 200;
  const expectedText = service.expectedText ?? null;
  const timeoutMs = service.timeoutMs ?? defaults.timeoutMs ?? 10000;
  const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs ?? null;
  const method = service.method ?? defaults.method ?? "GET";
  const headers = buildHeaders(defaults.headers || {}, service.headers || {});
  const typeRaw =
    typeof service.type === "string"
      ? service.type
      : typeof defaults.type === "string"
      ? defaults.type
      : "http";
  const type = typeRaw.toLowerCase();

  let result = null;
  if (dbTypes.has(type)) {
    const connectionTarget =
      service.connectionString || service.connection || null;
    const query = service.query || service.sql || null;
    if (!connectionTarget) {
      logFailure(
        `Service "${serviceId}" (${type}) does not define a connectionString`
      );
      process.exit(1);
    }
    if (!query) {
      logFailure(`Service "${serviceId}" (${type}) does not define a query`);
      process.exit(1);
    }
    let resolved;
    try {
      resolved = resolveConnectionString(connectionTarget);
    } catch (err) {
      logFailure(
        `Unable to resolve connection string for "${serviceId}": ${err.message}`
      );
      process.exit(1);
    }
    const expectedRows = resolveAcceptanceValue(
      service,
      defaults,
      "expectedRows"
    );
    const minRows = resolveAcceptanceValue(service, defaults, "minRows");
    const maxRows = resolveAcceptanceValue(service, defaults, "maxRows");
    result = await runDatabaseCheck({
      type: type === "postgresql" ? "postgres" : type,
      connectionString: resolved,
      query,
      timeoutMs,
      expectedRows,
      minRows,
      maxRows,
    });
    if (!result.failures.length && typeof result.rowCount === "number") {
      result.summary = `${serviceId} (${type}) query returned ${
        result.rowCount
      } rows in ${result.latencyMs ?? "?"}ms`;
    }
  } else if (type === "redis") {
    const connectionTarget =
      service.connectionString || service.connection || service.url || null;
    if (!connectionTarget) {
      logFailure(
        `Service "${serviceId}" (${type}) does not define a connectionString`
      );
      process.exit(1);
    }
    let resolved;
    try {
      resolved = resolveConnectionString(connectionTarget);
    } catch (err) {
      logFailure(
        `Unable to resolve connection string for "${serviceId}": ${err.message}`
      );
      process.exit(1);
    }
    result = await runRedisCheck({
      connectionString: resolved,
      timeoutMs,
    });
    if (!result.failures.length) {
      const response =
        typeof result.response === "string" ? result.response.trim() : "";
      result.summary = `${serviceId} (${type}) responded "${response}" in ${
        result.latencyMs ?? "?"
      }ms`;
    }
  } else if (type === "rabbitmq" || type === "amqp") {
    const connectionTarget =
      service.connectionString || service.connection || service.url || null;
    if (!connectionTarget) {
      logFailure(
        `Service "${serviceId}" (${type}) does not define a connectionString`
      );
      process.exit(1);
    }
    let resolved;
    try {
      resolved = resolveConnectionString(connectionTarget);
    } catch (err) {
      logFailure(
        `Unable to resolve connection string for "${serviceId}": ${err.message}`
      );
      process.exit(1);
    }
    result = await runRabbitCheck({
      connectionString: resolved,
      timeoutMs,
    });
    if (!result.failures.length) {
      const serverInfo = result.server
        ? `${result.server.product || "server"} ${
            result.server.version || ""
          }`.trim()
        : "server";
      result.summary = `${serviceId} (${type}) connected to ${serverInfo} in ${
        result.latencyMs ?? "?"
      }ms`;
    }
  } else if (type === "http") {
    if (!service.url) {
      logFailure(`Service "${serviceId}" does not define a URL to test`);
      process.exit(1);
    }
    let targetUrl;
    try {
      targetUrl = resolveHttpTarget(service.url);
    } catch (err) {
      logFailure(
        `Could not resolve URL for service "${serviceId}": ${err.message}`
      );
      process.exit(1);
    }
    result = await runHttpCheck({
      targetUrl,
      method,
      headers,
      timeoutMs,
      expectedStatus,
      expectedText,
    });
    if (!result.failures.length) {
      result.summary = `${serviceId} (${type}) responded in ${
        result.latencyMs ?? "?"
      }ms with status ${result.status}`;
    }
  } else {
    logFailure(`Service "${serviceId}" has unsupported type "${type}"`);
    process.exit(1);
  }

  if (!result) {
    logFailure(`No result was produced for "${serviceId}"`);
    process.exit(1);
  }

  const failures = Array.isArray(result.failures) ? [...result.failures] : [];
  if (
    typeof maxLatencyMs === "number" &&
    typeof result.latencyMs === "number" &&
    result.latencyMs > maxLatencyMs
  ) {
    failures.push(
      `Latency ${result.latencyMs}ms exceeded limit of ${maxLatencyMs}ms`
    );
  }

  if (failures.length > 0) {
    logFailure(
      `${serviceId} (${type}) failed: ${failures
        .filter(Boolean)
        .join("; ")}`.trim()
    );
    process.exit(1);
  }

  const message =
    result.summary ||
    `${serviceId} (${type}) completed in ${result.latencyMs ?? "?"}ms`;
  logSuccess(message);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
