import os from "os";
import nodemailer from "nodemailer";
import { getRedisClient } from "./redis.js";

const STATE_KEY_PREFIX = "pingpal:notification-state";
const REQUIRED_SMTP_ENV = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_TO",
];

const REQUIRED_FAILED_HEARTBEATS = 2;

const defaultState = () => ({
  outage: {
    active: false,
    messageId: null,
    startedAt: null,
  },
  degraded: {
    active: false,
    startedAt: null,
  },
  consecutiveFailures: 0,
});

const stateKey = (serviceId) => `${STATE_KEY_PREFIX}:${serviceId}`;

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
};

const parseRecipients = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[, ]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const resolveSmtpConfig = () => {
  const missing = REQUIRED_SMTP_ENV.filter(
    (key) => !process.env[key] || process.env[key].length === 0
  );
  if (missing.length > 0) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  const secure =
    process.env.SMTP_SECURE !== undefined
      ? parseBoolean(process.env.SMTP_SECURE, false)
      : port === 465;

  const recipients = parseRecipients(process.env.SMTP_TO);

  if (recipients.length === 0) {
    return null;
  }

  return {
    host: process.env.SMTP_HOST,
    port,
    secure,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    to: recipients,
  };
};

let cachedSmtpConfig = null;
let transport = null;

const getSmtpConfig = () => {
  if (cachedSmtpConfig) return cachedSmtpConfig;
  cachedSmtpConfig = resolveSmtpConfig();
  return cachedSmtpConfig;
};

const getTransport = () => {
  const config = getSmtpConfig();
  if (!config) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }
  return transport;
};

const formatTargets = (targets = []) => {
  if (!Array.isArray(targets) || targets.length === 0) {
    return "Targets: none";
  }
  const lines = targets.map((target) => `- ${target}`);
  return `Targets:\n${lines.join("\n")}`;
};

export const sendDeletionAlert = async ({
  origin,
  description,
  targets = [],
  meta = null,
}) => {
  const config = getSmtpConfig();
  const mailer = getTransport();
  if (!config || !mailer) {
    console.warn(
      `[notify] Skipping deletion alert from ${origin || "unknown"}: SMTP not configured`
    );
    return null;
  }

  const normalizedOrigin = origin || "unknown";
  const normalizedTargets = Array.isArray(targets) ? targets : [];
  const metadata = meta && Object.keys(meta).length > 0 ? meta : null;

  const sections = [
    `Origin: ${normalizedOrigin}`,
    description ? `Description: ${description}` : null,
    formatTargets(normalizedTargets),
    metadata ? `Metadata:\n${JSON.stringify(metadata, null, 2)}` : null,
    `Timestamp: ${new Date().toISOString()}`,
  ].filter(Boolean);

  const headers = {
    "X-PingPal-Event": "DATA_DELETION",
    "X-PingPal-Origin": normalizedOrigin,
  };

  if (metadata?.serviceId) {
    headers["X-PingPal-Service-Id"] = metadata.serviceId;
  }
  if (metadata?.workspaceId) {
    headers["X-PingPal-Workspace-Id"] = metadata.workspaceId;
  }

  const message = {
    from: config.from,
    to: config.to,
    subject: `[PingPal] Deletion triggered (${normalizedOrigin})`,
    text: sections.join("\n\n"),
    headers,
  };

  try {
    await mailer.sendMail(message);
  } catch (err) {
    console.error(
      `[notify] Failed to send deletion alert from ${normalizedOrigin}:`,
      err.message
    );
  }
  return null;
};

const ensureNotificationState = async (serviceId) => {
  const client = await getRedisClient();
  const key = stateKey(serviceId);
  const raw = await client.get(key);
  const parsed = safeParseJson(raw);
  if (parsed) {
    return { client, key, state: { ...defaultState(), ...parsed } };
  }
  return { client, key, state: defaultState() };
};

const persistState = async (client, key, state) => {
  await client.set(key, JSON.stringify(state));
};

