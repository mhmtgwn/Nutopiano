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
  [string]$EcosystemFile = ""
)

$defaultBackendPm2 = if ($DeployEnv -eq "staging") { "nutopiano-api-staging" } else { "nutopiano-api" }
$defaultFrontendPm2 = if ($DeployEnv -eq "staging") { "nutopiano-web-staging" } else { "nutopiano-web" }
$defaultApiUrl = if ($DeployEnv -eq "staging") { "https://staging-api.nutopiano.com/api/v1" } else { "https://api.nutopiano.com/api/v1" }
$defaultEcosystemFile = if ($DeployEnv -eq "staging") { "ecosystem.staging.config.cjs" } else { "ecosystem.config.cjs" }

if (-not $BackendPm2Name) { $BackendPm2Name = $defaultBackendPm2 }
if (-not $FrontendPm2Name) { $FrontendPm2Name = $defaultFrontendPm2 }
if (-not $FrontendApiUrl) { $FrontendApiUrl = $defaultApiUrl }
if (-not $EcosystemFile) { $EcosystemFile = $defaultEcosystemFile }

$envs = @(
  "APP_DIR=$AppDir",
  "BRANCH=$Branch",
  "DEPLOY_ENV=$DeployEnv",
  "FRONTEND_API_URL=$FrontendApiUrl",
  "ECOSYSTEM_FILE=$EcosystemFile"
)

if ($BackendPm2Name -and $BackendPm2Name.Trim().Length -gt 0) {
  $envs += "BACKEND_PM2_NAME=$BackendPm2Name"
}
if ($FrontendPm2Name -and $FrontendPm2Name.Trim().Length -gt 0) {
  $envs += "FRONTEND_PM2_NAME=$FrontendPm2Name"
}

$envPrefix = ($envs -join ' ')

$sshTarget = "$UserName@$HostName"
$remoteCmd = "bash -lc '$envPrefix bash $RemoteScript'"

Write-Host "Deploying to $sshTarget ..."
Write-Host "Remote: $remoteCmd"

ssh $sshTarget $remoteCmd
