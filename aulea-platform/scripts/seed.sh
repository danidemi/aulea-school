#!/usr/bin/env sh
# TESTDATA-001: single entry point for a human tester to seed known test data.
#
# Wraps `npm run db:seed` (server/scripts/db-seed.ts) so a tester doesn't need
# source-level knowledge to run it. Requires the app stack to already be
# running (see uat.sh) with EXPEDITE_SIGNUP_ENABLED=true.
#
# Safe to re-run: the seed script scopes its own teardown/recreate to the
# fixed @seed.local tenant/accounts, never touching other data.

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

cd "$ROOT_DIR/server"
npm run db:seed
