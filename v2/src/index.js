import fs from "fs";
import { promises as fsPromises } from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { loadRoutes, Router } from "./lib/router.js";
import { initConfig, loadConfig } from "./lib/config.js";
import { getRedisClient } from "./lib/redis.js";
import { validateEnv } from "./lib/env.js";
import { startWorker } from "./worker.js";

dotenv.config();
validateEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_PREFIX = process.env.API_PREFIX || "/api";
const STATIC_ASSETS_DIR = process.env.STATIC_ASSETS_DIR
  ? path.resolve(process.env.STATIC_ASSETS_DIR)
  : path.resolve(__dirname, "../public");
const STATIC_INDEX_FILE = path.join(STATIC_ASSETS_DIR, "index.html");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const getMimeType = (filePath) =>
  MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

const safeJoin = (base, target) => {
  const cleanedTarget = target.replace(/^\/+/, "");
  const resolved = path.normalize(path.join(base, cleanedTarget));
  if (!resolved.startsWith(base)) {
    return null;
  }
  return resolved;
};

const fileStat = async (targetPath) => {
  try {
    return await fsPromises.stat(targetPath);
  } catch {
    return null;
  }
};

const streamFile = (filePath, res) =>
  new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });

const serveStatic = async (req, res, requestUrl) => {
  if (!["GET", "HEAD"].includes(req.method || "")) return false;
  if (!fs.existsSync(STATIC_ASSETS_DIR)) return false;

  try {
    const requestPath = decodeURIComponent(requestUrl.pathname || "/");
    const joinedPath = safeJoin(STATIC_ASSETS_DIR, requestPath);
    if (!joinedPath) {
      res.statusCode = 403;
      res.end("Forbidden");
      return true;
    }

    let filePath = joinedPath;
    let stat = await fileStat(filePath);
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stat = await fileStat(filePath);
    }

    let servedFromIndex = false;
    if (!stat) {
      const hasExtension = path.extname(requestPath).length > 0;
      if (!hasExtension) {
        const fallbackStat = await fileStat(STATIC_INDEX_FILE);
        if (!fallbackStat) return false;
        filePath = STATIC_INDEX_FILE;
        stat = fallbackStat;
        servedFromIndex = true;
      } else {
        return false;
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", getMimeType(filePath));
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Cache-Control",
      servedFromIndex ? "no-cache" : "public, max-age=60"
    );

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    await streamFile(filePath, res);
    return true;
  } catch (err) {
    console.error("[static] Failed to serve asset:", err.message);
    res.statusCode = 500;
    res.end("Internal server error");
    return true;
  }
};

const buildRequestUrl = (req) => {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `http://${host}`);
};

const isApiRequest = (pathname) => {
  if (!pathname.startsWith("/")) return false;
  if (pathname === API_PREFIX) return true;
  return pathname.startsWith(`${API_PREFIX}/`);
};

const rewriteApiUrl = (requestUrl) => {
  const stripped =
    requestUrl.pathname.slice(API_PREFIX.length) || "/";
  return `${stripped.startsWith("/") ? stripped : `/${stripped}`}${
    requestUrl.search
  }`;
};

await initConfig();

const routes = await loadRoutes({
  routesDir: path.join(__dirname, "routes"),
});

// Ensure Redis connectivity at boot
await getRedisClient();

const router = new Router({
  routes,
  configLoader: loadConfig,
  getRedisClient,
});

const port = process.env.PORT || 2000;
const server = http.createServer(async (req, res) => {
  const requestUrl = buildRequestUrl(req);
  if (isApiRequest(requestUrl.pathname)) {
    const rewrittenUrl = rewriteApiUrl(requestUrl);
    const originalUrl = req.url;
    req.url = rewrittenUrl;
    await router.handle(req, res);
    req.url = originalUrl;
    return;
  }

  const servedStatic = await serveStatic(req, res, requestUrl);
  if (!servedStatic) {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`PingPal v2 backend listening on :${port}`);
});

startWorker();
