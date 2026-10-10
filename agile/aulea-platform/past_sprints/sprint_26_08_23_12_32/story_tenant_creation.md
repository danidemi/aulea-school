ID: TENANT-001

As:
an `registered user`

I want:
the system to check whether I'm already associated with a tenant, create one if not, and
associate me to it

So that:
other users in other tenants cannot access my resources

Definition of Done:
* the system knows what tenants the user is associated to
* a `registered user` has a single `current tenant` at any time
* the `current tenant` is shown near the user's avatar

Implemented (sprint, 2026-08-22):
* tenant assignment happens at `POST /api/login`, not signup (signup never starts a session)
* auto-created tenant name: `${email}'s workspace` (unique by construction via unique email);
  concurrent first-logins race on `tenants.name`'s unique constraint, loser re-reads the
  winner's row rather than erroring
* current tenant carried in session (`req.session.tenantId`/`tenantName`), returned by
  `GET /api/me` as `tenant: {id, name}`
* one-tenant-per-user model (not multi-membership) — matches the DoD's "single current tenant"
* dropped the ORM-SELECTION-001 spike table/script now that TENANT-001 is implemented
  (migration `0004_illegal_toad_men.sql`)
* 41/41 server tests, 24/24 client tests
* manual verification: repeated logins by the same user reuse the same tenant, a different
  user gets a distinct tenant, confirmed via `psql`
