ID: SEC-GITLEAKS-001

Status: READY

Priority: Medium

Effort: 3

Goal:
add `gitleaks` (open source, MIT, free) to the security check, to find secrets committed to the repository.

Why:
a committed password, API key or token is a serious and hard-to-undo leak, and the repo is public on GitHub. The project already handles secrets such as the planned Google OAuth client secret, which must only live in env vars.

Context:
Depends on `SEC-CHECK-001`.

Out of scope:
* rewriting git history or rotating any secret found (reported to the human instead)
* the GitHub Action itself (`SEC-CI-001`)

Definition of Done:
* `scripts/security-check.sh` runs `gitleaks` on the working tree and on the commits not yet pushed. The CI run (`SEC-CI-001`) scans the full history
* any finding fails the check. Secrets have no "reported only" level
* a committed gitleaks config file lists known false positives, each with a reason. The `.env.example` placeholders are handled there
* a missing `gitleaks` gives an install hint and the "tool could not run" exit code
* if the workflow from `SEC-CI-001` already exists, it runs this step. Otherwise `SEC-CI-001` picks it up
* verified automatically by a test that plants a fake secret in a temporary repo and checks that the step fails, and manually by one clean run on the real repo. The output is attached under `assets/SEC-GITLEAKS-001/`
* if the first full-history scan finds real secrets, the PBI stops and the human decides what to do
