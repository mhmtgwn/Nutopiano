#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/nutopiano_app}"
BRANCH="${BRANCH:-main}"

BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-nutopiano-api}"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-nutopiano-web}"

log() {
  printf "\n==> %s\n" "$1"
}

ensure_frontend_env() {
  local env_file="$FRONTEND_DIR/.env.local"
  local desired_api_url="https://api.nutopiano.com/api"

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

ensure_pm2_apps() {
  local ecosystem="$APP_DIR/ecosystem.config.cjs"
  if [[ ! -f "$ecosystem" ]]; then
    return 1
  fi

  local backend_exists=false
  local frontend_exists=false

  if pm2 describe "$BACKEND_PM2_NAME" >/dev/null 2>&1; then backend_exists=true; fi
  if pm2 describe "$FRONTEND_PM2_NAME" >/dev/null 2>&1; then frontend_exists=true; fi

  if [[ "$backend_exists" == "true" && "$frontend_exists" == "true" ]]; then
    return 0
  fi

  log "PM2 apps missing; starting ecosystem"
  BACKEND_DIR="$BACKEND_DIR" FRONTEND_DIR="$FRONTEND_DIR" \
    BACKEND_PM2_NAME="$BACKEND_PM2_NAME" FRONTEND_PM2_NAME="$FRONTEND_PM2_NAME" \
    pm2 start "$ecosystem"
  return 0
}

log "Pull latest code ($BRANCH)"
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
  npx prisma migrate deploy
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

npm run build

log "Restart services"
restarted=false

ensure_pm2_apps || true

if restart_pm2 "$BACKEND_PM2_NAME"; then restarted=true; fi
if restart_pm2 "$FRONTEND_PM2_NAME"; then restarted=true; fi

if [[ "$restarted" == "false" ]]; then
  pm2 restart all
fi

log "Done"
pm2 status
