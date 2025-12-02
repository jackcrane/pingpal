import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : path.resolve(__dirname, "../../../config/pingpal.config.json");

let cachedConfig = null;
let cachedMtime = null;

const readConfigFromDisk = () => {
  try {
    const stat = fs.statSync(DEFAULT_CONFIG_PATH);
    if (cachedConfig && cachedMtime === stat.mtimeMs) {
      return cachedConfig;
    }
    const contents = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(contents);
    cachedConfig = parsed;
    cachedMtime = stat.mtimeMs;
    return parsed;
  } catch (err) {
    console.error("Unable to read config file", DEFAULT_CONFIG_PATH, err);
    return {
      workspace: {
        id: "default",
        name: "PingPal",
        description: "Default workspace",
      },
      defaults: {},
      services: [],
    };
  }
};

export const loadConfig = () => {
  const raw = readConfigFromDisk();
  const workspace = {
    id: raw.workspace?.id || "default",
    name: raw.workspace?.name || "PingPal",
    description:
      raw.workspace?.description || "Self-hosted PingPal status workspace",
  };
  const defaults = raw.defaults || {};
  const services = Array.isArray(raw.services) ? raw.services : [];
  return { workspace, defaults, services };
};

export const getWorkspace = (config) => config.workspace;

export const getService = (config, serviceId) =>
  config.services.find((s) => s.id === serviceId);
