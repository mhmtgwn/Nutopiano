param(
  [string]$HostName = "185.255.93.94",
  [string]$UserName = "root",
  [string]$RemoteScript = "/var/www/nutopiano_app/scripts/deploy.sh",
  [string]$AppDir = "/var/www/nutopiano_app",
  [string]$Branch = "main",
  [ValidateSet("production", "staging")]
  [string]$DeployEnv = "production",
  [string]$BackendPm2Name = "",
  [string]$FrontendPm2Name = "",
  [string]$FrontendApiUrl = "",
  [string]$EcosystemFile = "",
  [string]$AuthSmokeRequired = "true",
  [string]$AuthSmokeBaseUrl = "",
  [string]$AuthSmokePhone = "",
  [string]$AuthSmokePassword = ""
)

function ConvertTo-ShellLiteral {
  param([AllowEmptyString()][string]$Value)

  return "'" + ($Value -replace "'", '''"''"''') + "'"
}

function New-EnvAssignment {
  param(
    [string]$Name,
    [AllowEmptyString()][string]$Value
  )

  return "$Name=$(ConvertTo-ShellLiteral $Value)"
}

$defaultBackendPm2 = if ($DeployEnv -eq "staging") { "nutopiano-api-staging" } else { "nutopiano-api" }
$defaultFrontendPm2 = if ($DeployEnv -eq "staging") { "nutopiano-web-staging" } else { "nutopiano-web" }
$defaultApiUrl = if ($DeployEnv -eq "staging") { "https://staging-api.nutopiano.com/api/v1" } else { "https://api.nutopiano.com/api/v1" }
$defaultEcosystemFile = if ($DeployEnv -eq "staging") { "ecosystem.staging.config.cjs" } else { "ecosystem.config.cjs" }

if (-not $BackendPm2Name) { $BackendPm2Name = $defaultBackendPm2 }
if (-not $FrontendPm2Name) { $FrontendPm2Name = $defaultFrontendPm2 }
if (-not $FrontendApiUrl) { $FrontendApiUrl = $defaultApiUrl }
if (-not $EcosystemFile) { $EcosystemFile = $defaultEcosystemFile }
if (-not $AuthSmokeBaseUrl) { $AuthSmokeBaseUrl = $FrontendApiUrl }

$envs = @(
  (New-EnvAssignment "APP_DIR" $AppDir),
  (New-EnvAssignment "BRANCH" $Branch),
  (New-EnvAssignment "DEPLOY_ENV" $DeployEnv),
  (New-EnvAssignment "FRONTEND_API_URL" $FrontendApiUrl),
  (New-EnvAssignment "ECOSYSTEM_FILE" $EcosystemFile),
  (New-EnvAssignment "AUTH_SMOKE_REQUIRED" $AuthSmokeRequired),
  (New-EnvAssignment "AUTH_SMOKE_BASE_URL" $AuthSmokeBaseUrl)
)

if ($BackendPm2Name -and $BackendPm2Name.Trim().Length -gt 0) {
  $envs += New-EnvAssignment "BACKEND_PM2_NAME" $BackendPm2Name
}
if ($FrontendPm2Name -and $FrontendPm2Name.Trim().Length -gt 0) {
  $envs += New-EnvAssignment "FRONTEND_PM2_NAME" $FrontendPm2Name
}
if ($AuthSmokePhone -and $AuthSmokePhone.Trim().Length -gt 0) {
  $envs += New-EnvAssignment "AUTH_SMOKE_PHONE" $AuthSmokePhone
}
if ($AuthSmokePassword -and $AuthSmokePassword.Trim().Length -gt 0) {
  $envs += New-EnvAssignment "AUTH_SMOKE_PASSWORD" $AuthSmokePassword
}

$envPrefix = ($envs -join ' ')

$sshTarget = "$UserName@$HostName"
$remoteDeployCommand = "$envPrefix bash $(ConvertTo-ShellLiteral $RemoteScript)"
$remoteCmd = "bash -lc $(ConvertTo-ShellLiteral $remoteDeployCommand)"

Write-Host "Deploying to $sshTarget ..."
Write-Host "Remote: $remoteCmd"

ssh $sshTarget $remoteCmd
