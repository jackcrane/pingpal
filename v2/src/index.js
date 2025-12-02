import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { loadRoutes, Router } from "./lib/router.js";
import { loadConfig } from "./lib/config.js";
import { getRedisClient } from "./lib/redis.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const routes = await loadRoutes({
  routesDir: path.join(__dirname, "routes"),
});

const router = new Router({
  routes,
  configLoader: loadConfig,
  getRedisClient,
});

const port = process.env.PORT || 2000;
const server = http.createServer(async (req, res) => {
  await router.handle(req, res);
});

server.listen(port, () => {
  console.log(`PingPal v2 backend listening on :${port}`);
});
