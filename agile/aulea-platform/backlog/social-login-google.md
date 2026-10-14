ID: SOCIAL-LOGIN-001

Status: DRAFT

Priority: Normal

Effort: ?

As:
an `unregistered user`

I want to:
log in with my Google account

So that:
I can use the system without signing up with an email based account.

Confirmed:
* Google only for now; other providers are expected later, so the design must not hard-code Google
* a new Google user gets their own `Tenant`, with the same rule as the email sign up

Account linking policy (accepted by the Product Owner, 2026-10-14):
* match on the email address, and only when Google reports it as verified (`email_verified = true`). Never link on an unverified email.
* if an account with that email already exists, the Google login signs into that same account (same `Tenant`); no duplicate account.
* if that existing account is still unconfirmed (password sign up, link not clicked), the Google login confirms it and removes its password. This blocks the "pre-hijack" case where someone signs up with a victim's email first.
* the user can still log in with the password on a confirmed account that was linked.

Depends on: `SOCIAL-LOGIN-ADR-001` (spike). Its result gives the estimate and the DoD.

Definition of Done:
<to be defined after the ADR>
