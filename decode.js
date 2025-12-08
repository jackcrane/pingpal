#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { createRequire } = require("module");

const requireFromBackend = createRequire(
  path.resolve(__dirname, "v2/package.json")
);
const YAML = requireFromBackend("yaml");

const DEFAULT_CONFIG_PATH = path.resolve(
  __dirname,
  "config/pingpal.config.yaml"
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

const parseConfigString = (raw, location) => {
  try {
    return JSON.parse(raw);
  } catch (jsonErr) {
    try {
      return YAML.parse(raw);
    } catch (yamlErr) {
      const error = new Error(
        `Config at ${location} is not valid JSON or YAML: ${yamlErr.message}`
      );
      error.cause = yamlErr;
      error.jsonError = jsonErr;
      throw error;
    }
  }
};

const loadConfig = (configPath) => {
  const resolved = path.resolve(configPath);
  const raw = fs.readFileSync(resolved, "utf8");
  return parseConfigString(raw, resolved);
};

const ensureSigningLib = async (envPath = DEFAULT_ENV_PATH) => {
  loadEnvFile(envPath);
  return import(SIGNING_MODULE_URL);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const rawString = args.string;
  const serviceId = args["service-id"] ?? args.id;

  if (!rawString && !serviceId) {
    console.error(
      'Usage: decode.js (--string="enc:rsa:v1:...") | (--service-id=ID [--config path])'
    );
    process.exit(1);
  }
  if (rawString && serviceId) {
    console.error("Please supply either --string or --service-id, not both.");
    process.exit(1);
  }

  let payload = rawString;
  const envPath = path.resolve(args.env || DEFAULT_ENV_PATH);

  if (!payload) {
    const configPath = path.resolve(args.config || DEFAULT_CONFIG_PATH);
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
    if (!service.connectionString) {
      console.error(
        `Service "${serviceId}" does not define a connectionString to decode.`
      );
      process.exit(1);
    }
    payload = service.connectionString;
  }

  let decrypted;
  try {
    const { decryptValue } = await ensureSigningLib(envPath);
    decrypted = decryptValue(payload);
  } catch (err) {
    console.error(`Failed to decrypt value: ${err.message || err}`);
    process.exit(1);
  }

  console.log(decrypted);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
