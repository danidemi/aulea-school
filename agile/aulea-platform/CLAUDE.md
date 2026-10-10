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

## Drizzle migration naming

Files in `../../aulea-platform/server/drizzle/` are named `<seq>_<description>.sql`, e.g. `0020_new_traffic_view.sql`. Keep the zero-padded numeric prefix (drizzle-kit uses it for execution order); the suffix must describe what the migration does, not an invented phrase.

When generating a new migration, pass `--name`: `npx drizzle-kit generate --name <description>` (run from `aulea-platform/server`). Do not accept drizzle-kit's random default name.

If a migration file is renamed after the fact, update the matching `tag` entry in `drizzle/meta/_journal.json` to keep it in sync.
