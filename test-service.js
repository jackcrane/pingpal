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

let envLoaded = false;

const parseArgs = (parts) => {
  const args = {};
  for (let i = 0; i < parts.length; i += 1) {
    const token = parts[i];
    if (!token || !token.startsWith("--")) {
      continue;
    }
    const eqIndex = token.indexOf("=");
    if (eqIndex !== -1) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }
    const key = token.slice(2);
    const next = parts[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
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
    console.error("Usage: test-service.js --id SERVICE_ID [--config path]");
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

  const service =
    Array.isArray(config.services) &&
    config.services.find((svc) => svc.id === serviceId);
  if (!service) {
    console.error(`Service with id "${serviceId}" was not found.`);
    process.exit(1);
  }

  if (!service.url) {
    console.error(
      `Service "${serviceId}" does not define a URL that can be tested.`
    );
    process.exit(1);
  }

  const defaults = config.defaults || {};
  const expectedStatus = service.expectedStatus ?? defaults.expectedStatus ?? 200;
  const expectedText = service.expectedText ?? null;
  const timeoutMs = service.timeoutMs ?? defaults.timeoutMs ?? 10000;
  const maxLatencyMs = service.maxLatencyMs ?? defaults.maxLatencyMs ?? null;
  const method = service.method ?? defaults.method ?? "GET";
  const headers = buildHeaders(defaults.headers || {}, service.headers || {});

  let resolveHttpTarget;
  try {
    const signingLib = await ensureSigningLib(envPath);
    resolveHttpTarget = signingLib.resolveHttpTarget;
  } catch (err) {
    console.error(`Failed to load signing utilities: ${err.message}`);
    process.exit(1);
  }

  let targetUrl;
  try {
    targetUrl = resolveHttpTarget(service.url);
  } catch (err) {
    console.error(
      `Could not resolve URL for service "${serviceId}": ${err.message}`
    );
    process.exit(1);
  }

  const startedAt = Date.now();
  let response;
  let bodyText = "";
  try {
    response = await fetchWithTimeout(
      targetUrl,
      { method, headers },
      timeoutMs
    );
    bodyText = await response.text();
  } catch (err) {
    logFailure(
      `Request to ${targetUrl} failed (${serviceId}): ${err.message || err}`
    );
    process.exit(1);
  }

  const latency = Date.now() - startedAt;
  const failures = [];
  if (expectedStatus && response.status !== expectedStatus) {
    failures.push(
      `Expected status ${expectedStatus} but received ${response.status}`
    );
  }
  if (expectedText && !bodyText.includes(expectedText)) {
    failures.push(`Response body did not include expected text "${expectedText}"`);
  }
  if (maxLatencyMs && latency > maxLatencyMs) {
    failures.push(
      `Latency ${latency}ms exceeded limit of ${maxLatencyMs}ms`
    );
  }

  if (failures.length > 0) {
    logFailure(`${serviceId}: ${failures.join("; ")}`);
    process.exit(1);
  }

  logSuccess(
    `${serviceId} responded in ${latency}ms with status ${response.status}`
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
