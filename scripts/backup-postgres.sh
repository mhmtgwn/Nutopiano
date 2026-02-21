#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nutopiano/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_PREFIX="${BACKUP_PREFIX:-nutopiano}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump command not found in PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

RAW_FILE="$BACKUP_DIR/${BACKUP_PREFIX}_${TIMESTAMP}.dump"
GZ_FILE="${RAW_FILE}.gz"

echo "Creating PostgreSQL backup: $RAW_FILE"
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_URL" \
  --file="$RAW_FILE"

gzip -f "$RAW_FILE"

echo "Pruning backups older than $BACKUP_RETENTION_DAYS day(s) in $BACKUP_DIR"
find "$BACKUP_DIR" -type f -name "${BACKUP_PREFIX}_*.dump.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete

echo "Backup complete: $GZ_FILE"
