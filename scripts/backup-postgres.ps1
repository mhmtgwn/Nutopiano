param(
  [string]$DatabaseUrl = "",
  [string]$BackupDir = "C:\backups\nutopiano\postgres",
  [int]$RetentionDays = 14,
  [string]$BackupPrefix = "nutopiano"
)

if (-not $DatabaseUrl) {
  if ($env:DATABASE_URL) {
    $DatabaseUrl = $env:DATABASE_URL
  }
}

if (-not $DatabaseUrl) {
  throw "DATABASE_URL is required (parameter or environment variable)."
}

if (-not (Get-Command "pg_dump" -ErrorAction SilentlyContinue)) {
  throw "pg_dump command not found in PATH."
}

New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rawFile = Join-Path $BackupDir "$BackupPrefix`_$timestamp.dump"
$gzFile = "$rawFile.gz"

Write-Host "Creating PostgreSQL backup: $rawFile"
& pg_dump `
  --format=custom `
  --compress=9 `
  --no-owner `
  --no-privileges `
  --dbname="$DatabaseUrl" `
  --file="$rawFile"

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with code $LASTEXITCODE"
}

Write-Host "Compressing backup: $gzFile"
gzip -f $rawFile

Write-Host "Pruning backups older than $RetentionDays day(s) in $BackupDir"
$threshold = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -File -Filter "$BackupPrefix`_*.dump.gz" |
  Where-Object { $_.LastWriteTime -lt $threshold } |
  Remove-Item -Force

Write-Host "Backup complete: $gzFile"
