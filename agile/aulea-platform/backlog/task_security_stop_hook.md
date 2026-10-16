ID: SEC-HOOK-001

Status: DRAFT

Priority: High

Effort: 3

Goal:
a Claude Code Stop hook runs `scripts/security-check.sh` when a turn ends and forces Claude to address new security findings before it stops.

Why:
dependency changes made during a sprint can introduce new vulnerabilities that nobody sees until a human reads the build output. The hook makes Claude see and handle them in the same turn, as part of the work.

Context:
Depends on `SEC-CHECK-001`. The hook must not loop forever: many findings have no fix available, which is why the check compares against an allowlist.

Out of scope:
* a per-edit (PostToolUse) hook, which would be too noisy
* the GitHub Action (`SEC-CI-001`)
* fixing findings automatically

Definition of Done:
* a Stop hook is configured in a checked-in Claude Code settings file of the `aulea-platform` repo, and calls `scripts/security-check.sh`
* the hook runs the check only when the working tree changed `package.json`, a lockfile, a Dockerfile or files under `server/src`. Otherwise it exits 0 immediately
* when the script reports new findings, the hook exits with code 2 and prints the findings to stderr, so Claude must address them
* the hook honors `stop_hook_active` and does not block a second time in the same stop cycle, so it cannot loop
* when the script cannot run (no network), the hook prints a warning and exits 0. It does not block
* the hook output tells Claude not to run `npm audit fix --force` blindly: fix, or add an allowlist entry with a reason and an expiry date, or report to the human
* unit tests (given / when / then) cover: no relevant change, relevant change with new findings, relevant change with clean result, `stop_hook_active` set, script unavailable
* verified automatically by the unit tests, and manually by adding a known-vulnerable dependency and ending a turn. The transcript is attached under `assets/SEC-HOOK-001/`
