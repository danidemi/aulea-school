# ADR-0016: Security check baseline, allowlist and exit codes

## Status
Accepted — 2026-10-18 (sprint planning for SEC-CHECK-001)

## Context
`scripts/uat.sh` prints `npm audit` findings (12 in `server`, 10 in `client`) and nobody acts on
them. A check that fails on every known finding would be ignored, or would push toward
`npm audit fix --force`, which breaks the build. The same check must run in three places (a
Claude Code Stop hook, a GitHub Action, a developer's shell) with identical results. More tools
(OSV, Trivy, gitleaks) will be added later.

## Decision
* One entry point, `aulea-platform/scripts/security-check.sh`, a thin wrapper over a TypeScript
  program in `server/scripts/security-check/`, run with `tsx` and unit tested with `vitest`. The
  allowlist, expiry and JSON parsing are real logic and need real tests; bash is hard to test.
* **Fails** (exit 1): a high or critical finding in a production dependency that is not in the
  allowlist, or whose allowlist entry has expired.
* **Reported only**: everything else, including all dev-dependency findings.
* **Tool could not run** (exit 2, e.g. no network): distinct from "findings", so callers can warn
  instead of blocking.
* If a run has both new findings and a check that could not run, the exit code is 1 (a known
  failure is not hidden by a flaky tool). A broken or unreadable allowlist is also exit 2.
* Output: a human summary on stdout and a JSON summary (stable shape, also used by CI) written to a
  file path given by `--json`.
  The JSON has `version`, `generatedAt`, `exitCode`, `result` (`pass`/`fail`/`error`), `checks`,
  `counts` (`new`, `expired`, `allowed`, `reported`) and `findings` (each with `check`, `id`,
  `package`, `severity`, `dependency`, `fixAvailable`, `status`, plus `reason` and `expires` when
  allowlisted). Changing this shape needs a new `version`.
* Findings are per advisory and package. An entry matches on `id` (GHSA id, or the numeric npm
  advisory id when there is none) and `package`. An entry is accepted through the end of its
  `expires` day (UTC).
* Allowlist: `aulea-platform/security/allowlist.json`, entries `{ id, package, reason, expires }`.
  An entry is added by a human-approved change that states the reason and an expiry date (at most
  6 months). An expired entry stops being accepted. `npm audit fix --force` is never the answer.
* Other tools plug in through one `Check` interface (`name`, `run()`), reusing the same policy and
  allowlist.

## Consequences
* Local, hook and CI results cannot differ, because they run the same program.
* Accepted risks are visible and expire, so they are revisited.
* The exit codes and the JSON shape are a contract for SEC-HOOK-001, SEC-CI-001, SEC-OSV-001,
  SEC-TRIVY-001 and SEC-GITLEAKS-001.
