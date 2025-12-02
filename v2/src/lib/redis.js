import { createClient } from "redis";

let client = null;
let connecting = null;

const buildClient = () => {
  const url = process.env.REDIS_URL;
  const opts = { url };
  return createClient(opts);
};

export const getRedisClient = async () => {
  if (client) return client;
  if (connecting) return connecting;

  connecting = new Promise((resolve, reject) => {
    const instance = buildClient();
    instance
      .connect()
      .then(() => {
        client = instance;
        resolve(client);
      })
      .catch((err) => {
        reject(err);
      })
      .finally(() => {
        connecting = null;
      });
  });

  return connecting;
};

export const closeRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};
