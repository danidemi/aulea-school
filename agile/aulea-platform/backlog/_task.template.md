ID: [short unique id, e.g. TEST-INTEGRATION-001]

Status: DRAFT

Priority: [High | Medium | Low]

Effort: [story points, Fibonacci scale: 1, 2, 3, 5, 8, 13 — relative size, not hours]

Goal:
[the technical or maintenance work to be done, stated as an outcome]

Why:
[the reason it is needed and the value it brings, e.g. the risk or gap it removes]

Out of scope:
* [what this task deliberately does not cover]

Definition of Done:
* [one concrete, checkable statement]
* [another concrete, checkable statement]
* [state whether verification is automatic or manual, and how]

---

## Example (for reference only — delete before filling in a real task)

ID: DEPS-AUDIT-001

Status: DRAFT

Priority: Medium

Effort: 2

Goal:
upgrade the server dependencies that `npm audit` reports as high severity

Why:
known vulnerabilities in third-party packages would otherwise ship with the platform

Out of scope:
* major-version upgrades of the web framework

Definition of Done:
* `npm audit --omit=dev` in `server/` reports no high or critical findings
* the full unit and e2e suites are green after the upgrade
* verified automatically; the `npm audit` output is attached as evidence
