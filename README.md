# Pingpal backend (single instance)

This backend runs as a single-tenant service that watches configured assets, stores hits/failures in Redis, and reads its configuration from a colocated JSON file. The dashboard and SaaS bits are gone; the landing page and basic status page are still served statically.

## Setup
- Set `REDIS_URL` (for example `redis://user:password@host:6379`).
- Edit `config/pingpal.config.json` to list the services you want to monitor. Defaults are applied when fields are omitted.
- Install dependencies and start the server:
  ```bash
  npm install
  npm start
  ```

## API surface
- `GET /health` – simple health check plus Redis reachability.
- `GET /api/services` – list configured services with their latest state.
- `GET /api/services/:id` – detail view with recent hits/failures (`?limit=50` by default).
- `POST /api/services/:id/check` – trigger an immediate check for a service.
- Static: landing page at `/`, status page at `/status`.

## Configuration notes
- Defaults live under `defaults` in `config/pingpal.config.json`; per-service values override them.
- History and failure lists are stored in Redis using the configured limits to avoid unbounded growth.
