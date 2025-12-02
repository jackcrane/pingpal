import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

export async function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is required (example: redis://user:password@host:port)"
    );
  }

  const client = createClient({ url });
  client.on("error", (error) => {
    console.error("Redis error", error);
  });

  await client.connect();
  return client;
}
