ID: SEC-OSV-001

Status: DRAFT

Priority: Medium

Effort: 3

Goal:
add `osv-scanner` (open source, Apache-2.0, free) to the security check, scanning the lockfiles of `server/` and `client/`.

Why:
`npm audit` only uses the npm advisory database. OSV aggregates more sources, so it can report vulnerabilities that `npm audit` misses.

Context:
Depends on `SEC-CHECK-001`. The project has no budget, so only free tools are used.

Out of scope:
* scanning the Docker image (`SEC-TRIVY-001`)
* the GitHub Action itself (`SEC-CI-001`)

Definition of Done:
* `scripts/security-check.sh` runs `osv-scanner` on `server/package-lock.json` and `client/package-lock.json`
* findings follow the same policy as `npm audit`: new high or critical findings in production dependencies fail, the rest is reported, and the same allowlist file is used
* the script prints a clear install hint when `osv-scanner` is missing, and exits with the "tool could not run" code instead of passing silently
* the installation steps for developers are documented in the repo README or the script header
* if the workflow from `SEC-CI-001` already exists, it installs and runs the tool. Otherwise `SEC-CI-001` picks it up
* unit tests (given / when / then) cover the parsing of the tool's output and the allowlist match
* verified automatically by the unit tests, and manually by one run. The output is attached under `assets/SEC-OSV-001/`
