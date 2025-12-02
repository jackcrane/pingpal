import fs from "fs/promises";
import path from "path";

export const CONFIG_PATH =
  process.env.CONFIG_PATH ||
  path.join(process.cwd(), "config", "pingpal.config.json");

const DEFAULT_SERVICE = {
  method: "GET",
  expectedStatus: 200,
  expectedText: "",
  maxLatencyMs: 3000,
  timeoutMs: 10000,
  intervalSeconds: 60,
  historyLimit: 200,
  failureLimit: 50,
  headers: {},
  body: null,
};

let cachedConfig = null;
let cachedMtimeMs = 0;

function normalizeService(service, defaults) {
  const normalized = {
    ...DEFAULT_SERVICE,
    ...defaults,
    ...service,
  };

  normalized.id = String(normalized.id || "").trim();
  normalized.name = normalized.name || normalized.id;
  normalized.method = normalized.method.toUpperCase();
  normalized.headers = normalized.headers || {};
  normalized.body = normalized.body ?? null;
  normalized.expectedText = normalized.expectedText || "";
  normalized.maxLatencyMs = Number(normalized.maxLatencyMs);
  normalized.timeoutMs = Number(normalized.timeoutMs || normalized.maxLatencyMs * 2);
  normalized.intervalSeconds = Math.max(
    5,
    Number(normalized.intervalSeconds || DEFAULT_SERVICE.intervalSeconds)
  );
  normalized.historyLimit = Math.max(1, Number(normalized.historyLimit));
  normalized.failureLimit = Math.max(1, Number(normalized.failureLimit));

  return normalized;
}

function validateConfig(services) {
  const ids = new Set();
  for (const service of services) {
    if (!service.id) {
      throw new Error("Every service must have an id");
    }
    if (ids.has(service.id)) {
      throw new Error(`Duplicate service id detected: ${service.id}`);
    }
    ids.add(service.id);
  }
}

export async function loadConfig(force = false) {
  const stat = await fs.stat(CONFIG_PATH);
  if (!force && cachedConfig && stat.mtimeMs === cachedMtimeMs) {
    return cachedConfig;
  }

  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const defaults = { ...DEFAULT_SERVICE, ...(parsed.defaults || {}) };
  const services = (parsed.services || []).map((service) =>
    normalizeService(service, defaults)
  );

  validateConfig(services);

  cachedConfig = {
    path: CONFIG_PATH,
    defaults,
    services,
  };
  cachedMtimeMs = stat.mtimeMs;
  return cachedConfig;
}

export function getCachedConfig() {
  return cachedConfig;
}
