This folder is the SCRUM root for the aulea-platform project.

The SCRUM process itself (folder structure, backlog refinement, sprint planning, sprint,
sprint review, retrospective) is owned by the `agile` skill — invoke it for any backlog/sprint
work here. Don't duplicate that process in this file.

# Development practices

Applies to all development carried out during a sprint on this project:

- Use language best practices.
- Write unit tests using the given / when / then pattern.
- Ensure existing automatic unit tests keep passing alongside any new ones.
- If a change adds a new kind of entity, or changes an API shape that `server/scripts/db-seed.ts`
  (TESTDATA-001) relies on, update that seed script in the same change so it keeps producing a
  representative, working seed rather than silently drifting out of date.
- The security check is part of the definition of done: run `../../aulea-platform/scripts/security-check.sh`
  (from the repo root: `aulea-platform/scripts/security-check.sh`) before declaring a change done. It
  fails (exit 1) on new high or critical findings in production dependencies. Accepted risks go in
  `aulea-platform/security/allowlist.json` with a reason and an expiry (ADR-0016). Never use
  `npm audit fix --force` to silence it. Exit 2 means the tool could not run (e.g. no network): say so,
  do not report it as a pass.

## Drizzle migration naming

Files in `../../aulea-platform/server/drizzle/` are named `<seq>_<description>.sql`, e.g. `0020_new_traffic_view.sql`. Keep the zero-padded numeric prefix (drizzle-kit uses it for execution order); the suffix must describe what the migration does, not an invented phrase.

When generating a new migration, pass `--name`: `npx drizzle-kit generate --name <description>` (run from `aulea-platform/server`). Do not accept drizzle-kit's random default name.

If a migration file is renamed after the fact, update the matching `tag` entry in `drizzle/meta/_journal.json` to keep it in sync.
