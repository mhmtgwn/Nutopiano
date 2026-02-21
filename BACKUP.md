# PostgreSQL Backup Guide

This guide covers local/remote backup and restore for Nutopiano PostgreSQL.

## Scripts

- Linux/macOS: `scripts/backup-postgres.sh`
- Windows: `scripts/backup-postgres.ps1`

## Required Environment

- `DATABASE_URL`

Optional:

- `BACKUP_DIR` (default Linux: `/var/backups/nutopiano/postgres`)
- `BACKUP_RETENTION_DAYS` (default: `14`)
- `BACKUP_PREFIX` (default: `nutopiano`)

## Run Backup (Linux)

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export BACKUP_DIR="/var/backups/nutopiano/postgres"
export BACKUP_RETENTION_DAYS=14
bash scripts/backup-postgres.sh
```

## Run Backup (Windows PowerShell)

```powershell
.\scripts\backup-postgres.ps1 `
  -DatabaseUrl "postgresql://user:pass@host:5432/dbname" `
  -BackupDir "C:\backups\nutopiano\postgres" `
  -RetentionDays 14
```

## Restore

Backup files are generated as `*.dump.gz`. To restore:

```bash
gunzip -c /path/to/nutopiano_YYYYMMDD_HHMMSS.dump.gz > /tmp/restore.dump
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="postgresql://user:pass@host:5432/dbname" \
  /tmp/restore.dump
```

## Cron Example (Daily at 03:00)

```cron
0 3 * * * DATABASE_URL="postgresql://user:pass@host:5432/dbname" BACKUP_DIR="/var/backups/nutopiano/postgres" BACKUP_RETENTION_DAYS=14 /bin/bash /var/www/nutopiano_app/scripts/backup-postgres.sh >> /var/log/nutopiano-backup.log 2>&1
```

## Notes

- Use separate backup paths for production and staging.
- Test restore procedure regularly.
- Keep offsite copy (object storage or secondary server) for disaster recovery.
