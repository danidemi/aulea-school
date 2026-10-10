ID: [short unique id, e.g. LOGIN-001]

Status: DRAFT

Priority: [High | Medium | Low]

Effort: [story points, Fibonacci scale: 1, 2, 3, 5, 8, 13 — relative size, not hours]

As:
[the role of the person, e.g. an `unregistered user`]

I want to:
[the action the person wants to take]

So that:
[the reason/benefit, e.g. what this unlocks for the person]

Definition of Done:
* [one concrete, checkable statement]
* [another concrete, checkable statement]
* [state whether verification is automatic or manual, and how]

---

## Example (for reference only — delete before filling in a real story)

ID: LOGIN-001

Status: DRAFT

Priority: High

Effort: 5

As:
an `unregistered user`

I want to:
sign in to the platform with a Google account

So that:
I will be able to use the services that will be provided, i.e. to upload a quiz I prepared to allow my students to access it and take it

Definition of Done:
* as an `unregistered user`, I can open the browser, type the platform URL, find a sign-in/log-in button, and click it
* clicking it starts the Google account sign-in flow
* after a successful Google sign-in, I become a `registered user` and land on the platform's home page
* verified manually (no automated test yet — the Google OAuth flow is not mocked)
