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
const ENGINE_MODULE_URL = pathToFileURL(
  path.resolve(__dirname, "v2/src/lib/serviceEngine.js")
).href;

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

const loadModules = async (envPath = DEFAULT_ENV_PATH) => {
  loadEnvFile(envPath);
  const [signingLib, engineLib] = await Promise.all([
    import(SIGNING_MODULE_URL),
    import(ENGINE_MODULE_URL),
  ]);
  return { signingLib, engineLib };
};

const describeFailure = ({ type, result, maxLatencyMs }) => {
  const parts = [];
  if (result.error) parts.push(result.error);
  switch (result.reason) {
    case "STATUS_CODE":
      parts.push(`Unexpected status ${result.statusCode ?? "unknown"}`);
      break;
    case "EXPECTED_TEXT":
      parts.push("Missing expected text");
      break;
    case "LATENCY":
      if (typeof maxLatencyMs === "number" && typeof result.latencyMs === "number") {
        parts.push(`Latency ${result.latencyMs}ms > ${maxLatencyMs}ms`);
      } else {
        parts.push("Latency exceeded limit");
      }
      break;
    case "ROW_COUNT":
      parts.push(
        `Row count ${result.details?.rowCount ?? "?"} outside acceptance window`
      );
      break;
    case "UNEXPECTED_RESPONSE":
      if (result.details?.response) {
        parts.push(`Unexpected response: ${result.details.response}`);
      }
      break;
    case "REQUEST_FAILURE":
      if (!result.error) parts.push("Request failed");
      break;
    default:
      if (result.reason) parts.push(result.reason);
      break;
  }
  if (parts.length === 0) {
    parts.push("Unknown failure");
  }
  return `${type} check failed: ${parts.join("; ")}`;
};

const summarizeSuccess = ({ serviceId, type, result }) => {
  if (type === "http") {
    return `${serviceId} (${type}) responded in ${
      result.latencyMs ?? "?"
    }ms with status ${result.statusCode ?? "unknown"}`;
  }
  if (type === "postgres" || type === "mysql") {
    return `${serviceId} (${type}) query returned ${
      result.details?.rowCount ?? "?"
    } rows in ${result.latencyMs ?? "?"}ms`;
  }
  if (type === "redis") {
    const response =
      typeof result.details?.response === "string"
        ? result.details.response.trim()
        : "";
    return `${serviceId} (${type}) ping responded "${response || "PONG"}" in ${
      result.latencyMs ?? "?"
    }ms`;
  }
  if (type === "rabbitmq") {
    const server = result.details?.server;
    const label = server
      ? `${server.product || "server"} ${server.version || ""}`.trim()
      : "server";
    return `${serviceId} (${type}) connected to ${label} in ${
      result.latencyMs ?? "?"
    }ms`;
  }
  return `${serviceId} (${type}) completed in ${result.latencyMs ?? "?"}ms`;
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
  let engineLib;
  try {
    ({ signingLib, engineLib } = await loadModules(envPath));
  } catch (err) {
    console.error(`Failed to load dependencies: ${err.message}`);
    process.exit(1);
  }

  const { runServiceCheck, resolveServiceType } = engineLib;
  const resolvedType = resolveServiceType(service, defaults);
  const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs ?? null;

  let resultPayload;
  try {
    resultPayload = await runServiceCheck({
      service,
      defaults,
      resolveHttpTarget: signingLib.resolveHttpTarget,
      resolveConnectionString: signingLib.resolveConnectionString,
      type: resolvedType,
    });
  } catch (err) {
    console.error(
      `[FAIL] ${serviceId} (${resolvedType}) could not be tested: ${err.message}`
    );
    process.exit(1);
  }

  const { type, result } = resultPayload;
  if (!result || typeof result !== "object") {
    console.error(`[FAIL] ${serviceId} (${type}) produced no result`);
    process.exit(1);
  }

  if (!result.ok) {
    console.error(
      `[FAIL] ${serviceId}: ${describeFailure({
        type,
        result,
        maxLatencyMs,
      })}`
    );
    process.exit(1);
  }

  console.log(`[OK] ${summarizeSuccess({ serviceId, type, result })}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
