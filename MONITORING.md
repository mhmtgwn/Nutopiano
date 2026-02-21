# Monitoring Dashboard (Prometheus + Grafana)

Monitoring stack is provided via Docker Compose:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (default `admin/admin`)

## Backend Metrics Endpoint

- Endpoint: `GET /api/v1/metrics`
- Format: Prometheus text exposition
- Includes Node.js default metrics via `prom-client`

## Start Monitoring Stack

```bash
docker compose up -d --build
```

## Prometheus Config

- File: `monitoring/prometheus/prometheus.yml`
- Scrape target: `backend:3001`
- Metrics path: `/api/v1/metrics`

## Grafana Provisioning

- File: `monitoring/grafana/provisioning/datasources/prometheus.yml`
- Prometheus datasource is preconfigured.

## Notes

- Change Grafana default admin credentials before non-local use.
- Keep monitoring data volumes persistent (`prometheus_data`, `grafana_data`).
