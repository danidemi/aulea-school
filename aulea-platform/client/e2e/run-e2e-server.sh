#!/usr/bin/env sh
# E2E-BROWSER-001: brings up a disposable Postgres (isolated compose
# project + port, per do_and_donts.md's disposable-instance-verification
# rule — never touches a developer's own server/docker-compose.yml
# stack) and starts the real built server serving the real built client,
# for Playwright's `webServer` to drive against a known-clean instance.

set -eu

CLIENT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ROOT_DIR=$(cd "$CLIENT_DIR/.." && pwd)
SERVER_DIR="$ROOT_DIR/server"
COMPOSE_FILE="$CLIENT_DIR/e2e/docker-compose.e2e.yml"
PROJECT_NAME="aulea-platform-e2e"

E2E_DB_PORT="${E2E_DB_PORT:-5433}"
E2E_APP_PORT="${E2E_PORT:-3100}"

log() {
  printf '\n[e2e] %s\n' "$1"
}

# Teardown of the disposable Postgres happens in `global-teardown.ts`
# (Playwright's own teardown hook), not here — this process is killed
# outright (SIGTERM) once Playwright is done with it, same as `uat.sh`'s
# own idempotent "tear down first" pattern means a leaked stack from an
# aborted run is cleaned up by the next run's own teardown-first step
# below, not by this script trying to catch every exit path itself.
log "tearing down any leftover e2e stack from a previous run..."
E2E_DB_PORT="$E2E_DB_PORT" docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down -v

log "starting a disposable Postgres on port $E2E_DB_PORT..."
E2E_DB_PORT="$E2E_DB_PORT" docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d

log "waiting for Postgres to be healthy..."
tries=0
max_tries=60
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(E2E_DB_PORT="$E2E_DB_PORT" docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps -q postgres)" 2>/dev/null)" = "healthy" ]; do
  tries=$((tries + 1))
  if [ "$tries" -ge "$max_tries" ]; then
    echo "[e2e] Postgres did not become healthy in time" >&2
    exit 1
  fi
  sleep 1
done
log "Postgres is healthy."

log "building the server..."
( cd "$SERVER_DIR" && npm run build )

log "building the client..."
( cd "$CLIENT_DIR" && npm run build )

log "starting the built server on port $E2E_APP_PORT..."
export DATABASE_URL="postgres://aulea_platform:aulea_platform@localhost:${E2E_DB_PORT}/aulea_platform"
export PORT="$E2E_APP_PORT"
export EXPEDITE_SIGNUP_ENABLED=true
export SESSION_SECRET="e2e-test-secret"
export APP_BASE_URL="http://localhost:${E2E_APP_PORT}"
cd "$SERVER_DIR"
exec node dist/index.js
