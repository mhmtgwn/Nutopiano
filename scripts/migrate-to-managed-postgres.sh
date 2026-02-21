#!/usr/bin/env bash
set -euo pipefail

SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:-}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/nutopiano-migration}"
BACKUP_PREFIX="${BACKUP_PREFIX:-nutopiano_migration}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ARTIFACT_FILE="$BACKUP_DIR/${BACKUP_PREFIX}_${TIMESTAMP}.dump"

if [[ -z "$SOURCE_DATABASE_URL" ]]; then
  echo "SOURCE_DATABASE_URL is required"
  exit 1
fi

if [[ -z "$TARGET_DATABASE_URL" ]]; then
  echo "TARGET_DATABASE_URL is required"
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump command not found in PATH"
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore command not found in PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Dumping source database into: $ARTIFACT_FILE"
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --dbname="$SOURCE_DATABASE_URL" \
  --file="$ARTIFACT_FILE"

echo "Restoring dump into target database"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$TARGET_DATABASE_URL" \
  "$ARTIFACT_FILE"

echo "Migration dump+restore completed."
echo "Run prisma migration deploy against target next:"
echo "  DATABASE_URL=\"$TARGET_DATABASE_URL\" npx prisma migrate deploy --schema backend/prisma/schema.prisma"
