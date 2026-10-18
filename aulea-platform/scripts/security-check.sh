#!/usr/bin/env sh
# SEC-CHECK-001 / ADR-0016: single entry point for the security checks.
#
# Thin wrapper: the logic lives in server/scripts/security-check/ (TypeScript, unit tested).
# Exit codes: 0 clean, 1 new findings, 2 tool could not run (no network, missing install, bad allowlist).
# Usage: scripts/security-check.sh [--json <file>] [--allowlist <file>]
#
# Runs from any working directory. Needs `npm ci` in server/ first (for tsx).

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
TSX="$ROOT_DIR/server/node_modules/.bin/tsx"

if [ ! -x "$TSX" ]; then
  echo "Security check: tsx not found. Run 'npm ci' in server/ first." >&2
  exit 2
fi

exec "$TSX" "$ROOT_DIR/server/scripts/security-check/main.ts" "$@"
