# PingPal Backend v2

Self-hosted backend for the basic-statuspage frontend. Configuration lives in `config/pingpal.config.json` and live datapoints are stored in Redis.

## Running

- Install deps: `cd v2 && npm install`
- Start dev server: `npm run dev` (default port `2000`)
- Required env: `REDIS_URL`, `JWT_SECRET`, `SIGN_SEED` (no fallback). Optional: `PORT`, `CONFIG_PATH`.
- Optional SMTP env for email notifications (all required when enabling alerts): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true|false`, defaults to `true` when port `465`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO` (comma/space separated list), and optional `SMTP_MESSAGE_ID_HOST` to override the hostname used in generated `Message-ID`s.

## Configuration

- Set `CONFIG_URL` to point at a remote `pingpal.config.json` served over HTTP(S). The backend bootstraps from that URL, caches the payload in-memory, and refreshes it every minute (`CONFIG_REFRESH_INTERVAL_MS`, minimum 5000ms).
- When `CONFIG_URL` is unset, configuration is loaded from disk (`config/pingpal.config.json` by default). Override with `CONFIG_PATH` if you want to mount a different file.
- The HTTP API is exposed under `/api/*` (override via `API_PREFIX`) and the compiled status page is served from the same origin. For local development you can still run the frontend separately; set `VITE_API_BASE_URL` to an absolute URL if needed.

## File-based routes

Routes live in `src/routes` and are discovered automatically. Examples:

- `GET /workspaces` → workspace metadata + service list
- `GET /workspaces/:workspaceId` → workspace details
- `GET /workspaces/:workspaceId/:serviceId` → bucketed metrics (`interval`, `bucketCount` query params)
- `GET /workspaces/:workspaceId/:serviceId/outages` → derived outages (`includeClosed`)
- `GET /workspaces/:workspaceId/:serviceId/outages/:outageId` → outage detail (`includeFailures`, `includeComments`)
- `POST /hits` → record a datapoint `{ serviceId, statusCode?, latencyMs?, ok? }`

## Worker

- A cron-driven worker (`src/worker.js`) runs every second and dispatches checks per service using their `intervalSeconds` (or default).
- Each check fetches the service URL with timeouts/headers/methods from config, computes status/latency health, and records hits into Redis respecting history limits.
- Services default to HTTP checks, but you can now set `type` to `postgres` or `mysql` to run SQL queries. Database checks require a `connectionString` (URI or MySQL connection options), a `query`, and optional `acceptance` rules:

```json
{
  "id": "inventory-db",
  "name": "Inventory DB health",
  "type": "postgres",
  "connectionString": "postgres://user:pass@db.internal:5432/app",
  "query": "SELECT 1",
  "maxLatencyMs": 2000,
  "acceptance": {
    "expectedRows": 1,
    "minRows": 1,
    "maxRows": 1
  },
  "intervalSeconds": 60
}
```

Row-based acceptance can specify `expectedRows`, `minRows`, or `maxRows`. Latency thresholds (`maxLatencyMs`) work for SQL services just like HTTP, and hits store row counts as metadata for later inspection.

## Secret signing & encryption

- Set `SIGN_SEED` in your environment once. On boot the server derives a deterministic RSA key pair from this seed (no randomness) and stores it in `config/.signing`.
- Visit the hidden `/_/sign` page on the backend. It fetches the workspace public key (`GET /api/signing/public-key`) and encrypts any URL/connection string entirely in the browser, returning tokens that look like `enc:rsa:v1:<base64>`.
- Paste the encrypted value into `pingpal.config.json`. When the worker runs, it first treats the field as plaintext; if it doesn't resemble a URL/connection string it automatically attempts to decrypt it with the private key. Failures surface as hits with reason `UNDECIPHERABLE_SOURCE`.
- This workflow keeps secrets out of the public config while still letting the worker access them securely.

## Data model

- **Config**: `config/pingpal.config.json` defines a single workspace plus services and defaults (expected status, latency thresholds, history limits).
- **Hits**: stored per-service in Redis sorted sets (`pingpal:hits:<serviceId>`). Hits drive uptime buckets, latency box-plots, and derived outages.
- **Outages**: computed on-the-fly from sequential failures. Open outages return `status: "OPEN"`; resolved ones include `resolvedAt`.

## Notifications & email alerts

- `defaults.notifications` now defines the alert policy for all services. Each service can override these values via its own `notifications` object. Supported flags:
  - `notifyOnOutage` (boolean) — send an email when a service first goes down.
  - `notifyOnRecovery` (boolean) — send an email when a previously failing service recovers. Recovery messages reply to the outage email where possible so threads stay grouped.
  - `notifyOnDegraded` (boolean) — send an email the first time a check reports success but the latency exceeds `degradedThresholdMs`.
  - `degradedThresholdMs` (number) — latency threshold that marks a degraded check. Thresholds inherit from defaults when omitted.
- Email delivery uses the SMTP settings listed above from `.env`. Alerts include metadata headers (`X-PingPal-*`) so downstream systems can filter or archive by workspace, service, or event type.
- Notification state (open outage/degraded threads) is tracked per-service in Redis. Clearing Redis will reset the state and re-arm the alert triggers.

## Notes

- If Redis is unreachable, the server logs a warning and uses in-memory storage for the current process lifetime.
- CORS is open by default to keep the frontend happy while running locally.

## Docker

- Build the full stack container (frontend build + API + static hosting) from the repo root: `docker build -t pingpal .`
- Runtime env to set: `REDIS_URL`, `JWT_SECRET`, plus any of the config flags above (`CONFIG_URL`, `CONFIG_REFRESH_INTERVAL_MS`, `STATIC_ASSETS_DIR`, etc.).
- By default the container serves the SPA assets from `/app/v2/public` and exposes the API on port `2000` under the `/api` prefix. Adjust `API_PREFIX`/`STATIC_ASSETS_DIR` env vars if you move things around.

## Faker (data seeding)

- Generate 30 days of synthetic hits into Redis: `npm run faker -- --id my-service --avg 250 --down 5`
- Flags: `--id` (service id, required), `--avg` (avg response ms, required), `--down` (percentage downtime 0-100, required), `--days` (default 30), `--interval` seconds between datapoints (default 60), `--historyLimit` to override trimming (omit to keep everything).
