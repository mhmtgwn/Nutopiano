# Managed PostgreSQL Migration Guide

This document covers migration from current PostgreSQL to a managed provider (RDS, Railway, Supabase, etc.).

## Scripts

- Linux/macOS migrate: `scripts/migrate-to-managed-postgres.sh`
- Windows migrate: `scripts/migrate-to-managed-postgres.ps1`
- Linux/macOS verification: `scripts/verify-managed-postgres.sh`
- Windows verification: `scripts/verify-managed-postgres.ps1`

## Managed Service Baseline (Backup/Failover/Monitoring)

Before cutover, ensure these are enabled in your provider console:

1. Automated backups enabled (minimum 7 days retention, recommended 14-30 days).
2. Point-in-time recovery enabled.
3. High availability / automatic failover enabled (for example Multi-AZ in AWS RDS).
4. Monitoring and alerts configured for CPU, storage, connections and replication lag.
5. SSL/TLS enforced for connections (`sslmode=require` in `DATABASE_URL`).

Optional but recommended:

- Keep application-level logical backups with `scripts/backup-postgres.sh` or `scripts/backup-postgres.ps1` as a second recovery path.

## 1. Prepare Target Database

- Create managed PostgreSQL instance.
- Create DB user with required privileges.
- Whitelist app server IPs.
- Copy full connection URL including SSL params if required.

Example:

```text
postgresql://user:pass@host:5432/dbname?sslmode=require
```

## 2. Dump and Restore

Linux/macOS:

```bash
SOURCE_DATABASE_URL="postgresql://local_user:local_pass@localhost:5432/nutopiano" \
TARGET_DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
bash scripts/migrate-to-managed-postgres.sh
```

Windows PowerShell:

```powershell
.\scripts\migrate-to-managed-postgres.ps1 `
  -SourceDatabaseUrl "postgresql://local_user:local_pass@localhost:5432/nutopiano" `
  -TargetDatabaseUrl "postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require"
```

## 3. Apply Prisma Migrations on Target

```bash
DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

## 4. Verify

```bash
TARGET_DATABASE_URL="postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require" \
bash scripts/verify-managed-postgres.sh
```

Windows PowerShell:

```powershell
.\scripts\verify-managed-postgres.ps1 `
  -TargetDatabaseUrl "postgresql://managed_user:managed_pass@managed-host:5432/nutopiano?sslmode=require"
```

## 5. Cutover

- Update server `DATABASE_URL` to managed DB URL.
- Restart backend.
- Validate `/api/v1/health` and critical flows.

## Rollback

- Keep old DB read-only copy for rollback window.
- If cutover fails, switch `DATABASE_URL` back and restart backend.
- Reconcile writes before next cutover attempt.
