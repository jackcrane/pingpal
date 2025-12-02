const hitsKey = (serviceId) => `service:${serviceId}:hits`;
const failuresKey = (serviceId) => `service:${serviceId}:failures`;
const stateKey = (serviceId) => `service:${serviceId}:state`;

async function pushWithLimit(client, key, payload, limit) {
  const serialized = JSON.stringify(payload);
  await client
    .multi()
    .lPush(key, serialized)
    .lTrim(key, 0, Math.max(0, limit - 1))
    .exec();
}

export async function recordHit(client, serviceId, payload, limit) {
  await pushWithLimit(client, hitsKey(serviceId), payload, limit);
}

export async function recordFailure(client, serviceId, payload, limit) {
  await pushWithLimit(client, failuresKey(serviceId), payload, limit);
}

export async function getRecentHits(client, serviceId, limit = 50) {
  const results = await client.lRange(
    hitsKey(serviceId),
    0,
    Math.max(0, limit - 1)
  );
  return results.map((entry) => {
    try {
      return JSON.parse(entry);
    } catch (error) {
      return { raw: entry };
    }
  });
}

export async function getRecentFailures(client, serviceId, limit = 50) {
  const results = await client.lRange(
    failuresKey(serviceId),
    0,
    Math.max(0, limit - 1)
  );
  return results.map((entry) => {
    try {
      return JSON.parse(entry);
    } catch (error) {
      return { raw: entry };
    }
  });
}

export async function setServiceState(client, serviceId, state) {
  await client.set(stateKey(serviceId), JSON.stringify(state));
}

export async function getServiceState(client, serviceId) {
  const raw = await client.get(stateKey(serviceId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { raw };
  }
}
