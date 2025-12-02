import { createHash } from "crypto";

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
};

const outageHash = (serviceId, startTs) => {
  const base = `${serviceId || "service"}:${Number(startTs) || 0}`;
  const hex = createHash("sha1").update(base).digest("hex");
  const base36 = BigInt(`0x${hex}`).toString(36).padStart(9, "0");
  return base36.slice(0, 9);
};

const buildConfiguredOutageData = (entries = [], outageId, fallbackDate) => {
  if (!outageId || !Array.isArray(entries) || !entries.length) {
    return { comments: [], title: null };
  }
  const safeFallback = fallbackDate || new Date().toISOString();
  const relevantEntries = entries.filter(
    (entry) => entry && entry.outageId === outageId
  );
  if (!relevantEntries.length) {
    return { comments: [], title: null };
  }

  const comments = relevantEntries
    .filter((entry) => entry.comment)
    .map((entry, idx) => {
      const providedUser =
        typeof entry.user === "object" && entry.user ? entry.user : null;
      const name = entry.author || providedUser?.name || "PingPal Admin";
      const user = providedUser?.name ? providedUser : { name };
      return {
        id: entry.id || `${outageId}-comment-${idx}`,
        text: entry.comment,
        createdAt: entry.createdAt || safeFallback,
        user,
      };
    });

  const titleEntry = relevantEntries.find(
    (entry) => typeof entry.title === "string" && entry.title.trim().length > 0
  );

  return {
    comments,
    title: titleEntry ? titleEntry.title : null,
  };
};

const latencyMetrics = (latencies) => {
  if (!latencies.length) {
    return {
      min_latency: 0,
      max_latency: 0,
      median_latency: 0,
      q1_latency: 0,
      q3_latency: 0,
      avg_latency: 0,
    };
  }

  const min_latency = Math.min(...latencies);
  const max_latency = Math.max(...latencies);
  const median_latency = percentile(latencies, 0.5);
  const q1_latency = percentile(latencies, 0.25);
  const q3_latency = percentile(latencies, 0.75);
  const avg_latency =
    latencies.reduce((acc, cur) => acc + cur, 0) / latencies.length;

  return {
    min_latency,
    max_latency,
    median_latency,
    q1_latency,
    q3_latency,
    avg_latency,
  };
};

export const bucketizeHits = (
  hits,
  { bucketCount, intervalMs, rangeEndMs = Date.now() }
) => {
  const safeHits = Array.isArray(hits) ? hits : [];
  const normalizedBucketCount = Math.max(1, bucketCount || 1);
  const endTime = typeof rangeEndMs === "number" ? rangeEndMs : Date.now();
  const startTime = endTime - intervalMs;
  const bucketSize = intervalMs / normalizedBucketCount || 1;

  const buckets = Array.from({ length: normalizedBucketCount }).map(
    (_, idx) => ({
      bucket: idx + 1,
      success_count: 0,
      failure_count: 0,
      total: 0,
      latencies: [],
      starting_time: null,
      ending_time: null,
    })
  );

  for (let i = 0; i < normalizedBucketCount; i++) {
    const bucketStart = startTime + i * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    buckets[i].starting_time = new Date(bucketStart).toISOString();
    buckets[i].ending_time = new Date(bucketEnd).toISOString();
  }

  safeHits.forEach((hit) => {
    if (typeof hit.timestamp !== "number") return;
    if (hit.timestamp < startTime || hit.timestamp > endTime) return;
    const index = Math.min(
      normalizedBucketCount - 1,
      Math.max(
        0,
        Math.floor((hit.timestamp - startTime) / bucketSize)
      )
    );
    const bucket = buckets[index];
    bucket.total += 1;
    if (hit.ok !== false && hit.success !== false) {
      bucket.success_count += 1;
    } else {
      bucket.failure_count += 1;
    }
    if (typeof hit.latencyMs === "number") {
      bucket.latencies.push(hit.latencyMs);
    }
  });

  const finalized = buckets.map((b) => {
    const metrics = latencyMetrics(b.latencies);
    const success_percentage =
      b.total === 0 ? 100 : (b.success_count / b.total) * 100;
    return {
      bucket: b.bucket,
      starting_time: b.starting_time,
      ending_time: b.ending_time,
      success_count: b.success_count,
      failure_count: b.failure_count,
      total: b.total,
      success_percentage,
      ...metrics,
    };
  });

  const bucketsWithData = finalized.filter((b) => b.total > 0);
  const average = bucketsWithData.length
    ? bucketsWithData.reduce(
        (acc, cur) => {
          acc.avg_avg_latency += cur.avg_latency;
          acc.avg_min_latency += cur.min_latency;
          acc.avg_max_latency += cur.max_latency;
          acc.avg_median_latency += cur.median_latency;
          acc.avg_q1_latency += cur.q1_latency;
          acc.avg_q3_latency += cur.q3_latency;
          return acc;
        },
        {
          avg_avg_latency: 0,
          avg_min_latency: 0,
          avg_max_latency: 0,
          avg_median_latency: 0,
          avg_q1_latency: 0,
          avg_q3_latency: 0,
        }
      )
    : null;

  const averaged_data = average
    ? Object.fromEntries(
        Object.entries(average).map(([k, v]) => [
          k,
          v / bucketsWithData.length,
        ])
      )
    : {
        avg_avg_latency: 0,
        avg_min_latency: 0,
        avg_max_latency: 0,
        avg_median_latency: 0,
        avg_q1_latency: 0,
        avg_q3_latency: 0,
      };

  const successTotal = finalized.reduce(
    (acc, cur) => {
      acc.success += cur.success_count;
      acc.total += cur.total;
      return acc;
    },
    { success: 0, total: 0 }
  );

  const success_percentage =
    successTotal.total === 0
      ? null
      : (successTotal.success / successTotal.total) * 100;

  return { buckets: finalized, averaged_data, success_percentage };
};

