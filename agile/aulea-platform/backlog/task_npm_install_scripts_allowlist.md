ID: SEC-INSTALL-SCRIPTS-001

Status: DRAFT

Priority: Medium

Effort: 2

Goal:
review the packages whose install scripts npm reports as "not yet covered by allowScripts" and approve only the ones the project needs.

Why:
install scripts run arbitrary code on every `npm ci`, on developer machines and in CI. This is a known supply-chain attack path. The `uat.sh` output lists `esbuild`, `cpu-features`, `protobufjs` and `ssh2` as pending. An explicit allowlist means a new package with an install script is noticed.

Out of scope:
* removing the dependencies that bring these packages in
* any other supply-chain control

Definition of Done:
* each pending package is reviewed: where it comes from in the dependency tree, whether it is a runtime or a dev dependency, and what its install script does. The review is written in this PBI
* the packages that are really needed are approved through npm's allow-scripts mechanism. The ones that are not needed stay blocked
* `npm ci` in `server/` and `client/` prints no "not yet covered by allowScripts" warning
* `npm run build`, the unit tests, the integration tests and `scripts/uat.sh` still work on a clean checkout
* verified manually. The clean `npm ci` output and the `uat.sh` run are attached under `assets/SEC-INSTALL-SCRIPTS-001/`
