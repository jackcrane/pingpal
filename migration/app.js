const cockroach =
  "postgresql://apps:fJaDhGKuGTuFXc7yURy0KQ@pingpal-production-15362.7tt.aws-us-east-1.cockroachlabs.cloud:26257/pingpal-primary?sslmode=verify-full";
const heroku =
  "postgres://uudhktmtgdl31:p3dd09d4ce1204c65fcb09e748b027f1be2fbeb2a25c51ef51e74b072378ea793@c5p86clmevrg5s.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfk54j4e5ks262";

import pg from "pg";
const { Client } = pg;

const hc = new Client({
  connectionString: heroku,
  ssl: {
    rejectUnauthorized: false,
  },
});
await hc.connect();

const cc = new Client({
  connectionString: cockroach,
  ssl: {
    rejectUnauthorized: false,
  },
});
await cc.connect();

console.log("Connected to Heroku and CockroachDB");

const tables = [
  "User",
  "Workspace",
  "Service",
  "Outage",
  "Comment",
  "Link",
  "Failure",
  "Hit",
];

// Migrate all the data from each hc table to cc tables
for (const table of tables) {
  console.log(`Migrating table: ${table}`);

  // Get the column names
  const columnsRes = await hc.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${table}';`
  );
  const columns = columnsRes.rows.map((row) => `"${row.column_name}"`);

  // Copy the data in batches of 1000 rows
  let offset = 0;
  const batchSize = 1000;
  const totalRowsRes = await hc.query(`SELECT COUNT(*) FROM "${table}";`);
  while (true) {
    const dataRes = await hc.query(
      `SELECT * FROM "${table}" ORDER BY 1 OFFSET ${offset} LIMIT ${batchSize};`
    );
    const rows = dataRes.rows;

    if (rows.length === 0) break;

    const insertValues = rows.map((row) =>
      columns.map((col) => row[col.slice(1, -1)])
    );
    const queryText = `INSERT INTO "${table}" (${columns.join(
      ", "
    )}) VALUES ${rows
      .map(
        (_, i) =>
          `(${columns
            .map((_, j) => `$${i * columns.length + j + 1}`)
            .join(", ")})`
      )
      .join(", ")} ON CONFLICT (id) DO NOTHING;`;

    try {
      await cc.query(queryText, insertValues.flat());
    } catch (error) {
      console.log(error);
    }

    offset += batchSize;

    console.log(
      `[${table}] Migrated ${offset} rows of ${totalRowsRes.rows[0].count} (${
        (offset / totalRowsRes.rows[0].count) * 100
      }%)`
    );
  }

  console.log(`Finished migrating table: ${table}`);
}

await hc.end();
await cc.end();

console.log("Migration complete");
