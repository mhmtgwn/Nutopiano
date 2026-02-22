# Docker Quick Start

This project includes Docker setup for local development.

## Files

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

## Start

```bash
docker compose up -d --build
```

This starts core services only (`frontend`, `backend`, `postgres`, `redis`).

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Optional observability stack (Prometheus + Grafana):

```bash
docker compose --profile observability up -d --build
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (`admin` / `admin`)

## Stop

```bash
docker compose down
```

To remove DB/Redis volumes as well:

```bash
docker compose down -v
```

## Notes

- Backend runs `prisma migrate deploy` on start and retries until DB is ready.
- `depends_on` uses service health checks for startup ordering.
- Containers run built production artifacts (`start:prod`, `next start`) for predictable local parity.
- Default credentials in compose are for local development only.
- Update `JWT_SECRET` and DB credentials before any non-local usage.
