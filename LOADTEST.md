# Load Testing (k6)

This project includes a baseline k6 scenario:

- `scripts/loadtest/k6-api-smoke.js`

It covers:

- `GET /api/v1/health`
- `GET /api/v1/marketplace/search`
- Optional login flow (`POST /api/v1/auth/login` + `GET /api/v1/auth/profile`)
- Optional order create flow (`POST /api/v1/orders`)
- Optional stock update flow (`PATCH /api/v1/products/:id`)

## Prerequisites

- Install k6: https://k6.io/docs/get-started/installation/
- Backend reachable from your machine.

## Quick Run

```bash
k6 run scripts/loadtest/k6-api-smoke.js
```

Defaults:

- Base URL: `http://localhost:3001/api/v1`
- VUs: `10`
- Duration: `1m`

## Auth Scenario

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Order Scenario

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
K6_ORDER_CUSTOMER_ID=1 \
K6_ORDER_PRODUCT_ID=1 \
K6_ORDER_QUANTITY=1 \
K6_ORDER_PRICE_CENTS=1000 \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Stock Update Scenario (admin/staff auth required)

```bash
K6_BASE_URL=http://localhost:3001/api/v1 \
K6_PHONE=5xxxxxxxxx \
K6_PASSWORD='YourStrongPassword123!' \
K6_STOCK_PRODUCT_ID=1 \
K6_STOCK_TARGET=50 \
k6 run scripts/loadtest/k6-api-smoke.js
```

## Tunables

- `K6_VUS` (default: `10`)
- `K6_DURATION` (default: `1m`)
- `K6_SEARCH_QUERY` (default: `piano`)
- `K6_SEARCH_PAGE_SIZE` (default: `20`)
- `K6_STOCK_PRODUCT_ID` (default: `0`, disabled)
- `K6_STOCK_TARGET` (default: `-1`, disabled)

## Notes

- The script handles CSRF token flow before unsafe requests.
- For stable results, run against staging with representative data.
