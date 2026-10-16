ID: SEC-CHECK-001

Status: DRAFT

Priority: High

Effort: 5

Goal:
one script, `scripts/security-check.sh`, runs the security checks for `server/` and `client/` and fails only on new findings. It starts with `npm audit --omit=dev`. A committed allowlist records accepted findings, so the script does not fail forever on findings that have no available fix.

Why:
`scripts/uat.sh` prints 12 (server) and 10 (client) `npm audit` findings and nobody acts on them. A check that fails on every known finding would be ignored or would push toward `npm audit fix --force`, which breaks the build. The same script is later called by the Stop hook (`SEC-HOOK-001`) and the GitHub Action (`SEC-CI-001`), so local and CI results never differ.

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
* unit tests (given / when / then) cover the allowlist logic: a new finding fails, an allowlisted finding passes, an expired entry fails
* verified automatically by the unit tests, and manually by one run on a clean checkout. The run output is attached under `assets/SEC-CHECK-001/`
