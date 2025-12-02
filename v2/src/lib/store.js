import { getRedisClient } from "./redis.js";

const trimHistory = async (client, key, historyLimit) => {
  if (!historyLimit) return;
  const excess = (await client.zCard(key)) - historyLimit;
  if (excess > 0) {
    await client.zRemRangeByRank(key, 0, excess - 1);
  }
};

export const recordHit = async (serviceId, hit, historyLimit = 5000) => {
  const payload = {
    ...hit,
    serviceId,
    timestamp: hit.timestamp || Date.now(),
  };

  const client = await getRedisClient();
  const key = `pingpal:hits:${serviceId}`;
  await client.zAdd(key, [
    { score: payload.timestamp, value: JSON.stringify(payload) },
  ]);
  await trimHistory(client, key, historyLimit);

  return payload;
};

export const fetchHits = async (serviceId, startMs = 0, endMs = Date.now()) => {
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

/**
 * Delete all hits for a specific service.
 * Uses SCAN to avoid KEYS blocking redis on large datasets.
 */
export const deleteServiceHits = async (serviceId) => {
  const redis = await getRedisClient();
  let cursor = 0;
  let total = 0;
  const zsetKey = `pingpal:hits:${serviceId}`;
  const legacyZsetKey = `hits:${serviceId}`;

  // Drop sorted sets first so they don't point at removed hashes.
  await redis.del(zsetKey);
  await redis.del(legacyZsetKey);

  do {
    const res = await redis.scan(cursor, {
      MATCH: `hit-${serviceId}-*`,
      COUNT: 500,
    });

    const nextCursor = Number(res.cursor);
    const keys = res.keys;

    if (keys.length > 0) {
      const multi = redis.multi();
      for (const k of keys) multi.del(k);
      await multi.exec();
      total += keys.length;
    }

    cursor = nextCursor;
  } while (cursor !== 0);

  return total;
};

/**
 * Batch insert hits using MULTI.
 */
export const recordHitsBatch = async (serviceId, hits, historyLimit = null) => {
  const redis = await getRedisClient();
  const zsetKey = `pingpal:hits:${serviceId}`;
  const payloads = hits.map((hit) => ({
    ...hit,
    serviceId,
    timestamp: hit.timestamp || Date.now(),
  }));

  const multi = redis.multi();

  multi.zAdd(
    zsetKey,
    payloads.map((payload) => ({
      score: payload.timestamp,
      value: JSON.stringify(payload),
    }))
  );

  await multi.exec();
  await trimHistory(redis, zsetKey, historyLimit);
  return payloads;
};
