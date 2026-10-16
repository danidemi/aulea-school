ID: SEC-CI-001

Status: DRAFT

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
