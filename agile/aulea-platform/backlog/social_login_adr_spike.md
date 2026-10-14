ID: SOCIAL-LOGIN-ADR-001

Status: DRAFT

Priority: Normal

Effort: 5

Type: spike (time-boxed research and proof, no production feature)

Goal:
decide how Google login is built, in a way that adding another provider later needs no redesign, and prove the decision against a real Google test client.

Context:
`SOCIAL-LOGIN-001` cannot be estimated before this. It touches ADR-0004 (password hashing, client routing) and ADR-0005 (session management). The account linking policy is already accepted by the Product Owner (see `SOCIAL-LOGIN-001`).

Dependency (external, must exist before work starts): a human creates a Google Cloud OAuth client (client id, secret, redirect URIs for local and production) and gives the id and secret to the developer through env vars, not in the repo.

Definition of Done:
* a new ADR compares at least: Passport.js with the Google strategy, `openid-client`, `arctic`, and a hand-written OIDC code flow with PKCE; and states the choice and why. It covers: how login state is checked (`state`, PKCE, `nonce`), how the result becomes an ADR-0005 session, where provider secrets live, and how a second provider is added.
* the ADR defines the data model for external identities: a provider-agnostic table (user, provider, provider subject id, email at link time) so a user can have several providers; and states what changes in `users` (nullable `password_hash` already exists)
* the ADR writes the accepted linking policy as rules, including: verified email only; existing account is reused; unconfirmed account is confirmed and its password removed; new user gets own `Tenant`
* a working throwaway proof (kept in `spikes/`, not shipped) logs in with a real Google test account and prints the verified claims, including `email_verified`
* the proof also shows the `email_verified = false` case is refused (using a recorded or mocked claim)
* `SOCIAL-LOGIN-001` is updated with an estimate and a testable DoD, and split further if it is above 8
* no change to the production login flow
* verified manually (real Google account); the evidence is the proof's output log and a screenshot of the consent screen, attached under `assets/SOCIAL-LOGIN-ADR-001/`
