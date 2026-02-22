param(
  [string]$TargetDatabaseUrl = ""
)

if (-not $TargetDatabaseUrl) {
  if ($env:TARGET_DATABASE_URL) {
    $TargetDatabaseUrl = $env:TARGET_DATABASE_URL
  } elseif ($env:DATABASE_URL) {
    $TargetDatabaseUrl = $env:DATABASE_URL
  }
}

if (-not $TargetDatabaseUrl) {
  throw "TARGET_DATABASE_URL (or DATABASE_URL) is required."
}

if (-not (Get-Command "psql" -ErrorAction SilentlyContinue)) {
  throw "psql command not found in PATH."
}

Write-Host "Checking managed PostgreSQL connectivity..."
& psql "$TargetDatabaseUrl" -c "SELECT now();"
if ($LASTEXITCODE -ne 0) {
  throw "Connectivity check failed (psql exit code $LASTEXITCODE)."
}

$queries = @(
  'SELECT COUNT(*) AS users FROM "User";',
  'SELECT COUNT(*) AS customers FROM "Customer";',
  'SELECT COUNT(*) AS products FROM "Product";',
  'SELECT COUNT(*) AS orders FROM "Order";'
)

Write-Host "Checking key table counts..."
foreach ($query in $queries) {
  & psql "$TargetDatabaseUrl" -c "$query"
  if ($LASTEXITCODE -ne 0) {
    throw "Verification query failed (psql exit code $LASTEXITCODE): $query"
  }
}

Write-Host "Managed PostgreSQL verification complete."
