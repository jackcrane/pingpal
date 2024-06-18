
    WITH CombinedData AS (
      SELECT
        id AS id,
        createdAt AS timestamp,
        'success' AS status,
        latency
      FROM
        Hit
      WHERE
        serviceId = '5db95c88-4247-4b2d-8ad5-93ce2b5b940e'
        AND createdAt >= NOW() - INTERVAL 30 DAY
      UNION ALL
      SELECT
        id AS id,
        createdAt AS timestamp,
        'failure' AS status,
        latency
      FROM
        Failure
      WHERE
        serviceId = '5db95c88-4247-4b2d-8ad5-93ce2b5b940e'
        AND createdAt >= NOW() - INTERVAL 30 DAY
    ),
    TimeBuckets AS (
      SELECT
        *,
        NTILE(100) OVER (ORDER BY timestamp ASC) AS bucket
      FROM
        CombinedData
    ),
    BucketSummary AS (
      SELECT
        bucket,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) AS failure_count,
        GROUP_CONCAT(CASE WHEN status = 'failure' THEN CONCAT(id, '$', timestamp) END SEPARATOR ',') AS failure_details,
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
      (bs.success_count / bs.total) * 100 AS success_percentage,
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
  