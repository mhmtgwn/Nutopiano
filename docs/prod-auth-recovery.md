# Prod Auth Recovery Runbook

Last updated: 2026-03-07

## 1. Required GitHub Secrets

Add these secrets before the deploy workflow can complete:

- `STAGING_AUTH_SMOKE_PHONE`
- `STAGING_AUTH_SMOKE_PASSWORD`
- `STAGING_AUTH_SMOKE_BASE_URL`
- `PRODUCTION_AUTH_SMOKE_PHONE`
- `PRODUCTION_AUTH_SMOKE_PASSWORD`
- `PRODUCTION_AUTH_SMOKE_BASE_URL`

`*_BASE_URL` should point to the API base, for example:

```text
https://staging-api.nutopiano.com/api/v1
https://api.nutopiano.com/api/v1
```

## 2. Check Auth Readiness

Run the backend report before and after the migration metadata fix:

```powershell
npm --prefix backend run auth:report
```

Expected auth-critical checks:

- `User.deletedAt` exists
- `User.lastLoginAt` exists
- `RefreshToken` exists
- `PermissionGroup` exists
- `UserPermissionGroup` exists
- Required migrations are marked as applied

## 3. Fix Migration Metadata Drift

If the columns and tables already exist but `_prisma_migrations` is missing the entries, do not re-edit the schema by hand. Mark the migrations as applied:

```powershell
npm --prefix backend exec prisma migrate resolve --applied 20260302100500_add_user_deleted_at --schema prisma/schema.prisma
npm --prefix backend exec prisma migrate resolve --applied 20260302101500_add_user_last_login_at --schema prisma/schema.prisma
npm --prefix backend exec prisma migrate resolve --applied 20260305153000_migrate_user_role_to_seller_staff --schema prisma/schema.prisma
```

If the schema objects are actually missing, run deploy first:

```powershell
npm --prefix backend exec prisma migrate deploy --schema prisma/schema.prisma
```

Then re-run:

```powershell
npm --prefix backend run prisma:migrate:status
npm --prefix backend run auth:report
```

## 4. Remediate Users Without Password Hashes

The current report lists active users where `passwordHash` is null or empty. These accounts cannot log in by design.

Do not backfill a silent password.

Use the report output to:

- contact the affected users
- trigger the approved reset flow where possible
- deactivate accounts that are test-only or no longer valid

Re-check with:

```powershell
npm --prefix backend run auth:report
```

## 5. Deploy and Verify

After pushing to `main`, the deploy workflow will enforce:

- clean Prisma migration status
- cookie-based auth smoke test

Manual smoke checks after deploy:

1. Log in on `https://nutopiano.com/login`
2. Verify `/auth/profile` succeeds with cookies after page refresh
3. Verify role routing lands on `/admin`, `/dashboard`, `/pos`, or `/account`
4. Verify admin role changes require a reason for `ADMIN`
5. Verify `/platform/*` redirects to `/admin/*`

## 6. If Login Still Fails

Capture the `X-Request-Id` from the failed response and look for the matching backend log entry. The auth flow now logs these stages:

- `login.user_lookup`
- `login.refresh_token_create`
- `profile.permission_resolve`
