import { getRedisClient } from "./redis.js";

export const recordHit = async (serviceId, hit, historyLimit = 5000) => {
  const payload = {
    ...hit,
    serviceId,
    timestamp: hit.timestamp || Date.now(),
  };

  const client = await getRedisClient();
  const key = `pingpal:hits:${serviceId}`;
  await client.zAdd(key, [{ score: payload.timestamp, value: JSON.stringify(payload) }]);
  if (historyLimit) {
    const excess = (await client.zCard(key)) - historyLimit;
    if (excess > 0) {
      await client.zRemRangeByRank(key, 0, excess - 1);
    }
  }

  return payload;
};

export const fetchHits = async (
  serviceId,
  startMs = 0,
  endMs = Date.now()
) => {
  const client = await getRedisClient();
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
};
