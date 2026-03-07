#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nutopiano_app}"
BRANCH="${BRANCH:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

if [[ "$DEPLOY_ENV" == "staging" ]]; then
  BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-nutopiano-api-staging}"
  FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-nutopiano-web-staging}"
else
  BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-nutopiano-api}"
  FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-nutopiano-web}"
fi

if [[ "$DEPLOY_ENV" == "staging" ]]; then
  DEFAULT_API_URL="https://staging-api.nutopiano.com/api/v1"
  DEFAULT_ECOSYSTEM_FILE="ecosystem.staging.config.cjs"
else
  DEFAULT_API_URL="https://api.nutopiano.com/api/v1"
  DEFAULT_ECOSYSTEM_FILE="ecosystem.config.cjs"
fi

FRONTEND_API_URL="${FRONTEND_API_URL:-$DEFAULT_API_URL}"
ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-$DEFAULT_ECOSYSTEM_FILE}"
FRONTEND_BUILD_WORKER="${FRONTEND_BUILD_WORKER:-1}"
FRONTEND_BUILD_NODE_OPTIONS="${FRONTEND_BUILD_NODE_OPTIONS:---max-old-space-size=4096}"
FRONTEND_BUILD_MODE="${FRONTEND_BUILD_MODE:-default}"
AUTH_SMOKE_BASE_URL="${AUTH_SMOKE_BASE_URL:-$FRONTEND_API_URL}"
AUTH_SMOKE_REQUIRED="${AUTH_SMOKE_REQUIRED:-true}"
FRONTEND_STATIC_BACKUP_DIR=""

log() {
  printf "\n==> %s\n" "$1"
}

ensure_frontend_env() {
  local env_file="$FRONTEND_DIR/.env.local"
  local desired_api_url="$FRONTEND_API_URL"

  if [[ ! -f "$env_file" ]]; then
    printf "NEXT_PUBLIC_API_URL=%s\n" "$desired_api_url" >"$env_file"
    return 0
  fi

  if grep -qE '^NEXT_PUBLIC_API_URL=' "$env_file"; then
    sed -i "s#^NEXT_PUBLIC_API_URL=.*#NEXT_PUBLIC_API_URL=${desired_api_url}#" "$env_file"
  else
    printf "\nNEXT_PUBLIC_API_URL=%s\n" "$desired_api_url" >>"$env_file"
  fi
}

backup_previous_frontend_static() {
  local static_dir="$FRONTEND_DIR/.next/static"

  if [[ ! -d "$static_dir" ]]; then
    return 0
  fi

  FRONTEND_STATIC_BACKUP_DIR="$(mktemp -d /tmp/nutopiano-prev-static.XXXXXX)"
  cp -a "$static_dir"/. "$FRONTEND_STATIC_BACKUP_DIR"/
  log "Frontend: backed up previous static assets to $FRONTEND_STATIC_BACKUP_DIR"
}

merge_previous_frontend_static() {
  local target_dir="$FRONTEND_DIR/.next/static"

  if [[ -z "$FRONTEND_STATIC_BACKUP_DIR" || ! -d "$FRONTEND_STATIC_BACKUP_DIR" ]]; then
    return 0
  fi

  if [[ ! -d "$target_dir" ]]; then
    rm -rf "$FRONTEND_STATIC_BACKUP_DIR" || true
    return 0
  fi

  log "Frontend: merging previous static assets for backward-compatible chunk URLs"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --ignore-existing "$FRONTEND_STATIC_BACKUP_DIR"/ "$target_dir"/
  else
    cp -an "$FRONTEND_STATIC_BACKUP_DIR"/. "$target_dir"/
  fi

  rm -rf "$FRONTEND_STATIC_BACKUP_DIR" || true
  FRONTEND_STATIC_BACKUP_DIR=""
}

restart_pm2() {
  local name="$1"
  if [[ -n "$name" ]]; then
    if pm2 describe "$name" >/dev/null 2>&1; then
      pm2 restart "$name"
      return 0
    fi
  fi
  return 1
}

wait_for_http_200() {
  local url="$1"
  local max_attempts="${2:-30}"
  local sleep_seconds="${3:-2}"
  local status=""

  for ((attempt=1; attempt<=max_attempts; attempt+=1)); do
    status="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
    if [[ "$status" == "200" ]]; then
      return 0
    fi

    sleep "$sleep_seconds"
  done

  echo "Timed out waiting for $url to return 200 (last status: ${status:-unknown})"
  return 1
}

