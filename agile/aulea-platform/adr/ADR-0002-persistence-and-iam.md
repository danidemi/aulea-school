# ADR-0002: Persistence and IAM approach for aulea-platform

## Status
Accepted — 2026-08-20

## Context
Every remaining backlog story needs storage that ADR-0001 does not cover: tenants, users,
courses, and uploaded quiz files (TENANT-001, COURSE-001, QTI-22-IMPORT). SIGN-UP-001 also
left open whether to use an off-the-shelf IAM product (pocketbase/nhost/supabase) or build
auth ourselves. Both questions block further grooming of those stories, so they are decided
together here rather than story-by-story.

## Decision
* **PostgreSQL** as the persistence layer.
  * Relational fits the domain: tenants, users, and courses are naturally row-based with
    foreign keys (e.g. every course row carries a `tenant_id`), which is exactly the shape
    TENANT-001 and COURSE-001 need.
  * Mature TypeScript/Node drivers and query builders (e.g. Prisma or Drizzle) are available
    — a specific one is not chosen yet; that choice is deferred to whichever story first
    needs to read/write the database (TENANT-001).
  * Local/dev setup runs Postgres via Docker; no ADR change needed if that's how the human
    prefers to run it locally.
* **Build IAM ourselves**, inside the existing `server/` (Express + TypeScript), rather than
  adopting an off-the-shelf IAM product.
  * Google OAuth (LOGIN-001) via a library such as `passport` + `passport-google-oauth20`,
    with our own session handling and our own `users`/`tenants` tables in Postgres.
  * This keeps one data-access pattern (plain Postgres) across auth data and domain data
    (courses, quizzes), instead of splitting auth into a separate hosted product with its
    own API and its own database.
  * Cost: more code to write and maintain (session management, password hashing and
    confirmation email flow for SIGN-UP-001) than an off-the-shelf product would require.

## Consequences
* TENANT-001 is the first story to introduce the Postgres dependency and the `tenants`/
  `users` tables; LOGIN-001 (Google OAuth) and SIGN-UP-001 (email/password) both write to
  the same `users` table as alternative ways to become a `registered user`.
* COURSE-001 and QTI-22-IMPORT depend on this schema existing (course/quiz rows are
  tenant-scoped from the start — see the tenancy-before-courses sequencing decision recorded
  in `../backlog/story_tenant_creation.md` and `../backlog/story_course_dashboard.md`).
* A specific ORM/query builder and the local Postgres run method (Docker Compose vs. other)
  are left to be decided when TENANT-001 is picked up for development, not fixed here.
* Every story from here on that touches persistence uses Postgres unless a future ADR
  revises it.
