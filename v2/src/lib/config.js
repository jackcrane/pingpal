import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : path.resolve(__dirname, "../../../config/pingpal.config.json");

const CONFIG_URL =
  typeof process.env.CONFIG_URL === "string" &&
  process.env.CONFIG_URL.trim().length
    ? process.env.CONFIG_URL.trim()
    : null;
const CONFIG_REFRESH_INTERVAL_MS = (() => {
  const fallback = 60_000;
  const raw = Number(process.env.CONFIG_REFRESH_INTERVAL_MS);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(5_000, raw);
})();

let cachedConfig = null;
let cachedFileContents = null;
let cachedMtime = null;
let initialized = false;
let initPromise = null;
let refreshTimer = null;
let remoteRefreshPromise = null;

const normalizeConfig = (raw = {}) => {
  const workspace = {
    id: raw.workspace?.id || "default",
    name: raw.workspace?.name || "PingPal",
    description:
      raw.workspace?.description || "Self-hosted PingPal status workspace",
    createdAt: raw.workspace?.createdAt,
    footerLinks: raw.workspace?.footerLinks,
  };
  const defaults = raw.defaults || {};
  const services = Array.isArray(raw.services) ? raw.services : [];
  return { workspace, defaults, services };
};

const readConfigFromDisk = () => {
  try {
    const stat = fs.statSync(DEFAULT_CONFIG_PATH);
    if (cachedFileContents && cachedMtime === stat.mtimeMs) {
      return cachedFileContents;
    }
    const contents = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(contents);
    cachedFileContents = parsed;
    cachedMtime = stat.mtimeMs;
    return parsed;
  } catch (err) {
    throw new Error(
      `Unable to read config file at ${DEFAULT_CONFIG_PATH}: ${err.message}`
    );
  }
};

const fetchRemoteJson = (targetUrl) =>
  new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const lib = parsed.protocol === "https:" ? https : http;
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
          path: `${parsed.pathname}${parsed.search}`,
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            res.resume();
            reject(
              new Error(
                `Config fetch failed with status ${res.statusCode} from ${targetUrl}`
              )
            );
            return;
          }
          res.setEncoding("utf8");
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const parsedJson = JSON.parse(data || "{}");
              resolve(parsedJson);
            } catch (parseErr) {
              reject(
                new Error(
                  `Invalid JSON returned from ${targetUrl}: ${parseErr.message}`
                )
              );
            }
          });
        }
      );
      req.on("error", reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });

const refreshLocalConfig = () => {
  const raw = readConfigFromDisk();
  cachedConfig = normalizeConfig(raw);
  return cachedConfig;
};

const fetchAndStoreRemoteConfig = async () => {
  if (!CONFIG_URL) {
    return refreshLocalConfig();
  }
  const raw = await fetchRemoteJson(CONFIG_URL);
  cachedConfig = normalizeConfig(raw);
  return cachedConfig;
};

const refreshRemoteConfig = async ({ silent = false } = {}) => {
  if (!CONFIG_URL) {
    return refreshLocalConfig();
  }
  if (remoteRefreshPromise) {
    return remoteRefreshPromise;
  }
  remoteRefreshPromise = fetchAndStoreRemoteConfig()
    .then((config) => {
      if (!silent) {
        console.log(
          `[config] Remote configuration loaded from ${CONFIG_URL} at ${new Date().toISOString()}`
        );
      }
      return config;
    })
    .finally(() => {
      remoteRefreshPromise = null;
    });
  return remoteRefreshPromise;
};

const scheduleRemoteRefresh = () => {
  if (!CONFIG_URL || refreshTimer) return;
  refreshTimer = setInterval(() => {
    refreshRemoteConfig({ silent: true }).catch((err) => {
      if (!cachedConfig) {
        console.error("[config] Remote config refresh failed:", err.message);
      } else {
        console.warn("[config] Remote config refresh failed:", err.message);
      }
    });
  }, CONFIG_REFRESH_INTERVAL_MS);
  if (typeof refreshTimer.unref === "function") {
    refreshTimer.unref();
  }
};

export const initConfig = async () => {
  if (initialized) return cachedConfig;
  if (!initPromise) {
    initPromise = CONFIG_URL
      ? refreshRemoteConfig()
      : Promise.resolve(refreshLocalConfig());
    try {
      await initPromise;
      initialized = true;
      if (CONFIG_URL) {
        scheduleRemoteRefresh();
      }
    } catch (err) {
      initPromise = null;
      throw err;
    }
  }
  return initPromise;
};

export const loadConfig = () => {
  if (CONFIG_URL) {
    if (!cachedConfig) {
      throw new Error("Remote configuration has not been loaded yet");
    }
    return cachedConfig;
  }
  return refreshLocalConfig();
};

export const getWorkspace = (config) => config.workspace;

export const getService = (config, serviceId) =>
  config.services.find((s) => s.id === serviceId);
