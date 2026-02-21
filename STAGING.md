# Staging Deployment Guide

This project now supports a dedicated staging profile.

## Files

- `ecosystem.staging.config.cjs`
- `scripts/deploy.sh` (`DEPLOY_ENV=staging`)
- `scripts/deploy.ps1 -DeployEnv staging`

## Expected Staging Defaults

- Backend PM2 app: `nutopiano-api-staging`
- Frontend PM2 app: `nutopiano-web-staging`
- Backend port: `3101`
- Frontend port: `3100`
- Frontend API URL: `https://staging-api.nutopiano.com/api/v1`

## Linux Remote Deploy

```bash
DEPLOY_ENV=staging \
APP_DIR=/var/www/nutopiano_app_staging \
BRANCH=staging \
ECOSYSTEM_FILE=ecosystem.staging.config.cjs \
bash /var/www/nutopiano_app_staging/scripts/deploy.sh
```

## Windows Trigger (PowerShell)

```powershell
.\scripts\deploy.ps1 `
  -HostName "YOUR_SERVER_IP" `
  -UserName "root" `
  -AppDir "/var/www/nutopiano_app_staging" `
  -Branch "staging" `
  -DeployEnv "staging"
```

## Notes

- `deploy.sh` updates `frontend/.env.local` and ensures `NEXT_PUBLIC_API_URL` is set for the target environment.
- Keep production and staging in separate folders and PM2 app names.
- Use separate database and Redis instances for staging.