const deriveReason = (hit) => {
  if (hit.reason) return hit.reason;
  if (hit.error) return "REQUEST_FAILURE";
  if (typeof hit.statusCode === "number" && hit.statusCode >= 400)
    return "STATUS_CODE";
  if (typeof hit.latencyMs === "number" && hit.expectedLatencyMs) {
    if (hit.latencyMs > hit.expectedLatencyMs) return "LATENCY";
  }
  return "UNKNOWN";
};

export const buildOutages = (hits, options = {}) => {
  const {
    serviceId = "service",
    configuredOutages,
    outageComments = [],
    minimumDurationMs = 3 * 60 * 1000,
  } = options;
  const outages = [];
  let current = null;
  const manualOutages = Array.isArray(configuredOutages)
    ? configuredOutages
    : outageComments;

  const finalizeCurrent = (resolutionTimestamp) => {
    if (!current) return;
    const startTs = current._startTimestamp;
    const endTs =
      typeof resolutionTimestamp === "number"
        ? resolutionTimestamp
        : current._lastFailureTimestamp || startTs;
    current.id = outageHash(serviceId, startTs);
    current.start = new Date(startTs).toISOString();
    current.end = new Date(endTs).toISOString();
    if (resolutionTimestamp) {
      current.resolvedAt = new Date(resolutionTimestamp).toISOString();
      current.status = "RESOLVED";
    } else {
      current.status = "OPEN";
    }

    const fallbackDate =
      current.resolvedAt || new Date(current._lastFailureTimestamp || endTs).toISOString();
    const { comments: configuredComments, title: configuredTitle } =
      buildConfiguredOutageData(manualOutages, current.id, fallbackDate);

    current.comments = [...(current.comments || []), ...configuredComments];
    current.title = configuredTitle || current.title || null;

    delete current._startTimestamp;
    delete current._lastFailureTimestamp;

    outages.push(current);
    current = null;
  };

  hits
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((hit, idx) => {
      const ok = hit.ok !== false && hit.success !== false;
      if (!ok) {
        if (!current) {
          current = {
            createdAt: new Date(hit.timestamp).toISOString(),
            failures: [],
            comments: [],
            _startTimestamp: hit.timestamp,
            _lastFailureTimestamp: hit.timestamp,
          };
        }
        current._lastFailureTimestamp = hit.timestamp;
        current.failures.push({
          id: `failure-${hit.timestamp}-${idx}`,
          createdAt: new Date(hit.timestamp).toISOString(),
          reason: deriveReason(hit),
          statusCode: hit.statusCode,
          latencyMs: hit.latencyMs,
        });
      } else if (current) {
        finalizeCurrent(hit.timestamp);
      }
    });

  if (current) {
    finalizeCurrent();
  }

  const parsedMinimum = Number(minimumDurationMs);
  const normalizedMinimum = Math.max(
    0,
    Number.isFinite(parsedMinimum) ? parsedMinimum : 0
  );
  const nowMs = Date.now();

  const outagesWithDuration = outages
    .map((outage) => {
      const startMs = new Date(outage.start).getTime();
      const endMs = new Date(outage.end).getTime();
      const durationMs = Math.max(0, endMs - startMs);
      const filterDurationMs =
        outage.status === "OPEN"
          ? Math.max(0, nowMs - startMs)
          : durationMs;
      return {
        ...outage,
        durationMs,
        _filterDurationMs: filterDurationMs,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  if (normalizedMinimum <= 0) {
    return outagesWithDuration.map(({ _filterDurationMs, ...outage }) => outage);
  }

  return outagesWithDuration
    .filter((outage) => outage._filterDurationMs >= normalizedMinimum)
    .map(({ _filterDurationMs, ...outage }) => outage);
};
