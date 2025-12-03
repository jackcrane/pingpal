#!/usr/bin/env node
/**
 * Deletes all hits stored for a given service in Redis.
 * Usage: node drop-service-hits.js --id=my-service-id
 */
"use strict";

const path = require("path");
const readline = require("readline");
const { createRequire } = require("module");
const { pathToFileURL } = require("url");

const projectRoot = __dirname;
const v2Dir = path.join(projectRoot, "v2");
const requireFromV2 = createRequire(path.join(v2Dir, "package.json"));

const maybeLoadEnv = () => {
  try {
    const { config } = requireFromV2("dotenv");
    const envPath = path.join(v2Dir, ".env");
    config({ path: envPath, override: false });
  } catch (err) {
    console.warn(
      "[drop-service-hits] Warning: failed to load dotenv config:",
      err?.message || err
    );
  }
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  let serviceId;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--id" || arg === "-i") {
      serviceId = args[i + 1];
      i += 1;
    } else if (arg?.startsWith("--id=")) {
      serviceId = arg.split("=")[1];
    } else if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
  }
  return { serviceId };
};

const promptForConfirmation = async (serviceId) => {
  const question = `This will permanently delete all hits for service "${serviceId}". Type "delete" to confirm: `;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "delete");
    });
  });
};

const withStore = async () => {
  const storeModule = await import(
    pathToFileURL(path.join(v2Dir, "src/lib/store.js"))
  );
  const redisModule = await import(
    pathToFileURL(path.join(v2Dir, "src/lib/redis.js"))
  );
  return { deleteServiceHits: storeModule.deleteServiceHits, closeRedis: redisModule.closeRedis };
};

const usage = () => {
  console.log("Usage: node drop-service-hits.js --id=<SERVICE_ID>");
};

const main = async () => {
  const { serviceId, help } = parseArgs();
  if (help) {
    usage();
    process.exit(0);
  }

  if (!serviceId) {
    console.error("Error: --id is required.");
    usage();
    process.exit(1);
  }

  maybeLoadEnv();

  if (!process.env.REDIS_URL) {
    console.error(
      "Error: REDIS_URL is not set. Populate v2/.env or export it before running."
    );
    process.exit(1);
  }

  const confirmed = await promptForConfirmation(serviceId);
  if (!confirmed) {
    console.log("Aborted. No hits were deleted.");
    process.exit(0);
  }

  const { deleteServiceHits, closeRedis } = await withStore();

  try {
    console.log(`Deleting hits for service "${serviceId}"...`);
    const deleted = await deleteServiceHits(serviceId);
    console.log(
      `Done. Cleared all sorted-set entries and ${deleted} legacy hash keys.`
    );
  } catch (err) {
    console.error(
      "Failed to delete hits:",
      err?.stack || err?.message || err
    );
    process.exitCode = 1;
  } finally {
    if (typeof closeRedis === "function") {
      try {
        await closeRedis();
      } catch {
        // ignore close errors
      }
    }
  }
};

main();
