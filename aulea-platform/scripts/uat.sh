#!/usr/bin/env sh
# UAT-BOOTSTRAP-001: single entry point for a human-led UAT session.
#
# Brings up a known-clean, fully-built stack from a clean checkout:
#   1. tears down and recreates Postgres/mailpit (server/docker-compose.yml)
#   2. waits for Postgres to report healthy
#   3. builds the server (tsc)
#   4. builds the client (vite build)
#   5. starts the built server, which serves the built client and runs the
#      pending DB migrations itself on startup (server/src/index.ts) — this
#      script must not run `db:migrate` on top of that (do_and_donts.md,
#      sprint_26_08_22_15_56)
#
# Idempotent: re-running it tears down any already-running stack first,
# rather than erroring out on "container already exists"/"port in use".
#
# Whenever a story changes how the app is built/started/migrated, update
# this script in the same change (active_sprint/story_uat_bootstrap_script.md).

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/server/docker-compose.yml"

log() {
  printf '\n[uat] %s\n' "$1"
}

log "tearing down any existing stack..."
docker compose -f "$COMPOSE_FILE" down -v

log "starting Postgres and mailpit..."
docker compose -f "$COMPOSE_FILE" up -d

log "waiting for Postgres to be healthy..."
tries=0
max_tries=60
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose -f "$COMPOSE_FILE" ps -q postgres)" 2>/dev/null)" = "healthy" ]; do
  tries=$((tries + 1))
  if [ "$tries" -ge "$max_tries" ]; then
    echo "[uat] Postgres did not become healthy in time" >&2
    exit 1
  fi
  sleep 1
done
log "Postgres is healthy."

if [ ! -f "$ROOT_DIR/server/.env" ]; then
  log "server/.env not found — copying server/.env.example (clean checkout)"
  cp "$ROOT_DIR/server/.env.example" "$ROOT_DIR/server/.env"
fi

log "building the server..."
( cd "$ROOT_DIR/server" && npm ci && npm run build )

log "building the client..."
( cd "$ROOT_DIR/client" && npm ci && npm run build )

log "starting the built server (serves the built client, runs pending migrations)..."
cd "$ROOT_DIR/server"
exec npm start
