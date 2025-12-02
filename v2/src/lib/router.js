import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { parse as parseUrl } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const CACHE_TTL_MS = 50 * 1000;

const isDynamicSegment = (segment) =>
  segment.startsWith("[") && segment.endsWith("]");

const readDirectory = (dir) => fs.readdirSync(dir, { withFileTypes: true });

const buildRoutePath = (relativePath) => {
  const normalized = relativePath.replace(/\\/g, "/").replace(/\.js$/, "");
  const parts = normalized.split("/").filter(Boolean);
  return (
    "/" +
    parts
      .map((part) => {
        if (part === "index") return "";
        if (isDynamicSegment(part)) return `:${part.slice(1, -1)}`;
        return part;
      })
      .filter(Boolean)
      .join("/")
  );
};

const walkRoutes = (dir, parent = "") => {
  const entries = readDirectory(dir);
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(parent, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkRoutes(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push({ fullPath, relativePath });
    }
  }
  return files;
};

const parseBody = async (req) => {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve(null);
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
};

const matchRoute = (pathname, method, routes) => {
  const pathParts = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const { segments } = route;
    if (segments.length !== pathParts.length) continue;

    const params = {};
    let isMatch = true;

    for (let i = 0; i < segments.length; i++) {
      const routeSegment = segments[i];
      const requestSegment = pathParts[i];
      if (routeSegment.startsWith(":")) {
        params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
      } else if (routeSegment === requestSegment) {
        continue;
      } else {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return { ...route, params };
    }
  }
  return null;
};

export const loadRoutes = async ({ routesDir }) => {
  const absRoutesDir = path.resolve(routesDir);
  const files = walkRoutes(absRoutesDir);
  const routes = [];

  for (const file of files) {
    const routePath = buildRoutePath(file.relativePath);
    const moduleUrl = pathToFileURL(file.fullPath).href;
    const mod = await import(moduleUrl);
    for (const method of METHODS) {
      if (typeof mod[method] === "function") {
        const segments = routePath.split("/").filter(Boolean);
        routes.push({
          method,
          handler: mod[method],
          path: routePath,
          segments,
        });
      }
    }
  }

  // deterministic order so more specific routes stay before generic ones
  routes.sort((a, b) => b.segments.length - a.segments.length);
  return routes;
};

export class Router {
  constructor({ routes, configLoader, getRedisClient }) {
    this.routes = routes;
    this.configLoader = configLoader;
    this.getRedisClient = getRedisClient;
    this.cache = new Map();
  }

  json(res, statusCode, data, options = {}) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    const body = JSON.stringify(data);
    res.end(body);

    const { cacheKey, shouldCache } = options;
    if (
      shouldCache &&
      cacheKey &&
      statusCode >= 200 &&
      statusCode < 300
    ) {
      this.cache.set(cacheKey, {
        statusCode,
        body,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
  }

  getCachedResponse(cacheKey) {
    if (!cacheKey) return null;
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }
    return cached;
  }

  sendCachedResponse(res, cached) {
    res.statusCode = cached.statusCode;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end(cached.body);
  }

  async handle(req, res) {
    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader(
        "Access-Control-Allow-Methods",
        METHODS.map((m) => m).join(",")
      );
      res.end();
      return;
    }

    const parsedUrl = parseUrl(req.url, true);
    const match = matchRoute(parsedUrl.pathname, req.method, this.routes);

    const shouldCache = req.method === "GET";
    const cacheKey = shouldCache ? `${req.method}:${req.url}` : null;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.sendCachedResponse(res, cached);
      return;
    }

    if (!match) {
      this.json(res, 404, { error: "Route not found" });
      return;
    }

    let body = null;
    if (!["GET", "DELETE"].includes(req.method)) {
      try {
        body = await parseBody(req);
      } catch (err) {
        this.json(res, 400, { error: "Invalid JSON body" });
        return;
      }
    }

    let config;
    try {
      config = this.configLoader();
    } catch (err) {
      console.error("Configuration load error", err.message);
      this.json(res, 500, { error: "Configuration error" });
      return;
    }

    const ctx = {
      params: match.params,
      query: parsedUrl.query,
      body,
      config,
      json: (status, payload, options = {}) =>
        this.json(res, status, payload, {
          cacheKey,
          shouldCache: shouldCache && !options.skipCache,
        }),
      redis: this.getRedisClient ? this.getRedisClient() : null,
      req,
      res,
    };

    try {
      await match.handler(req, res, ctx);
    } catch (err) {
      console.error(`Error handling ${req.method} ${parsedUrl.pathname}`, err);
      this.json(res, 500, { error: "Internal server error" });
    }
  }
}
