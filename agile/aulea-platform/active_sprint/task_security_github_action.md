ID: SEC-CI-001

Status: IN_REVIEW

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

Implemented (sprint, 2026-10-18):
* `.github/workflows/security-check.yml` (monorepo root). Triggers: pull requests and pushes to `master` with path filters on `aulea-platform/**` (and the workflow file), plus a weekly schedule (Monday 05:17 UTC, no path filter). It runs `scripts/security-check.sh --json security-report/security-check.json` with `defaults.run.working-directory: aulea-platform` and contains no check logic. Node setup and cache mirror `integration-tests.yml` (Node 24, both lockfiles); `npm ci` in `server/` and `client/`.
* Human summary: output is teed to a file and appended to `$GITHUB_STEP_SUMMARY`. JSON and text reports go to the `security-check-report` artifact, `retention-days: 90`, uploaded with `if: always()`.
* SARIF: `github/codeql-action/upload-sarif` runs only when `security-report/*.sarif` exists (none today, only npm audit exists) and not on fork pull requests (their token cannot write to Code Scanning). Later tool PBIs write their SARIF to `security-report/`.
* Gate: a final step fails the job on exit 1. Exit 2 (tool could not run) fails scheduled runs, so the maintainer gets the failed-workflow notification, and only warns on pull requests and pushes. Allowlist policy comes from the script (ADR-0016), so dev findings and allowlisted ones do not fail.
* Permissions: workflow default `contents: read`; the single job adds `security-events: write` (it is the job that uploads SARIF). All third-party actions are pinned to a commit SHA with the version in a comment (checkout v7.0.1, setup-node v6.5.0, upload-artifact v7.0.2, codeql-action v4.39.0); SHAs resolved from `git ls-remote` tags.
* `aulea-platform/.gitignore` ignores `security-report/`. YAML parses; the same command run locally exits 0 ([see SEC-CHECK-001 evidence](assets/SEC-CHECK-001/run-output-after-bumps.txt)).
* Manual verification on GitHub (PO, 2026-10-18, repo `danidemi/aulea-school`), job logs saved under `assets/SEC-CI-001/`:
  * Clean run, green: [run-clean-job-log.txt](assets/SEC-CI-001/run-clean-job-log.txt), [run 39164384801](https://github.com/danidemi/aulea-school/actions/runs/39164384801). The script printed `Security check: PASS (exit 0)`, the artifact `security-check-report` was uploaded (`retention-days: 90`), and the gate step passed with exit code 0.
  * Failing run, red: [run-failing-job-log.txt](assets/SEC-CI-001/run-failing-job-log.txt), [run 39163979168](https://github.com/danidemi/aulea-school/actions/runs/39163979168). `adm-zip` was downgraded on purpose in `package.json`. The script reported 5 new high findings in `server` production dependencies and `Security check: FAIL: new findings (exit 1)`. The artifact was still uploaded (`if: always()`), then the gate step ended with `##[error]Security check found new high or critical findings in production dependencies.` and exit code 1.
  * Dev-only high findings (`source-map-js`, `braces`) appear in both runs as "reported only" and do not fail the job.
* **Gaps against the DoD:** the attachments are job logs, not screenshots. Not exercised on GitHub: the job summary page (`$GITHUB_STEP_SUMMARY`; the step ran, the rendered page was not looked at), the SARIF upload (skipped by design, no SARIF yet), the weekly schedule and the failed-scheduled-run notification (exit 2 on a schedule), and the path filters.
* do_and_donts.md: "check tool availability live" (`gh` missing, so used `git ls-remote`); "blast radius" (the script's exit codes and JSON are unchanged; SEC-CODEQL-001 and SEC-DEPENDABOT-001 can reuse these triggers). The GUI and table entries do not apply.
