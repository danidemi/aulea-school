ID: SEC-DEPENDABOT-001

Status: DRAFT

Priority: Low

Effort: 2

Goal:
enable Dependabot version updates (free, built into GitHub) for `server/`, `client/`, the `Dockerfile` and the GitHub Actions used by the workflows.

Why:
scanners tell what is vulnerable today. Regular small update PRs keep the project from falling far behind, which makes each fix cheaper than a late large upgrade (see DEPS-001, where fixes needed major-version bumps).

Out of scope:
* automatic merging of update PRs
* major-version upgrades done by hand (each is its own PBI, for example `react-router-dom` v7)

Definition of Done:
* a committed `.github/dependabot.yml` covers the `npm` ecosystem for `server/` and `client/`, the `docker` ecosystem for the `Dockerfile`, and `github-actions`
* updates run weekly. Minor and patch updates are grouped into one PR per ecosystem to limit noise. The number of open PRs is limited
* update PRs run the same checks as any other PR (`SEC-CI-001`, once it exists)
* the policy for handling update PRs (who reviews, when they are merged) is written in the repo README or an ADR
* Dependabot security updates are enabled in the repository settings
* verified manually. The first update PR, or a screenshot of the Dependabot page, is attached under `assets/SEC-DEPENDABOT-001/`
