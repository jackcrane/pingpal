# PingPal Backend v2

Self-hosted backend for the basic-statuspage frontend. Configuration lives in `config/pingpal.config.json` and live datapoints are stored in Redis.

## Running

- Install deps: `cd v2 && npm install`
- Start dev server: `npm run dev` (default port `2000`)
- Required env: `REDIS_URL`, `JWT_SECRET` (no fallback). Optional: `PORT`, `CONFIG_PATH`.

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

## Data model

- **Config**: `config/pingpal.config.json` defines a single workspace plus services and defaults (expected status, latency thresholds, history limits).
- **Hits**: stored per-service in Redis sorted sets (`pingpal:hits:<serviceId>`). Hits drive uptime buckets, latency box-plots, and derived outages.
- **Outages**: computed on-the-fly from sequential failures. Open outages return `status: "OPEN"`; resolved ones include `resolvedAt`.

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
