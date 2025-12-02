import dotenv from "dotenv";
import { initConfig, loadConfig } from "./lib/config.js";
import { recordHitsBatch, deleteServiceHits } from "./lib/store.js";
import { closeRedis } from "./lib/redis.js";

dotenv.config();

const parseArgs = () => {
  const raw = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < raw.length; i++) {
    const part = raw[i];
    if (part.startsWith("--")) {
      const key = part.replace(/^--/, "");
      const next = raw[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
};

const randomNormal = (mean, stdDev) => {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
};

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const generateHit = ({
  serviceId,
  workspaceId,
  timestamp,
  avgResponseMs,
  expectedLatencyMs,
  downChance,
}) => {
  const isDown = Math.random() * 100 < downChance;
  const spread = avgResponseMs * 0.2;
  const baseLatency = randomNormal(avgResponseMs, spread);

  const rawLatency = isDown
    ? baseLatency * 2.5 + Math.random() * avgResponseMs
    : clamp(baseLatency, 20, avgResponseMs * 3);

  const latencyMs = Math.max(20, rawLatency);
  const statusChoices = [500, 502, 503, 504, 522, 429];
  const statusCode = isDown
    ? statusChoices[Math.floor(Math.random() * statusChoices.length)]
    : 200;

  const okLatency =
    typeof expectedLatencyMs === "number"
      ? latencyMs <= expectedLatencyMs
      : true;

  const ok = !isDown && okLatency;

  const reason = ok
    ? undefined
    : !okLatency
    ? "LATENCY"
    : statusCode >= 500
    ? "STATUS_CODE"
    : "REQUEST_FAILURE";

  return {
    id: `hit-${serviceId}-${timestamp}`,
    serviceId,
    workspaceId,
    timestamp,
    statusCode,
    latencyMs: Math.round(latencyMs),
    ok,
    success: ok,
    expectedLatencyMs,
    reason,
  };
};

const main = async () => {
  await initConfig();
  const args = parseArgs();
  const serviceId = args.id || args.serviceId;
  const avg = Number(args.avg || args.avgMs || args.response);
  const down = Number(args.down || args.downPercent || args.failure);
  const days = Number(args.days || 30);
  const intervalSeconds = Number(args.interval || args.intervalSeconds || 60);
  const historyLimit = args.historyLimit ? Number(args.historyLimit) : null;

  if (!serviceId) throw new Error("Missing --id <serviceId>");
  if (!avg) throw new Error("Missing --avg <ms>");
  if (down < 0 || down > 100) throw new Error("Invalid --down %");

  const config = loadConfig();
  const service = config.services.find((s) => s.id === serviceId);
  const expectedLatencyMs =
    service?.maxLatencyMs ?? config.defaults?.maxLatencyMs;

  const total = Math.ceil((days * 86400) / intervalSeconds);
  const start = Date.now() - days * 86400000;

  // **1. Delete previous fake data**
  console.log(`Deleting previous hits for ${serviceId}...`);
  const deleted = await deleteServiceHits(serviceId);
  console.log(`Removed ${deleted} keys`);

  console.log(`Seeding ${total} points...`);

  let batch = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < total; i++) {
    const ts = start + i * intervalSeconds * 1000;

    batch.push(
      generateHit({
        serviceId,
        workspaceId: config.workspace.id,
        timestamp: ts,
        avgResponseMs: avg,
        expectedLatencyMs,
        downChance: down,
      })
    );

    if (batch.length >= BATCH_SIZE) {
      await recordHitsBatch(serviceId, batch, historyLimit);
      batch = [];
    }
  }

  if (batch.length) {
    await recordHitsBatch(serviceId, batch, historyLimit);
  }

  await closeRedis();
  console.log(`Done. Inserted ${total} hits for ${serviceId}.`);
};

main().catch(async (err) => {
  console.error(err);
  await closeRedis();
  process.exit(1);
});
