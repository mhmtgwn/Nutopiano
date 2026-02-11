#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/Nutopiano}"
BRANCH="${BRANCH:-main}"

BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

BACKEND_PM2_NAME="${BACKEND_PM2_NAME:-nutopiano-api}"
FRONTEND_PM2_NAME="${FRONTEND_PM2_NAME:-nutopiano-web}"

log() {
  printf "\n==> %s\n" "$1"
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

npm run build

log "Restart services"
restarted=false
if restart_pm2 "$BACKEND_PM2_NAME"; then restarted=true; fi
if restart_pm2 "$FRONTEND_PM2_NAME"; then restarted=true; fi

if [[ "$restarted" == "false" ]]; then
  pm2 restart all
fi

log "Done"
pm2 status
