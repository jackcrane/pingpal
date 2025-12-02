import cors from "cors";
import express from "express";
import { loadConfig } from "./src/config.js";
import { startMonitor, runServiceCheck } from "./src/monitor.js";
import { createRedisClient } from "./src/redis.js";
import {
  getRecentFailures,
  getRecentHits,
  getServiceState,
} from "./src/state.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ID = "default";

function parseIntervalToMs(interval = "30d") {
  const match = `${interval}`.match(/(\d+)([smhdw])/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // 30d
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] || multipliers.d);
}

function quantiles(numbers) {
  if (!numbers.length)
    return { q1: 0, median: 0, q3: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = (vals) => {
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  };
  const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2)));
  const q3 = median(sorted.slice(Math.ceil(sorted.length / 2)));
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { q1, median: median(sorted), q3, min, max, avg };
}

function buildBuckets({ hits, failures, bucketCount, intervalMs }) {
  const end = Date.now();
  const start = end - intervalMs;
  const bucketSize = intervalMs / bucketCount;
  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = start + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const bucketHits = hits.filter((h) => {
      const ts = new Date(
        h.checkedAt || h.createdAt || h.timestamp
      ).getTime();
      return ts >= bucketStart && ts < bucketEnd;
    });
    const bucketFailures = failures.filter((f) => {
      const ts = new Date(
        f.checkedAt || f.createdAt || f.timestamp
      ).getTime();
      return ts >= bucketStart && ts < bucketEnd;
    });
    const latencies = bucketHits.map((h) =>
      Number(h.latencyMs || h.latency || 0)
    );
    const q = quantiles(latencies);
    const successCount = bucketHits.length;
    const failureCount = bucketFailures.length;
    const total = successCount + failureCount;
    const success_percentage = total === 0 ? 100 : (successCount / total) * 100;
    buckets.push({
      bucket: i + 1,
      starting_time: new Date(bucketStart).toISOString(),
      ending_time: new Date(bucketEnd).toISOString(),
      success_count: successCount,
      failure_count: failureCount,
      total,
      success_percentage,
      avg_latency: q.avg || 0,
      max_latency: q.max || 0,
      min_latency: q.min || 0,
      q1_latency: q.q1 || 0,
      median_latency: q.median || 0,
      q3_latency: q.q3 || 0,
    });
  }

  const averageField = (field) =>
    buckets.length
      ? buckets.reduce((sum, b) => sum + (b[field] || 0), 0) / buckets.length
      : 0;

  const averaged_data = {
    avg_avg_latency: averageField("avg_latency"),
    avg_max_latency: averageField("max_latency"),
    avg_q3_latency: averageField("q3_latency"),
    avg_median_latency: averageField("median_latency"),
    avg_q1_latency: averageField("q1_latency"),
    avg_min_latency: averageField("min_latency"),
  };

  return { buckets, averaged_data };
}

