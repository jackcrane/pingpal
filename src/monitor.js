import fetch from "node-fetch";
import { loadConfig } from "./config.js";
import { recordFailure, recordHit, setServiceState } from "./state.js";

function buildState({ service, ok, status, failure, latencyMs }) {
  const timestamp = new Date().toISOString();
  const base = {
    serviceId: service.id,
    name: service.name,
    checkedAt: timestamp,
    latencyMs,
    statusCode: status,
    ok,
  };

  if (ok) {
    return { ...base, lastSuccessAt: timestamp, outage: false };
  }

  return {
    ...base,
    lastFailureAt: timestamp,
    outage: true,
    failure,
  };
}

async function evaluateResponse(service, response, latencyMs) {
  if (!response) {
    return {
      ok: false,
      failure: { reason: "no_response", message: "No response received" },
    };
  }

  if (latencyMs > service.maxLatencyMs) {
    return {
      ok: false,
      failure: {
        reason: "latency",
        message: `Latency ${latencyMs}ms exceeded max ${service.maxLatencyMs}ms`,
      },
    };
  }

  if (response.status !== service.expectedStatus) {
    return {
      ok: false,
      failure: {
        reason: "status_mismatch",
        message: `Expected status ${service.expectedStatus} but received ${response.status}`,
      },
    };
  }

  if (service.expectedText) {
    const text = await response.text();
    if (!text.toLowerCase().includes(service.expectedText.toLowerCase())) {
      return {
        ok: false,
        failure: {
          reason: "text_mismatch",
          message: `Expected text "${service.expectedText}" not found`,
          sample: text.slice(0, 400),
        },
      };
    }
  }

  return { ok: true };
}

export async function runServiceCheck(client, service) {
  const start = Date.now();
  let response = null;
  let failure = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), service.timeoutMs);
  try {
    response = await fetch(service.url, {
      method: service.method,
      headers: service.headers,
      body: service.method === "GET" ? undefined : service.body,
      signal: controller.signal,
    });
  } catch (error) {
    failure = {
      reason: controller.signal.aborted ? "timeout" : "request_error",
      message: controller.signal.aborted
        ? `Request timed out after ${service.timeoutMs}ms`
        : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - start;
  let ok = !failure;

  if (ok) {
    const evaluation = await evaluateResponse(service, response, latencyMs);
    ok = evaluation.ok;
    failure = evaluation.failure;
  }

  const status = response?.status ?? null;
  const record = {
    serviceId: service.id,
    name: service.name,
    checkedAt: new Date().toISOString(),
    status,
    latencyMs,
    ok,
  };

  const state = buildState({ service, ok, status, failure, latencyMs });

  if (ok) {
    await recordHit(client, service.id, record, service.historyLimit);
  } else {
    await recordFailure(
      client,
      service.id,
      { ...record, failure },
      service.failureLimit
    );
  }

  await setServiceState(client, service.id, state);
  return { ...record, ok, failure };
}

export async function startMonitor(client) {
  let timers = new Map();
  let lastConfig = null;

  async function schedule(service) {
    let running = false;
    const execute = async () => {
      if (running) return;
      running = true;
      try {
        await runServiceCheck(client, service);
      } catch (error) {
        console.error(`Check failed for ${service.id}`, error);
      } finally {
        running = false;
      }
    };

    await execute();
    const timer = setInterval(execute, service.intervalSeconds * 1000);
    timers.set(service.id, timer);
  }

  async function refreshConfig() {
    const config = await loadConfig();
    if (!config || config === lastConfig) return;

    timers.forEach(clearInterval);
    timers = new Map();

    for (const service of config.services) {
      await schedule(service);
    }

    lastConfig = config;
  }

  await refreshConfig();
  setInterval(() => {
    refreshConfig().catch((error) => {
      console.error("Failed to refresh config", error);
    });
  }, 5000);
}
