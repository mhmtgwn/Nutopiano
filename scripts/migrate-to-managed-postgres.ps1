param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$TargetDatabaseUrl,
  [string]$BackupDir = "C:\backups\nutopiano\migration",
  [string]$BackupPrefix = "nutopiano_migration"
)

if (-not (Get-Command "pg_dump" -ErrorAction SilentlyContinue)) {
  throw "pg_dump command not found in PATH."
}

if (-not (Get-Command "pg_restore" -ErrorAction SilentlyContinue)) {
  throw "pg_restore command not found in PATH."
}

New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$artifactFile = Join-Path $BackupDir "$BackupPrefix`_$timestamp.dump"

Write-Host "Dumping source database into: $artifactFile"
& pg_dump `
  --format=custom `
  --compress=9 `
  --no-owner `
  --no-privileges `
  --dbname="$SourceDatabaseUrl" `
  --file="$artifactFile"

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with code $LASTEXITCODE"
}

Write-Host "Restoring dump into target database"
& pg_restore `
  --clean `
  --if-exists `
  --no-owner `
  --no-privileges `
  --dbname="$TargetDatabaseUrl" `
  "$artifactFile"

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with code $LASTEXITCODE"
}

Write-Host "Migration dump+restore completed."
Write-Host "Run prisma migration deploy against target next:"
Write-Host "DATABASE_URL=`"$TargetDatabaseUrl`" npx prisma migrate deploy --schema backend/prisma/schema.prisma"
