# PingPal Backend v2

Self-hosted backend for the basic-statuspage frontend. Configuration lives in `config/pingpal.config.json` and live datapoints are stored in Redis (with an in-memory fallback for local development).

## Running

- Install deps: `cd v2 && npm install`
- Start dev server: `npm run dev` (default port `2000`)
- Set env: `REDIS_URL` (or `REDIS_TLS_URL`), optional `PORT`, optional `CONFIG_PATH`

## File-based routes

Routes live in `src/routes` and are discovered automatically. Examples:

- `GET /workspaces` → workspace metadata + service list
- `GET /workspaces/:workspaceId` → workspace details
- `GET /workspaces/:workspaceId/:serviceId` → bucketed metrics (`interval`, `bucketCount` query params)
- `GET /workspaces/:workspaceId/:serviceId/outages` → derived outages (`includeClosed`)
- `GET /workspaces/:workspaceId/:serviceId/outages/:outageId` → outage detail (`includeFailures`, `includeComments`)
- `POST /hits` → record a datapoint `{ serviceId, statusCode?, latencyMs?, ok? }`

## Data model

- **Config**: `config/pingpal.config.json` defines a single workspace plus services and defaults (expected status, latency thresholds, history limits).
- **Hits**: stored per-service in Redis sorted sets (`pingpal:hits:<serviceId>`). Hits drive uptime buckets, latency box-plots, and derived outages.
- **Outages**: computed on-the-fly from sequential failures. Open outages return `status: "OPEN"`; resolved ones include `resolvedAt`.

## Notes

- If Redis is unreachable, the server logs a warning and uses in-memory storage for the current process lifetime.
- CORS is open by default to keep the frontend happy while running locally.
