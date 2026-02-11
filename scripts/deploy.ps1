param(
  [string]$HostName = "185.255.93.94",
  [string]$UserName = "root",
  [string]$RemoteScript = "/var/www/Nutopiano/scripts/deploy.sh",
  [string]$AppDir = "/var/www/Nutopiano",
  [string]$Branch = "main",
  [string]$BackendPm2Name = "nutopiano-api",
  [string]$FrontendPm2Name = "nutopiano-web"
)

$envs = @(
  "APP_DIR=$AppDir",
  "BRANCH=$Branch"
)

if ($BackendPm2Name -and $BackendPm2Name.Trim().Length -gt 0) {
  $envs += "BACKEND_PM2_NAME=$BackendPm2Name"
}
if ($FrontendPm2Name -and $FrontendPm2Name.Trim().Length -gt 0) {
  $envs += "FRONTEND_PM2_NAME=$FrontendPm2Name"
}

$envPrefix = ($envs -join ' ')

$sshTarget = "$UserName@$HostName"
$remoteCmd = "bash -lc '$envPrefix $RemoteScript'"

Write-Host "Deploying to $sshTarget ..."
Write-Host "Remote: $remoteCmd"

ssh $sshTarget $remoteCmd
