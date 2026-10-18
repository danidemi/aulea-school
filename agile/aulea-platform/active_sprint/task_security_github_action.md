ID: SEC-CI-001

Status: READY

Priority: High

Effort: 5

Goal:
a GitHub Action runs the same `scripts/security-check.sh` as the Stop hook, and stores the results where humans can read them later.

Why:
the hook only protects work done with Claude on one machine. CI protects every change and also catches new CVEs that appear without any code change. Stored results give humans a history to review.

Context:
Depends on `SEC-CHECK-001`. The tool PBIs (`SEC-OSV-001`, `SEC-TRIVY-001`, `SEC-GITLEAKS-001`) add their tools to the script. If a tool PBI is done before this one, this workflow must install and run it. Otherwise the tool PBI adds the CI step later. The repository is public, so GitHub Code Scanning is free.

Out of scope:
* CodeQL (`SEC-CODEQL-001`) and Dependabot (`SEC-DEPENDABOT-001`)
* paid GitHub features
* deployment or release workflows

Definition of Done:
* a workflow in `.github/workflows/` calls `scripts/security-check.sh`. It contains no duplicated check logic
* it runs on pull requests, on pushes to `master`, and on a weekly schedule
* it fails a pull request on new high or critical findings in production dependencies, using the allowlist policy from `SEC-CHECK-001`. Everything else is reported and does not fail
* the human-readable report is written to the job summary (`$GITHUB_STEP_SUMMARY`)
* the JSON report is uploaded as a workflow artifact with a retention period of at least 90 days
* findings from the tools that produce SARIF are uploaded to GitHub Code Scanning, so there is a persistent dashboard of findings over time
* the workflow uses the minimum token permissions it needs, and pins third-party actions to a version or commit
* a failed scheduled run is visible to the maintainer (failed workflow notification)
* verified manually on GitHub with two runs: a clean one, and one with a deliberately added vulnerable dependency on a throwaway branch that fails the check. Links and screenshots are attached under `assets/SEC-CI-001/`

Implementation plan (sprint planning, 2026-10-18):
* The workflows folder is at the monorepo root, not under `aulea-platform/`: `piattaforma-corsi/.github/workflows/` already holds `docker-image.yml` and `integration-tests.yml`. The new file `security-check.yml` goes there, with `defaults.run.working-directory: aulea-platform` and path filters on `aulea-platform/**` for pull requests and pushes (the weekly schedule runs always). Mirror `integration-tests.yml` for the Node setup and cache.
* Steps: checkout, Node setup, `npm ci` in `server/` and `client/`, run `aulea-platform/scripts/security-check.sh`, write the human summary to `$GITHUB_STEP_SUMMARY`, upload the JSON with `actions/upload-artifact` (`retention-days: 90`), upload SARIF with `github/codeql-action/upload-sarif` when a tool produced one. At this sprint's end only `npm audit` exists, so the SARIF step is written to skip when no SARIF file exists.
* Permissions: `contents: read`, and `security-events: write` only on the job that uploads SARIF. Third-party actions are pinned to a commit SHA with the version in a comment.
* Gating: the job fails on exit code 1; exit code 2 (tool could not run) fails a scheduled run too, so the maintainer is notified.
* Manual verification uses a throwaway branch, as in the DoD. `SEC-CODEQL-001` and `SEC-DEPENDABOT-001` stay out of this sprint but will reuse this workflow's triggers.
