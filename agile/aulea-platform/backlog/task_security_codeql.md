ID: SEC-CODEQL-001

Status: DRAFT

Priority: Medium

Effort: 3

Goal:
add CodeQL static analysis of the TypeScript code in `server/` and `client/`, running on GitHub.

Why:
dependency scanners do not see bugs in the project's own code, such as injection, unsafe redirects or broken access control. CodeQL finds these patterns. It is free because the repository is public.

Context:
Depends on `SEC-CI-001`, because it reuses the same triggers and the Code Scanning upload. CodeQL runs only on GitHub. It is not part of `scripts/security-check.sh`, the Stop hook or local runs.

Out of scope:
* fixing the findings (each real one becomes its own PBI or bug)
* local execution of CodeQL
* paid GitHub Advanced Security features

Definition of Done:
* a GitHub workflow runs CodeQL for JavaScript/TypeScript on pull requests, on pushes to `master`, and on the weekly schedule
* results appear in the repository's Code Scanning alerts
* the first run is triaged in this PBI: each alert is fixed, dismissed with a written reason, or turned into a backlog PBI
* a new high-severity alert on a pull request is visible as a failing check, using the gating rule defined in `SEC-CI-001`
* verified manually on GitHub. A screenshot of the Code Scanning page and the triage notes are attached under `assets/SEC-CODEQL-001/`
