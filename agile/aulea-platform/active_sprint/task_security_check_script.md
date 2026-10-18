ID: SEC-CHECK-001

Status: READY

Priority: High

Effort: 5

Goal:
one script, `scripts/security-check.sh`, runs the security checks for `server/` and `client/` and fails only on new findings. It starts with `npm audit --omit=dev`. A committed allowlist records accepted findings, so the script does not fail forever on findings that have no available fix.

Why:
`scripts/uat.sh` prints 12 (server) and 10 (client) `npm audit` findings and nobody acts on them. A check that fails on every known finding would be ignored or would push toward `npm audit fix --force`, which breaks the build. The same script is later called by the Stop hook (`SEC-HOOK-001`) and the GitHub Action (`SEC-CI-001`), so local and CI results never differ.

Decision (Product Owner, 2026-10-18): the script is written in Node/TypeScript, run with the same tooling as the existing server tests, and unit tested with the same runner. `scripts/security-check.sh` is a thin wrapper that calls it, so callers keep one stable entry point. Reason: the allowlist, expiry and JSON parsing logic is real code and needs real tests; bash is hard to unit test.

Context:
Later security tools (`SEC-OSV-001`, `SEC-TRIVY-001`, `SEC-GITLEAKS-001`) plug into this script. Past accepted risks are in `past_sprints/sprint_26_08_23_12_32/story_dependency_vulnerabilities.md` (DEPS-001); they seed the allowlist.

Out of scope:
* fixing the existing findings (only recording the ones accepted)
* the Stop hook, the GitHub Action and the other scanners (separate PBIs)
* `npm audit` for dev dependencies as a blocking check (reported, not blocking)

Definition of Done:
* `scripts/security-check.sh` runs `npm audit --omit=dev --audit-level=high` in `server/` and `client/` and exits non-zero when it finds a high or critical finding in a production dependency that is not in the allowlist
* dev-dependency findings are printed as a report and never change the exit code
* a committed allowlist file lists accepted findings. Each entry has the advisory id, the package, a reason and an expiry date. An expired entry stops being accepted and the script fails again
* the script prints a short machine-readable summary (JSON) and a human-readable summary, and uses a distinct exit code for "new findings" versus "tool could not run" (for example no network)
* the DEPS-001 accepted risks are seeded into the allowlist with their original reasons
* the script is idempotent and runs from any working directory, like `scripts/uat.sh`
* an ADR records the baseline/allowlist policy: what fails, what is only reported, how an entry is added, and the expiry rule
* `agile/aulea-platform/CLAUDE.md` "Development practices" states that the security check is part of the definition of done
* the logic lives in a TypeScript module under `scripts/` (or `server/`, decided at planning) and the `.sh` file only calls it
* unit tests (given / when / then) cover the allowlist logic: a new finding fails, an allowlisted finding passes, an expired entry fails
* verified automatically by the unit tests, and manually by one run on a clean checkout. The run output is attached under `assets/SEC-CHECK-001/`

Implementation plan (sprint planning, 2026-10-18):
* Layout: logic in `aulea-platform/server/scripts/security-check/` (TypeScript, run with `tsx`, tested with the server's `vitest`; the server already has both, so no new dependency). `aulea-platform/scripts/security-check.sh` is a thin wrapper (`cd` to its own directory root, then `npm --prefix server exec tsx ...`), same style as `uat.sh`. Allowlist: `aulea-platform/security/allowlist.json`.
* Modules: `runners` (spawn `npm audit --json --omit=dev` in `server/` and `client/`; the only part that touches the process/network), `parse` (audit JSON to a list of findings: id, package, severity, fix available, dev or prod), `allowlist` (pure: load, match, expiry against an injected clock), `report` (JSON summary and human text), `main` (exit codes: 0 clean, 1 new findings, 2 tool could not run). Pure modules get the unit tests, given / when / then, with recorded `npm audit` JSON fixtures.
* Tool plug-in point: a `Check` interface (`name`, `run()` returning findings or "could not run"), so `SEC-OSV-001`, `SEC-TRIVY-001` and `SEC-GITLEAKS-001` add one file each and do not touch `main`.
* Seed the allowlist from DEPS-001: `react-router-dom` v6 advisories and the `drizzle-kit` / `@esbuild-kit/*` chain (dev only, so reported, not blocking; the entry is still written with its reason). Expiry for seeded entries: 6 months from today.
* New ADR `ADR-0016-security-check-baseline-and-allowlist.md`: fail rule, report-only rule, entry fields, expiry rule, exit codes, why TypeScript and not bash.
* `agile/aulea-platform/CLAUDE.md` "Development practices": add the security check line.
* Lands in `.github`: nothing here; CI is `SEC-CI-001`.
* Blast radius: `uat.sh` prints the audit; it does not call the script, no change. `SEC-HOOK-001`, `SEC-CI-001`, `SEC-OSV-001`, `SEC-TRIVY-001`, `SEC-GITLEAKS-001` depend on the exit codes and the JSON shape above, so freeze them in the ADR.
