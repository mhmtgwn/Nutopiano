# Cloudflare CDN Cutover Guide

This guide covers `D-03 Cloudflare CDN` rollout for Nutopiano.

## Scope

- `nutopiano.com` and `www.nutopiano.com` (frontend)
- `api.nutopiano.com` (backend API)

## 1. Cloudflare Zone Setup

1. Add domain to Cloudflare.
2. Update registrar nameservers to Cloudflare-provided nameservers.
3. Wait until zone status is active.

## 2. DNS Records

Create records (example):

- `A @ -> <server_ip>` (Proxy: ON)
- `A www -> <server_ip>` (Proxy: ON)
- `A api -> <server_ip>` (Proxy: ON)

Notes:

- Keep mail-related records (`MX`, SPF, DKIM, DMARC) as required.
- Use Proxy ON for WAF + DDoS + CDN benefits.

## 3. SSL/TLS

- Cloudflare SSL mode: `Full (strict)`
- Origin cert:
  - Option A: Let’s Encrypt on origin
  - Option B: Cloudflare Origin Certificate on Nginx
- Enable:
  - Always Use HTTPS
  - Automatic HTTPS Rewrites
  - HTTP/2 and HTTP/3

## 4. Caching Rules

Recommended baseline:

- Bypass cache:
  - `/api/*`
  - `/api/v1/*`
  - Auth/cart/account/dashboard paths
- Cache static assets:
  - `*.css`, `*.js`, `*.mjs`, `*.jpg`, `*.png`, `*.webp`, `*.svg`, `*.woff2`
  - TTL: 1h-7d (depending on release cadence)

## 5. Security Rules

- Enable WAF managed rules.
- Enable Bot Fight Mode (or Super Bot Fight if available).
- Add rate limiting for API auth routes:
  - `/api/v1/auth/login`
  - `/api/v1/auth/forgot-password`
- Restrict origin access to Cloudflare IP ranges where possible (firewall/Nginx).

## 6. Origin (Nginx) Alignment

- Use `scripts/nginx.example.conf` as base.
- Important:
  - Preserve real client IP via `CF-Connecting-IP` (already noted in config).
  - Keep API responses non-cacheable.

## 7. Validation Checklist

After enabling proxy:

1. `https://nutopiano.com` opens and login works.
2. `https://api.nutopiano.com/api/v1/health` returns healthy.
3. Checkout/order flow works end-to-end.
4. `/uploads/*` and static assets return expected cache headers.
5. Origin logs show real client IP (not only Cloudflare edges).
6. No CSRF/cookie regressions.

## 8. Rollback Plan

- Set critical DNS records to Proxy OFF (gray cloud) temporarily.
- Revert problematic Cloudflare cache/rate rules.
- Keep origin certificates valid during rollback window.
