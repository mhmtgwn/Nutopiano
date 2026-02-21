#!/usr/bin/env bash
set -euo pipefail

TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "$TARGET_DATABASE_URL" ]]; then
  echo "TARGET_DATABASE_URL (or DATABASE_URL) is required"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found in PATH"
  exit 1
fi

echo "Checking managed PostgreSQL connectivity..."
psql "$TARGET_DATABASE_URL" -c 'SELECT now();'

echo "Checking key table counts..."
psql "$TARGET_DATABASE_URL" -c 'SELECT COUNT(*) AS users FROM "User";'
psql "$TARGET_DATABASE_URL" -c 'SELECT COUNT(*) AS customers FROM "Customer";'
psql "$TARGET_DATABASE_URL" -c 'SELECT COUNT(*) AS products FROM "Product";'
psql "$TARGET_DATABASE_URL" -c 'SELECT COUNT(*) AS orders FROM "Order";'

echo "Managed PostgreSQL verification complete."
