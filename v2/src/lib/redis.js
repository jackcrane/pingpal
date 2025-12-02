import { createClient } from "redis";

let client = null;
let clientReady = false;
let connecting = null;

const buildClient = () => {
  const url =
    process.env.REDIS_URL ||
    process.env.REDIS_TLS_URL ||
    "redis://localhost:6379";
  const opts = { url };
  return createClient(opts);
};

export const getRedisClient = async () => {
  if (clientReady && client) return client;
  if (connecting) return connecting;

  client = buildClient();
  connecting = client
    .connect()
    .then(() => {
      clientReady = true;
      return client;
    })
    .catch((err) => {
      console.warn("Redis unavailable, falling back to in-memory store", err);
      client = null;
      clientReady = false;
      return null;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
};

export const closeRedis = async () => {
  if (client && clientReady) {
    await client.quit();
    client = null;
    clientReady = false;
  }
};