function normalizeEvents(events = []) {
  return [...events].sort((a, b) => {
    const at = new Date(
      a.checkedAt || a.createdAt || a.timestamp
    ).getTime();
    const bt = new Date(
      b.checkedAt || b.createdAt || b.timestamp
    ).getTime();
    return at - bt;
  });
}

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const redis = await createRedisClient();
  await loadConfig(true);
  await startMonitor(redis);

  // Allow status page to call API with /status/api/* paths
  app.use("/status/api", (req, res, next) => {
    req.url = req.originalUrl.replace(/^\/status\/api/, "/api");
    next();
  });

  app.get("/health", async (req, res) => {
    const ping = await redis.ping();
    res.json({ status: "ok", redis: ping });
  });

  app.get("/api/services", async (req, res) => {
    const config = await loadConfig();
    const states = await Promise.all(
      config.services.map((service) => getServiceState(redis, service.id))
    );

    const services = config.services.map((service, index) => ({
      ...service,
      state: states[index] || null,
    }));

    res.json({ services });
  });

  app.get("/api/services/:id", async (req, res) => {
    const config = await loadConfig();
    const service = config.services.find((item) => item.id === req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const limit = Math.max(1, Number(req.query.limit) || 50);
    const [state, hits, failures] = await Promise.all([
      getServiceState(redis, service.id),
      getRecentHits(redis, service.id, limit),
      getRecentFailures(redis, service.id, limit),
    ]);

    res.json({
      service,
      state: state || null,
      hits,
      failures,
    });
  });

  app.post("/api/services/:id/check", async (req, res) => {
    const config = await loadConfig();
    const service = config.services.find((item) => item.id === req.params.id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const result = await runServiceCheck(redis, service);
    res.json(result);
  });

  // Compatibility routes for the existing status page bundle (single workspace)
  app.get("/workspaces", async (req, res) => {
    res.json({ id: WORKSPACE_ID, name: "Status" });
  });

  app.get("/workspaces/:workspaceId", async (req, res) => {
    if (req.params.workspaceId !== WORKSPACE_ID) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    const config = await loadConfig();
    res.json({
      id: WORKSPACE_ID,
      name: "Status",
      services: config.services.map((svc) => ({
        id: svc.id,
        name: svc.name,
      })),
    });
  });

  app.get("/workspaces/:workspaceId/:serviceId", async (req, res) => {
    if (req.params.workspaceId !== WORKSPACE_ID) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    const config = await loadConfig();
    const service = config.services.find((item) => item.id === req.params.serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const intervalMs = parseIntervalToMs(req.query.interval || "30d");
    const bucketCount = Math.max(1, Number(req.query.bucketCount) || 30);
    const limit = Math.max(bucketCount * 10, 200);

    const [hits, failures] = await Promise.all([
      getRecentHits(redis, service.id, limit),
      getRecentFailures(redis, service.id, limit),
    ]);

    const normalizedHits = normalizeEvents(hits);
    const normalizedFailures = normalizeEvents(failures);
    const total = normalizedHits.length + normalizedFailures.length;
    const success_percentage =
      total === 0 ? 100 : (normalizedHits.length / total) * 100;

    const { buckets, averaged_data } = buildBuckets({
      hits: normalizedHits,
      failures: normalizedFailures,
      bucketCount,
      intervalMs,
    });

    res.json({
      service,
      data: buckets,
      success_percentage,
      averaged_data,
    });
  });

  app.get("/workspaces/:workspaceId/:serviceId/outages", async (req, res) => {
    if (req.params.workspaceId !== WORKSPACE_ID) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    const config = await loadConfig();
    const service = config.services.find((item) => item.id === req.params.serviceId);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const failures = normalizeEvents(
      await getRecentFailures(redis, service.id, service.failureLimit || 50)
    );
    const state = await getServiceState(redis, service.id);
    const outages = failures.map((failure, idx) => ({
      id: `failure-${idx + 1}`,
      status: "CLOSED",
      createdAt:
        failure.checkedAt || failure.timestamp || new Date().toISOString(),
      reason: failure.failure?.reason || failure.reason || "unknown",
      failure,
    }));

    if (state?.outage) {
      outages.unshift({
        id: "current",
        status: "OPEN",
        createdAt: state.lastFailureAt || new Date().toISOString(),
        reason: state.failure?.reason || "unknown",
        failure: state.failure || null,
      });
    }

    res.json(outages);
  });

  app.get(
    "/workspaces/:workspaceId/:serviceId/outages/:outageId",
    async (req, res) => {
      if (req.params.workspaceId !== WORKSPACE_ID) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      const serviceId = req.params.serviceId;
      const failures = normalizeEvents(await getRecentFailures(redis, serviceId, 100));
      const outage = {
        id: req.params.outageId,
        failures,
        status: req.params.outageId === "current" ? "OPEN" : "CLOSED",
        createdAt: failures[0]?.checkedAt || new Date().toISOString(),
      };
      res.json(outage);
    }
  );

  // Static assets
  const statusDir = path.join(__dirname, "basic-statuspage", "dist");
  const landingDir = path.join(__dirname, "landing", "dist");

  // Serve status page and its assets (handle absolute /assets paths from the build)
  app.use("/status/assets", express.static(path.join(statusDir, "assets")));
  app.use("/assets", express.static(path.join(statusDir, "assets")));
  app.use("/status", express.static(statusDir));
  app.use("/", express.static(landingDir));

  app.get("/status/*", (req, res) => {
    res.sendFile(path.join(statusDir, "index.html"));
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(landingDir, "index.html"));
  });

  const port = process.env.PORT || 2000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