run_auth_smoke() {
  local required_flag="${AUTH_SMOKE_REQUIRED,,}"
  local base_url="${AUTH_SMOKE_BASE_URL%/}"
  local health_url="${base_url}/health"
  local max_attempts=10
  local retry_sleep_seconds=2

  if [[ -z "${AUTH_SMOKE_PHONE:-}" || -z "${AUTH_SMOKE_PASSWORD:-}" ]]; then
    if [[ "$required_flag" == "true" ]]; then
      echo "Missing AUTH_SMOKE_PHONE or AUTH_SMOKE_PASSWORD"
      return 1
    fi

    log "Auth smoke skipped (credentials not configured)"
    return 0
  fi

  log "Auth smoke: waiting for $health_url"
  if ! wait_for_http_200 "$health_url" 30 2; then
    return 1
  fi

  local cookie_jar login_headers login_body profile_body
  local request_id login_status profile_status

  cookie_jar="$(mktemp /tmp/nutopiano-auth-smoke-cookie.XXXXXX)"
  login_headers="$(mktemp /tmp/nutopiano-auth-smoke-login-headers.XXXXXX)"
  login_body="$(mktemp /tmp/nutopiano-auth-smoke-login-body.XXXXXX)"
  profile_body="$(mktemp /tmp/nutopiano-auth-smoke-profile-body.XXXXXX)"
  request_id="deploy-smoke-$(date +%s)"

  for ((attempt=1; attempt<=max_attempts; attempt+=1)); do
    : > "$login_headers"
    : > "$login_body"
    login_status="$(
      curl -sS \
        -o "$login_body" \
        -D "$login_headers" \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "X-Request-Id: $request_id" \
        -c "$cookie_jar" \
        -b "$cookie_jar" \
        --data "{\"phone\":\"${AUTH_SMOKE_PHONE}\",\"password\":\"${AUTH_SMOKE_PASSWORD}\"}" \
        "$base_url/auth/login"
    )"

    if [[ "$login_status" == "200" || "$login_status" == "201" ]]; then
      break
    fi

    if [[ "$login_status" != "000" && "$login_status" != "502" && "$login_status" != "503" && "$login_status" != "504" ]]; then
      break
    fi

    sleep "$retry_sleep_seconds"
  done

  if [[ "$login_status" != "200" && "$login_status" != "201" ]]; then
    echo "Auth smoke login failed with status $login_status"
    cat "$login_body"
    rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
    return 1
  fi

  if ! grep -qi '^set-cookie: nutopiano_access=' "$login_headers"; then
    echo "Auth smoke login did not set nutopiano_access cookie"
    cat "$login_headers"
    rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
    return 1
  fi

  if ! grep -qi '^set-cookie: nutopiano_refresh=' "$login_headers"; then
    echo "Auth smoke login did not set nutopiano_refresh cookie"
    cat "$login_headers"
    rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
    return 1
  fi

  for ((attempt=1; attempt<=max_attempts; attempt+=1)); do
    : > "$profile_body"
    profile_status="$(
      curl -sS \
        -o "$profile_body" \
        -w "%{http_code}" \
        -H "Accept: application/json" \
        -H "X-Request-Id: $request_id-profile" \
        -c "$cookie_jar" \
        -b "$cookie_jar" \
        "$base_url/auth/profile"
    )"

    if [[ "$profile_status" == "200" ]]; then
      break
    fi

    if [[ "$profile_status" != "000" && "$profile_status" != "502" && "$profile_status" != "503" && "$profile_status" != "504" ]]; then
      break
    fi

    sleep "$retry_sleep_seconds"
  done

  if [[ "$profile_status" != "200" ]]; then
    echo "Auth smoke profile failed with status $profile_status"
    cat "$profile_body"
    rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
    return 1
  fi

  if ! grep -q '"userId"' "$profile_body"; then
    echo "Auth smoke profile response did not include userId"
    cat "$profile_body"
    rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
    return 1
  fi

  rm -f "$cookie_jar" "$login_headers" "$login_body" "$profile_body"
}

ensure_pm2_apps() {
  local ecosystem="$APP_DIR/$ECOSYSTEM_FILE"
  if [[ ! -f "$ecosystem" ]]; then
    echo "Missing PM2 ecosystem file: $ecosystem"
    return 1
  fi

  log "PM2: (re)load ecosystem"
  pm2 delete "$BACKEND_PM2_NAME" >/dev/null 2>&1 || true
  pm2 delete "$FRONTEND_PM2_NAME" >/dev/null 2>&1 || true
  BACKEND_DIR="$BACKEND_DIR" FRONTEND_DIR="$FRONTEND_DIR" \
    BACKEND_PM2_NAME="$BACKEND_PM2_NAME" FRONTEND_PM2_NAME="$FRONTEND_PM2_NAME" \
    pm2 start "$ecosystem" --update-env
  return 0
}

log "Pull latest code ($BRANCH)"
log "Deploy environment: $DEPLOY_ENV"
cd "$APP_DIR"
git fetch origin

git checkout "$BRANCH"
git pull origin "$BRANCH"

log "Backend install/build"
cd "$BACKEND_DIR"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ -f prisma/schema.prisma ]]; then
  npx prisma generate
  log "Prisma: resolve failed migrations (if any)"
  npx prisma migrate resolve --rolled-back 20260221202318_product_image --schema prisma/schema.prisma
  npx prisma migrate deploy
  log "Prisma: verify migration status"
  npm run prisma:migrate:status
fi

npm run build

log "Frontend install/build"
cd "$FRONTEND_DIR"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

ensure_frontend_env
backup_previous_frontend_static
rm -rf "$FRONTEND_DIR/.next"

if [[ "$FRONTEND_BUILD_MODE" == "webpack" ]]; then
  NEXT_PRIVATE_BUILD_WORKER="$FRONTEND_BUILD_WORKER" NODE_OPTIONS="$FRONTEND_BUILD_NODE_OPTIONS" npx next build --webpack
else
  NEXT_PRIVATE_BUILD_WORKER="$FRONTEND_BUILD_WORKER" NODE_OPTIONS="$FRONTEND_BUILD_NODE_OPTIONS" npm run build
fi
merge_previous_frontend_static

log "Restart services"
restarted=false

ensure_pm2_apps || true

if restart_pm2 "$BACKEND_PM2_NAME"; then restarted=true; fi
if restart_pm2 "$FRONTEND_PM2_NAME"; then restarted=true; fi

if [[ "$restarted" == "false" ]]; then
  pm2 restart all
fi

log "Post-deploy auth smoke"
run_auth_smoke

log "Done"
pm2 status
