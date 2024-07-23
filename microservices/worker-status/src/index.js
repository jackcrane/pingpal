import { Client } from 'pg';

BigInt.prototype.toJSON = function () {
	return parseFloat(this.toString());
};

export default {
	async fetch(request) {
		const client = new Client({
			connectionString:
				'postgresql://apps:fJaDhGKuGTuFXc7yURy0KQ@pingpal-production-15362.7tt.aws-us-east-1.cockroachlabs.cloud:26257/pingpal-primary?sslmode=verify-full',
		});
		await client.connect();

		const url = new URL(request.url);
		const startTime = Date.now();
		const interval = url.searchParams.get('interval');
		const bucketCount = url.searchParams.get('bucketCount');
		const allowedIntervals = ['30m', '1h', '6h', '12h', '1d', '7d', '30d', '90d'];

		if (!allowedIntervals.includes(interval)) {
			return new Response(JSON.stringify({ error: 'Invalid interval' }), { status: 400 });
		}

		let realInterval;
		switch (interval) {
			case '30m':
				realInterval = '30 MINUTE';
				break;
			case '1h':
				realInterval = '1 HOUR';
				break;
			case '6h':
				realInterval = '6 HOUR';
				break;
			case '12h':
				realInterval = '12 HOUR';
				break;
			case '1d':
				realInterval = '1 DAY';
				break;
			case '7d':
				realInterval = '7 DAY';
				break;
			case '30d':
				realInterval = '30 DAY';
				break;
			case '90d':
				realInterval = '90 DAY';
				break;
		}

		const bucketCountInt = parseInt(bucketCount);
		if (isNaN(bucketCountInt) || bucketCountInt < 1 || bucketCountInt > 150 || !Number.isInteger(bucketCountInt)) {
			return new Response(JSON.stringify({ error: 'Invalid bucketCount' }), { status: 400 });
		}

		const spinUpTime = Date.now() - startTime;

		const serviceId = url.pathname.split('/')[2];
		const service = await client.query('SELECT * FROM "Service" WHERE id = $1', [serviceId]);
		if (service.rowCount === 0) {
			return new Response(JSON.stringify({ error: 'Service not found' }), { status: 404 });
		}
		const serviceVerificationTime = Date.now() - startTime - spinUpTime;

		// const cacheFile = `__cache/${serviceId}$${interval}$${bucketCount}.json`;

		// try {
		// 	const cacheData = await caches.default.match(cacheFile);
		// 	if (cacheData) {
		// 		const cacheTime = new Date(cacheData.headers.get('timestamp'));
		// 		if (Date.now() - cacheTime.getTime() < 60 * 1000 * 5) {
		// 			return cacheData;
		// 		}
		// 	}
		// } catch (e) {
		// 	// Cache miss or error
		// }

		const overallQuery = `
      SELECT
      (SELECT COUNT(*) FROM "Hit" WHERE "serviceId" = $1) * 100.0 /
      (
          (SELECT COUNT(*) FROM "Hit" WHERE "serviceId" = $1) +
          (SELECT COUNT(*) FROM "Failure" WHERE "serviceId" = $1)
      ) AS success_percentage;
    `;

		const success_query = await client.query(overallQuery, [serviceId]);
		const success_percentage = parseFloat(success_query.rows[0].success_percentage);
		const overallQueryTime = Date.now() - startTime - spinUpTime - serviceVerificationTime;

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
          "serviceId" = '${serviceId}'
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
          "serviceId" = '${serviceId}'
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
        (CAST(bs.success_count AS FLOAT) / CAST(bs.total AS FLOAT)) * 100 AS success_percentage,
        bs.success_count,
        bs.failure_count,
        bs.total,
        bs.avg_latency,
        bs.max_latency,
        bs.min_latency,
        bq.median_latency,
        bq.q1_latency,
        bq.q3_latency,
        bs.starting_time,
        bs.ending_time
      FROM
        BucketSummary bs
      JOIN
        BucketQuartiles bq ON bs.bucket = bq.bucket
      ORDER BY
        bs.bucket;
    `;

		console.log(query);
		console.log({ serviceId, bucketCountInt });

		const points = (await client.query(query)).rows;

		console.log('points', points.length);

		const responseData = {
			length: points.length,
			offset: 0,
			success_percentage,
			timing: {
				spin_up: spinUpTime,
				service_verification: serviceVerificationTime,
				overall_query: overallQueryTime,
				main_query: Date.now() - startTime - spinUpTime - serviceVerificationTime - overallQueryTime,
				total: Date.now() - startTime,
			},
			service: {
				id: serviceId,
				name: service.rows[0].name,
			},
			averaged_data: {
				avg_avg_latency: points.reduce((acc, point) => acc + parseFloat(point.avg_latency), 0) / points.length,
				avg_max_latency: points.reduce((acc, point) => acc + parseFloat(point.max_latency), 0) / points.length,
				avg_min_latency: points.reduce((acc, point) => acc + parseFloat(point.min_latency), 0) / points.length,
				avg_median_latency: points.reduce((acc, point) => acc + parseFloat(point.median_latency), 0) / points.length,
				avg_q1_latency: points.reduce((acc, point) => acc + parseFloat(point.q1_latency), 0) / points.length,
				avg_q3_latency: points.reduce((acc, point) => acc + parseFloat(point.q3_latency), 0) / points.length,
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
				};
			}),
		};

		responseData.timestamp = new Date().toISOString();
		responseData.query = query;
		// const cacheResponse = new Response(JSON.stringify(responseData, null, 2), {
		// 	headers: { 'Content-Type': 'application/json', timestamp: new Date().toISOString() },
		// });

		// await caches.default.put(cacheFile, cacheResponse.clone());

		client.end();
		return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });
	},
};
