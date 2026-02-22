# Cloudflare CDN Cutover Guide

This runbook covers `D-03 Cloudflare CDN` rollout for Nutopiano.

## Scope

- `nutopiano.com` and `www.nutopiano.com` (frontend)
- `api.nutopiano.com` (backend API)

## 0. Required Access (From You)

You need these before cutover:

1. Domain registrar access (to change nameservers).
2. Cloudflare account access for the domain zone.
3. SSH access to origin server (Nginx host).
4. Current origin public IP address.
5. Existing mail DNS records list (`MX`, SPF, DKIM, DMARC), if mail is active on this domain.

## 1. Pre-Cutover Preparation

1. Lower current DNS TTL to `300` (if provider allows), at least 15-30 minutes before nameserver switch.
2. Take a snapshot of current DNS records.
3. Confirm backend health from origin:
   - `https://api.nutopiano.com/api/v1/health`
4. Keep rollback note: current nameservers and current DNS records.

## 2. Cloudflare Zone Setup

1. Add domain to Cloudflare.
2. Import DNS records.
3. Update registrar nameservers to Cloudflare-provided nameservers.
4. Wait until zone status is `Active`.

## 3. DNS Records (Cloudflare)

Recommended baseline:

- `A @ -> <origin_ip>` (Proxy: ON, orange cloud)
- `A www -> <origin_ip>` (Proxy: ON)
- `A api -> <origin_ip>` (Proxy: ON)

Notes:

- Keep all required mail records exactly as-is.
- If a service must bypass Cloudflare, set that record to Proxy OFF (gray cloud).

## 4. SSL/TLS Settings

Cloudflare dashboard:

1. SSL/TLS mode: `Full (strict)`.
2. Enable `Always Use HTTPS`.
3. Enable `Automatic HTTPS Rewrites`.
4. HTTP: keep HTTP/2 and HTTP/3 enabled.

Origin certificate on server:

- Option A: Let's Encrypt certs on origin.
- Option B: Cloudflare Origin Certificate on Nginx.

## 5. Origin Hardening (Nginx + Real IP)

Do not trust `CF-Connecting-IP` without trusted Cloudflare CIDRs.

1. Generate real IP snippet:
   - Linux/macOS:
     - `bash scripts/update-cloudflare-realip.sh`
   - Windows/PowerShell:
     - `powershell -File scripts/update-cloudflare-realip.ps1`
2. Place generated file at:
   - `/etc/nginx/snippets/cloudflare-realip.conf`
3. Include it in Nginx config:
   - `include /etc/nginx/snippets/cloudflare-realip.conf;`
4. Validate and reload:
   - `nginx -t`
   - `sudo systemctl reload nginx`

Reference config: `scripts/nginx.example.conf`

## 6. Cloudflare Rules (Recommended Baseline)

### Cache

1. Bypass cache for API:
   - Hostname `api.nutopiano.com` OR path starts with `/api/`.
2. Cache static assets aggressively:
   - Extensions: `css, js, mjs, jpg, jpeg, png, gif, webp, svg, ico, woff2`
   - Edge TTL: 1d-7d (based on release cadence).

### Security

1. Enable WAF managed rules.
2. Enable Bot Fight Mode.
3. Add rate limit rules:
   - `/api/v1/auth/login`
   - `/api/v1/auth/forgot-password`
4. Optional but recommended:
   - Restrict origin firewall inbound to Cloudflare IP ranges + SSH admin IP.

## 7. Validation

After proxy is enabled:

1. Site loads and auth works:
   - `https://nutopiano.com`
2. API health works:
   - `https://api.nutopiano.com/api/v1/health`
3. CDN headers exist:
   - `curl -I https://nutopiano.com`
   - `curl -I https://api.nutopiano.com/api/v1/health`
   - Expect Cloudflare headers like `cf-ray`.
4. Critical flows:
   - login, checkout, order create, POS API calls.
5. Verify origin logs have real visitor IP (not only Cloudflare edge IPs).

## 8. Rollback

1. Set affected DNS records to Proxy OFF temporarily.
2. Revert problematic cache/WAF/rate-limit rules.
3. If needed, switch registrar nameservers back to previous provider.
4. Keep origin certs valid during rollback window.
