# Deploy Secrets Checklist

This document defines the GitHub Actions secrets required by `.github/workflows/deploy.yml`.

## Required Secrets

`DEPLOY_SSH_PRIVATE_KEY`
- Private key used by `webfactory/ssh-agent`.
- Must be the full PEM/OpenSSH content including begin/end lines.

`STAGING_SSH_HOST`
- SSH host for staging deployment.

`STAGING_SSH_USER`
- SSH user for staging deployment.

`STAGING_APP_DIR`
- App root on staging server.

`STAGING_DEPLOY_SCRIPT_PATH`
- Full path to deploy script on staging server.

`STAGING_FRONTEND_API_URL`
- `NEXT_PUBLIC_API_URL` value written during staging deploy.

`STAGING_AUTH_SMOKE_BASE_URL`
- Base URL used by post-deploy cookie login smoke test on staging.

`STAGING_AUTH_SMOKE_PHONE`
- Test phone number used for staging auth smoke.

`STAGING_AUTH_SMOKE_PASSWORD`
- Test password used for staging auth smoke.

`PRODUCTION_SSH_HOST`
- SSH host for production deployment.

`PRODUCTION_SSH_USER`
- SSH user for production deployment.

`PRODUCTION_APP_DIR`
- App root on production server.

`PRODUCTION_DEPLOY_SCRIPT_PATH`
- Full path to deploy script on production server.

`PRODUCTION_FRONTEND_API_URL`
- `NEXT_PUBLIC_API_URL` value written during production deploy.

`PRODUCTION_AUTH_SMOKE_BASE_URL`
- Base URL used by post-deploy cookie login smoke test on production.

`PRODUCTION_AUTH_SMOKE_PHONE`
- Test phone number used for production auth smoke.

`PRODUCTION_AUTH_SMOKE_PASSWORD`
- Test password used for production auth smoke.

## Add Secrets With GitHub CLI

```powershell
gh secret set DEPLOY_SSH_PRIVATE_KEY -R mhmtgwn/Nutopiano < "$env:USERPROFILE\.ssh\id_ed25519"

gh secret set STAGING_SSH_HOST -R mhmtgwn/Nutopiano -b "YOUR_STAGING_HOST"
gh secret set STAGING_SSH_USER -R mhmtgwn/Nutopiano -b "YOUR_STAGING_USER"
gh secret set STAGING_APP_DIR -R mhmtgwn/Nutopiano -b "/var/www/nutopiano_app_staging"
gh secret set STAGING_DEPLOY_SCRIPT_PATH -R mhmtgwn/Nutopiano -b "/var/www/nutopiano_app_staging/scripts/deploy.sh"
gh secret set STAGING_FRONTEND_API_URL -R mhmtgwn/Nutopiano -b "https://staging-api.nutopiano.com/api/v1"
gh secret set STAGING_AUTH_SMOKE_BASE_URL -R mhmtgwn/Nutopiano -b "https://staging-api.nutopiano.com/api/v1"
gh secret set STAGING_AUTH_SMOKE_PHONE -R mhmtgwn/Nutopiano -b "YOUR_STAGING_TEST_PHONE"
gh secret set STAGING_AUTH_SMOKE_PASSWORD -R mhmtgwn/Nutopiano -b "YOUR_STAGING_TEST_PASSWORD"

gh secret set PRODUCTION_SSH_HOST -R mhmtgwn/Nutopiano -b "YOUR_PRODUCTION_HOST"
gh secret set PRODUCTION_SSH_USER -R mhmtgwn/Nutopiano -b "YOUR_PRODUCTION_USER"
gh secret set PRODUCTION_APP_DIR -R mhmtgwn/Nutopiano -b "/var/www/nutopiano_app"
gh secret set PRODUCTION_DEPLOY_SCRIPT_PATH -R mhmtgwn/Nutopiano -b "/var/www/nutopiano_app/scripts/deploy.sh"
gh secret set PRODUCTION_FRONTEND_API_URL -R mhmtgwn/Nutopiano -b "https://api.nutopiano.com/api/v1"
gh secret set PRODUCTION_AUTH_SMOKE_BASE_URL -R mhmtgwn/Nutopiano -b "https://api.nutopiano.com/api/v1"
gh secret set PRODUCTION_AUTH_SMOKE_PHONE -R mhmtgwn/Nutopiano -b "YOUR_PRODUCTION_TEST_PHONE"
gh secret set PRODUCTION_AUTH_SMOKE_PASSWORD -R mhmtgwn/Nutopiano -b "YOUR_PRODUCTION_TEST_PASSWORD"
```

## Verify

```powershell
gh secret list -R mhmtgwn/Nutopiano
```

Then trigger deploy:

```powershell
gh workflow run deploy.yml -R mhmtgwn/Nutopiano -f target=staging
gh workflow run deploy.yml -R mhmtgwn/Nutopiano -f target=both
```

## Operational Notes

- If `Setup SSH Agent` fails, check `DEPLOY_SSH_PRIVATE_KEY` first.
- If `Add host key` fails, check `*_SSH_HOST`.
- If remote `bash` fails with `No such file or directory`, check `*_DEPLOY_SCRIPT_PATH`.
- Staging and production should ideally use separate app directories and PM2 app names.
