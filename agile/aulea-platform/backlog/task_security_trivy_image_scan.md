ID: SEC-TRIVY-001

Status: DRAFT

Priority: Medium

Effort: 3

Goal:
add Trivy (open source, Apache-2.0, free) to scan the project's Docker image for vulnerable OS packages and libraries.

Why:
the image is what actually ships. `npm audit` does not see the base image, system libraries, or what the `Dockerfile` copies in. Trivy covers that gap.

Context:
Depends on `SEC-CHECK-001`. The image is built from the root `Dockerfile` of `aulea-platform`.

Out of scope:
* changing the base image or fixing the findings
* scanning the lockfiles (`SEC-OSV-001`)
* the GitHub Action itself (`SEC-CI-001`)

Definition of Done:
* `scripts/security-check.sh` has a step that builds the image (or accepts an existing image name) and runs Trivy on it
* findings follow the same policy and allowlist as `SEC-CHECK-001`: new high or critical findings with an available fix fail, the rest is reported
* the step can be skipped locally with an explicit option (for example when Docker is not running), and the skip is printed in the summary
* a missing Trivy gives an install hint and the "tool could not run" exit code
* the Trivy vulnerability database is cached, so repeated runs do not download it every time
* if the workflow from `SEC-CI-001` already exists, it runs this step. Otherwise `SEC-CI-001` picks it up
* unit tests (given / when / then) cover the parsing of the tool's output and the allowlist match
* verified manually by one run on the real image. The output is attached under `assets/SEC-TRIVY-001/`
