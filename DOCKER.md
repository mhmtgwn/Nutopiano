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

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/v1`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Stop

```bash
docker compose down
```

To remove DB/Redis volumes as well:

```bash
docker compose down -v
```

## Notes

- Backend runs `prisma migrate deploy` on start.
- Default credentials in compose are for local development only.
- Update `JWT_SECRET` and DB credentials before any non-local usage.
