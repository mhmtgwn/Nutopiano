# Monitoring Dashboard (Prometheus + Grafana)

Monitoring stack is provided via Docker Compose:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (default `admin/admin`)

## Backend Metrics Endpoint

- Endpoint: `GET /api/v1/metrics`
- Format: Prometheus text exposition
- Includes Node.js default metrics via `prom-client`
- Includes custom metrics:
  - `nutopiano_http_requests_total`
  - `nutopiano_http_request_duration_seconds`
  - `nutopiano_db_connections`
  - `nutopiano_db_ping_duration_milliseconds`
  - `nutopiano_redis_used_memory_bytes`
  - `nutopiano_redis_connected_clients`

## Start Monitoring Stack

```bash
docker compose --profile observability up -d --build
```

## Prometheus Config

- File: `monitoring/prometheus/prometheus.yml`
- Scrape target: `backend:3001`
- Metrics path: `/api/v1/metrics`

## Grafana Provisioning

- File: `monitoring/grafana/provisioning/datasources/prometheus.yml`
- Prometheus datasource is preconfigured.
- File: `monitoring/grafana/provisioning/dashboards/dashboards.yml`
- Dashboard JSON: `monitoring/grafana/dashboards/nutopiano-overview.json`
- Default dashboard covers:
  - request rate
  - error rate
  - p95 response time
  - DB connection count / ping duration
  - Redis memory / connected clients

## Notes

- Change Grafana default admin credentials before non-local use.
- Keep monitoring data volumes persistent (`prometheus_data`, `grafana_data`).
