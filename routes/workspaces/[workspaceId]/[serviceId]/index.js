import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma.js";
import { writeFileSync } from "fs";
BigInt.prototype.toJSON = function () {
  return parseFloat(this.toString());
};

export const get = async (req, res) => {
  const startTime = Date.now();
  const { interval, bucketCount } = req.query;
  const allowedIntervals = ["30m", "1h", "6h", "12h", "1d", "7d", "30d", "90d"];
  if (!allowedIntervals.includes(interval)) {
    return res.status(400).json({
      error: "Invalid interval",
    });
  }
  let realInterval;
  switch (interval) {
    case "30m":
      realInterval = "30 MINUTE";
      break;
    case "1h":
      realInterval = "1 HOUR";
      break;
    case "6h":
      realInterval = "6 HOUR";
      break;
    case "12h":
      realInterval = "12 HOUR";
      break;
    case "1d":
      realInterval = "1 DAY";
      break;
    case "7d":
      realInterval = "7 DAY";
      break;
    case "30d":
      realInterval = "30 DAY";
      break;
    case "90d":
      realInterval = "90 DAY";
      break;
  }

  const bucketCountInt = parseInt(bucketCount);
  if (
    isNaN(bucketCountInt) ||
    bucketCountInt < 1 ||
    bucketCountInt > 150 ||
    !Number.isInteger(bucketCountInt)
  ) {
    return res.status(400).json({
      error: "Invalid bucketCount",
    });
  }

  const spinUpTime = Date.now() - startTime;

  const service = await prisma.service.findUnique({
    where: {
      id: req.params.serviceId,
    },
  });
  if (!service) {
    return res.status(404).json({
      error: "Service not found",
    });
  }
  if (!service.id === req.params.serviceId) {
    return res.status(403).json({
      error: "Forbidden",
    });
  }
  const serviceVerificationTime = Date.now() - startTime - spinUpTime;

  const overallQuery = Prisma.sql`
    SELECT
    (SELECT COUNT(*) FROM "Hit" WHERE "serviceId" = ${req.params.serviceId}) * 100.0 /
    (
        (SELECT COUNT(*) FROM "Hit" WHERE "serviceId" = ${req.params.serviceId}) +
        (SELECT COUNT(*) FROM "Failure" WHERE "serviceId" = ${req.params.serviceId})
    ) AS success_percentage;
  `;

  const success_query = await prisma.$queryRaw(overallQuery);
  const success_percentage = parseFloat(success_query[0].success_percentage);
  const overallQueryTime =
    Date.now() - startTime - spinUpTime - serviceVerificationTime;

  const query = `
    WITH CombinedData AS (
      SELECT
        id AS id,
        "createdAt" AS timestamp,
        'success' AS status,
        latency
      FROM
        "Hit"
      WHERE
        "serviceId" = '${req.params.serviceId}'
        AND "createdAt" >= NOW() - INTERVAL '${realInterval}'
      UNION ALL
      SELECT
        id AS id,
        "createdAt" AS timestamp,
        'failure' AS status,
        latency
      FROM
        "Failure"
      WHERE
        "serviceId" = '${req.params.serviceId}'
        AND "createdAt" >= NOW() - INTERVAL '${realInterval}'
    ),
    TimeBuckets AS (
      SELECT
        *,
        NTILE(${bucketCountInt}) OVER (ORDER BY timestamp ASC) AS bucket
      FROM
        CombinedData
    ),
    BucketSummary AS (
      SELECT
        bucket,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) AS failure_count,
        STRING_AGG(CASE WHEN status = 'failure' THEN id || '$' || timestamp END, ',') AS failure_details,
        AVG(latency) AS avg_latency,
        MAX(latency) AS max_latency,
        MIN(latency) AS min_latency,
        MIN(timestamp) AS starting_time,
        MAX(timestamp) AS ending_time
      FROM
        TimeBuckets
      GROUP BY
        bucket
    ),
    BucketWithLatency AS (
      SELECT
        bucket,
        latency,
        ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY latency) AS row_num,
        COUNT(*) OVER (PARTITION BY bucket) AS bucket_count
      FROM
        TimeBuckets
    ),
    BucketQuartiles AS (
      SELECT
        bucket,
        AVG(CASE WHEN row_num = lower_q1_row OR row_num = upper_q1_row THEN latency END) AS q1_latency,
        AVG(CASE WHEN row_num = lower_median_row OR row_num = upper_median_row THEN latency END) AS median_latency,
        AVG(CASE WHEN row_num = lower_q3_row OR row_num = upper_q3_row THEN latency END) AS q3_latency
      FROM (
        SELECT
          bucket,
          latency,
          row_num,
          bucket_count,
          FLOOR((bucket_count + 1) / 4.0) AS lower_q1_row,
          CEIL((bucket_count + 1) / 4.0) AS upper_q1_row,
          FLOOR((bucket_count + 1) / 2.0) AS lower_median_row,
          CEIL((bucket_count + 1) / 2.0) AS upper_median_row,
          FLOOR(3 * (bucket_count + 1) / 4.0) AS lower_q3_row,
          CEIL(3 * (bucket_count + 1) / 4.0) AS upper_q3_row
        FROM
          BucketWithLatency
      ) AS sub
      GROUP BY
        bucket
    )

    SELECT
      bs.bucket,
      (CAST(bs.success_count AS FLOAT) / bs.total) * 100 AS success_percentage,
      bs.success_count,
      bs.failure_count,
      bs.total,
      bs.avg_latency,
      bs.max_latency,
      bs.min_latency,
      bq.median_latency,
      bq.q1_latency,
      bq.q3_latency,
      bs.failure_details,
      bs.starting_time,
      bs.ending_time
    FROM
      BucketSummary bs
    JOIN
      BucketQuartiles bq ON bs.bucket = bq.bucket
    ORDER BY
      bs.bucket;
  `;

  writeFileSync("query.sql", query);

  const points = await prisma.$queryRawUnsafe(query);
  const mainQueryTime =
    Date.now() -
    startTime -
    spinUpTime -
    serviceVerificationTime -
    overallQueryTime;

  res.json({
    length: points.length,
    offset: 0,
    success_percentage,
    timing: {
      spin_up: spinUpTime,
      service_verification: serviceVerificationTime,
      overall_query: overallQueryTime,
      main_query: mainQueryTime,
      total: Date.now() - startTime,
    },
    service: {
      id: service.id,
      name: service.name,
    },
    averaged_data: {
      avg_avg_latency:
        points.reduce((acc, point) => acc + parseFloat(point.avg_latency), 0) /
        points.length,
      avg_max_latency:
        points.reduce((acc, point) => acc + parseFloat(point.max_latency), 0) /
        points.length,
      avg_min_latency:
        points.reduce((acc, point) => acc + parseFloat(point.min_latency), 0) /
        points.length,
      avg_median_latency:
        points.reduce(
          (acc, point) => acc + parseFloat(point.median_latency),
          0
        ) / points.length,
      avg_q1_latency:
        points.reduce((acc, point) => acc + parseFloat(point.q1_latency), 0) /
        points.length,
      avg_q3_latency:
        points.reduce((acc, point) => acc + parseFloat(point.q3_latency), 0) /
        points.length,
    },
    data: points.map((point) => {
      return {
        ...point,
        success_percentage: parseFloat(point.success_percentage),
        avg_latency: parseFloat(point.avg_latency),
        max_latency: parseFloat(point.max_latency),
        min_latency: parseFloat(point.min_latency),
        median_latency: parseFloat(point.median_latency),
        q1_latency: parseFloat(point.q1_latency),
        q3_latency: parseFloat(point.q3_latency),
        failure_details: point.failure_details
          ? point.failure_details.split(",").map((failure) => {
              const [id, timestamp] = failure.split("$");
              return {
                id,
                timestamp,
              };
            })
          : [],
      };
    }),
  });
};
