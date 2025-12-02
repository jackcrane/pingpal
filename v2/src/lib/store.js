import { getRedisClient } from "./redis.js";

const memoryStore = new Map();

const addToMemory = (serviceId, hit, historyLimit) => {
  const arr = memoryStore.get(serviceId) || [];
  arr.push(hit);
  arr.sort((a, b) => a.timestamp - b.timestamp);
  if (historyLimit && arr.length > historyLimit) {
    arr.splice(0, arr.length - historyLimit);
  }
  memoryStore.set(serviceId, arr);
};

export const recordHit = async (serviceId, hit, historyLimit = 5000) => {
  const payload = {
    ...hit,
    serviceId,
    timestamp: hit.timestamp || Date.now(),
  };

  const client = await getRedisClient();
  if (client) {
    const key = `pingpal:hits:${serviceId}`;
    try {
      await client.zAdd(key, [
        { score: payload.timestamp, value: JSON.stringify(payload) },
      ]);
      // keep the sorted set bounded if requested
      if (historyLimit) {
        const excess = (await client.zCard(key)) - historyLimit;
        if (excess > 0) {
          await client.zRemRangeByRank(key, 0, excess - 1);
        }
      }
    } catch (err) {
      console.warn("Unable to write hit to redis, falling back to memory", err);
    }
  }

  addToMemory(serviceId, payload, historyLimit);
  return payload;
};

export const fetchHits = async (
  serviceId,
  startMs = 0,
  endMs = Date.now()
) => {
  const client = await getRedisClient();
  if (client) {
    try {
      const key = `pingpal:hits:${serviceId}`;
      const entries = await client.zRangeByScore(key, startMs, endMs);
      return entries
        .map((entry) => {
          try {
            return JSON.parse(entry);
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (err) {
      console.warn("Unable to read hits from redis, using memory", err);
    }
  }

  const hits = memoryStore.get(serviceId) || [];
  return hits
    .filter((h) => h.timestamp >= startMs && h.timestamp <= endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
};