const buildMessageIdHost = () => {
  if (process.env.SMTP_MESSAGE_ID_HOST) {
    return process.env.SMTP_MESSAGE_ID_HOST;
  }
  const hostname = os.hostname?.();
  if (!hostname) return "pingpal.local";
  return hostname.replace(/[^a-zA-Z0-9.-]/g, "") || "pingpal.local";
};

const buildMessageId = (serviceId, eventType) => {
  const host = buildMessageIdHost();
  const suffix = Math.random().toString(36).slice(2, 10);
  return `<pingpal-${serviceId}-${eventType}-${Date.now()}-${suffix}@${host}>`;
};

const formatLatency = (latencyMs) => {
  if (!Number.isFinite(latencyMs)) return "unknown";
  return `${latencyMs}ms`;
};

const baseHeaders = (workspace, service, eventType) => ({
  "X-PingPal-Workspace-Id": workspace.id,
  "X-PingPal-Workspace-Name": workspace.name,
  "X-PingPal-Service-Id": service.id,
  "X-PingPal-Service-Name": service.name,
  "X-PingPal-Event": eventType,
});

const buildOutageEmail = (workspace, service, hit, messageId) => ({
  subject: `[PingPal] ${service.name} outage detected`,
  messageId,
  text: [
    `${service.name} (${service.url || "n/a"}) is reporting an outage.`,
    "",
    `Workspace: ${workspace.name} (${workspace.id})`,
    `Reason: ${hit.reason || "UNKNOWN"}`,
    `Latency: ${formatLatency(hit.latencyMs)}`,
    hit.error ? `Error: ${hit.error}` : null,
    `Timestamp: ${new Date(hit.timestamp || Date.now()).toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n"),
});

const buildRecoveryEmail = (
  workspace,
  service,
  hit,
  messageId,
  replyToMessageId
) => ({
  subject: `[PingPal] ${service.name} recovered`,
  messageId,
  inReplyTo: replyToMessageId || undefined,
  references: replyToMessageId ? [replyToMessageId] : undefined,
  text: [
    `${service.name} (${service.url || "n/a"}) has recovered.`,
    "",
    `Workspace: ${workspace.name} (${workspace.id})`,
    `Latency: ${formatLatency(hit.latencyMs)}`,
    hit.statusCode ? `Status: ${hit.statusCode}` : null,
    `Timestamp: ${new Date(hit.timestamp || Date.now()).toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n"),
});

const buildDegradedEmail = (workspace, service, hit, thresholdMs) => ({
  subject: `[PingPal] ${service.name} degraded`,
  text: [
    `${service.name} (${service.url || "n/a"}) is degraded.`,
    "",
    `Workspace: ${workspace.name} (${workspace.id})`,
    `Latency: ${formatLatency(hit.latencyMs)} (threshold ${thresholdMs}ms)`,
    `Timestamp: ${new Date(hit.timestamp || Date.now()).toISOString()}`,
  ].join("\n"),
});

const sendEmail = async (workspace, service, eventType, payload) => {
  const config = getSmtpConfig();
  const mailer = getTransport();
  if (!config || !mailer) return null;
  const headers = {
    ...baseHeaders(workspace, service, eventType),
    ...(payload.headers || {}),
  };
  const message = {
    from: config.from,
    to: config.to,
    ...payload,
    headers,
  };
  const info = await mailer.sendMail(message);
  return info?.messageId || payload.messageId || null;
};

const isOk = (hit) => {
  if (hit.ok === false || hit.success === false) return false;
  return true;
};

const normalizeNotifications = (notifications) => ({
  notifyOnOutage: Boolean(notifications?.notifyOnOutage),
  notifyOnRecovery: Boolean(notifications?.notifyOnRecovery),
  notifyOnDegraded: Boolean(notifications?.notifyOnDegraded),
  degradedThresholdMs: Number.isFinite(notifications?.degradedThresholdMs)
    ? notifications.degradedThresholdMs
    : null,
});

export const notificationsConfigured = () => Boolean(getSmtpConfig());

export const handleNotifications = async ({
  workspace,
  service,
  notifications,
  hit,
}) => {
  const config = normalizeNotifications(notifications);
  if (
    !notificationsConfigured() ||
    (!config.notifyOnOutage &&
      !config.notifyOnRecovery &&
      !config.notifyOnDegraded)
  ) {
    return;
  }

  const timestamp = hit.timestamp || Date.now();
  const { client, key, state } = await ensureNotificationState(service.id);
  let stateChanged = false;

  const hitIsOk = isOk(hit);
  const previousFailures = Number.isFinite(state.consecutiveFailures)
    ? state.consecutiveFailures
    : 0;
  let failureCount = previousFailures;

  if (hitIsOk || state.outage.active) {
    if (failureCount !== 0) {
      failureCount = 0;
      state.consecutiveFailures = 0;
      stateChanged = true;
    }
  } else if (!state.outage.active) {
    failureCount = previousFailures + 1;
    if (failureCount !== state.consecutiveFailures) {
      state.consecutiveFailures = failureCount;
      stateChanged = true;
    }
  }

  const readyForOutageAlert =
    failureCount >= REQUIRED_FAILED_HEARTBEATS && !state.outage.active;

  if (config.notifyOnOutage && !hitIsOk) {
    if (readyForOutageAlert) {
      const messageId = buildMessageId(service.id, "outage");
      try {
        const finalMessageId = await sendEmail(
          workspace,
          service,
          "OUTAGE",
          buildOutageEmail(workspace, service, { ...hit, timestamp }, messageId)
        );
        state.outage = {
          active: true,
          messageId: finalMessageId || messageId,
          startedAt: timestamp,
        };
        state.consecutiveFailures = 0;
        state.degraded = { active: false, startedAt: null };
        stateChanged = true;
        console.log(
          `[notify] Outage alert sent for ${service.id} (${finalMessageId})`
        );
      } catch (err) {
        console.error(
          `[notify] Failed to send outage email for ${service.id}:`,
          err.message
        );
      }
    }
  } else if (config.notifyOnRecovery && hitIsOk && state.outage.active) {
    const messageId = buildMessageId(service.id, "recovery");
    try {
      const finalMessageId = await sendEmail(
        workspace,
        service,
        "RECOVERY",
        buildRecoveryEmail(
          workspace,
          service,
          { ...hit, timestamp },
          messageId,
          state.outage.messageId
        )
      );
      state.outage = {
        active: false,
        messageId: finalMessageId || null,
        startedAt: null,
      };
      state.consecutiveFailures = 0;
      stateChanged = true;
      console.log(
        `[notify] Recovery alert sent for ${service.id} (${finalMessageId})`
      );
    } catch (err) {
      console.error(
        `[notify] Failed to send recovery email for ${service.id}:`,
        err.message
      );
    }
  }

  const threshold = config.degradedThresholdMs;
  const latency = Number.isFinite(hit.latencyMs) ? hit.latencyMs : null;
  const degradePossible =
    config.notifyOnDegraded &&
    Number.isFinite(threshold) &&
    threshold > 0 &&
    latency !== null;
  const isDegraded = degradePossible && hitIsOk && latency >= threshold;

  if (degradePossible) {
    if (isDegraded && !state.degraded.active) {
      try {
        await sendEmail(
          workspace,
          service,
          "DEGRADED",
          buildDegradedEmail(workspace, service, { ...hit, timestamp }, threshold)
        );
        state.degraded = { active: true, startedAt: timestamp };
        stateChanged = true;
        console.log(`[notify] Degraded alert sent for ${service.id}`);
      } catch (err) {
        console.error(
          `[notify] Failed to send degraded email for ${service.id}:`,
          err.message
        );
      }
    } else if (!isDegraded && state.degraded.active) {
      state.degraded = { active: false, startedAt: null };
      stateChanged = true;
    }
  }

  if (stateChanged) {
    await persistState(client, key, state);
  }
};
