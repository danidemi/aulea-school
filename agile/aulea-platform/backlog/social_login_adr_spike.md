ID: SOCIAL-LOGIN-ADR-001

Status: READY

Priority: Normal

Effort: 5

Type: spike (time-boxed research and proof, no production feature)

Goal:
decide how Google login is built, in a way that adding another provider later needs no redesign, and prove the decision against a real Google test client.

Context:
`SOCIAL-LOGIN-001` cannot be estimated before this. It touches ADR-0004 (password hashing, client routing) and ADR-0005 (session management). The account linking policy is already accepted by the Product Owner (see `SOCIAL-LOGIN-001`).

**WARNING FOR THE DEVELOPER (Product Owner instruction, 2026-10-18): when you start this PBI you MUST WARN the Product Owner, explicitly and before any proof is run, about the manual steps below. The Product Owner cannot remember them. Do not continue silently. The steps are: (1) add a `http://localhost:<port>/...` redirect URI (and origin) in the Google Cloud console for the local proof, matching the callback path chosen by the ADR; (2) add the production redirect URI for the final callback path if it differs from the site root; (3) put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the uncommitted `.env`. Tell the Product Owner the exact URIs to register.**

Dependency (external): the Google Cloud OAuth client now exists (Product Owner, 2026-10-18; project `aulea-school`, type "web"). The secret was given to the developer in chat; it never goes in the repo, in a PBI or in an asset. It is read from env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) kept in an uncommitted `.env`; `.env.example` gets placeholders only. Gap to close before the proof can run locally: the client registers only the redirect URI `https://app.aulea.school` and the origin `https://app.aulea.school`. A local proof needs a `http://localhost:<port>/...` redirect URI added by a human in the Google console. The callback path is decided by the ADR, and the registered redirect URIs must then match it exactly (the current one is the site root).

Definition of Done:
* a new ADR compares at least: Passport.js with the Google strategy, `openid-client`, `arctic`, and a hand-written OIDC code flow with PKCE; and states the choice and why. It covers: how login state is checked (`state`, PKCE, `nonce`), how the result becomes an ADR-0005 session, where provider secrets live, and how a second provider is added.
* the ADR defines the data model for external identities: a provider-agnostic table (user, provider, provider subject id, email at link time) so a user can have several providers; and states what changes in `users` (nullable `password_hash` already exists)
* the ADR writes the accepted linking policy as rules, including: verified email only; existing account is reused; unconfirmed account is confirmed and its password removed; new user gets own `Tenant`
* a working throwaway proof (kept in `spikes/`, not shipped) logs in with a real Google test account and prints the verified claims, including `email_verified`
* the proof also shows the `email_verified = false` case is refused (using a recorded or mocked claim)
* `SOCIAL-LOGIN-001` is updated with an estimate and a testable DoD, and split further if it is above 8
* no change to the production login flow
* the Product Owner was warned about the Google console changes (redirect URIs) before the proof ran, and the warning is recorded in this PBI
* no secret appears in the repo, the ADR, the proof output or the attached evidence (checked by grep before the PBI is closed)
* verified manually (real Google account); the evidence is the proof's output log and a screenshot of the consent screen, attached under `assets/SOCIAL-LOGIN-ADR-001/`
