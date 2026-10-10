ID: USER-MENU-001

Status: DONE — accepted at sprint review 2026-09-27

Priority: Medium

Effort: 5

As:
a `trainer`

I want to:
have the top navigation bar's current-`tenant` name, email, and log-out control collapsed behind
a single avatar (a circle showing my initials when no picture is set) that opens a dropdown
containing that same information and action

So that:
the top bar is less cluttered and matches a familiar pattern (e.g. Microsoft Teams' account menu:
avatar in the corner, click to reveal name/email/account actions in a dropdown)

Definition of Done:
* the top navigation bar (`client/src/components/AppHeader.tsx`) no longer shows the tenant-name
  pill, email text, and "Log out" button side by side at all times
* instead it shows a circular avatar; today's signed-in user shape (`SignedInUser` — id, email,
  tenant) carries no display name, so with no profile picture the avatar shows initials derived
  from the email's local part: the first two alphabetic characters of the local part, uppercased
  (e.g. `trainer1@seed.local` → `TR`) — decided with the human (2026-09-27)
* clicking the avatar opens a dropdown showing at least: the current tenant/workspace name, the
  user's email, and a log-out action equivalent to today's "Log out" button
* keyboard-accessible (dropdown opens on Enter/Space when avatar is focused, closes on Escape or
  outside click)
* `client/src/App.test.tsx:81` currently asserts the workspace text (`"...'s workspace"`) is
  directly visible in the header — that assertion moves to open-the-dropdown-then-assert, since
  the text is no longer shown until the avatar is clicked; update it as part of this story. Re-grepped at this grooming session (2026-09-27): line 81 still holds that exact assertion, and a
  repo-wide `grep -rn "Log out\|workspace" client/e2e` still returns no matches — no `client/e2e`
  spec needs updating.
* if the email's local part has fewer than 2 alphabetic characters, fall back to a single-character
  avatar using the local part's first character as-is, uppercased (e.g. `1@seed.local` → `1`) —
  proposed at grooming 2026-09-27, not put to the human as a separate question (low-stakes
  implementation fallback); flag it for a quick human sanity-check when this story is built
* verification: manual — screenshot of the collapsed avatar in the header, and of the open
  dropdown showing tenant/email/log-out, per `do_and_donts.md`'s screenshot rule for GUI stories

Note:
Reference screenshots attached by the user:
* current header (workspace pill + email + Log out button):
  [`assets/USER-MENU-001/current-header-workspace-email-logout.png`](assets/USER-MENU-001/current-header-workspace-email-logout.png)
* desired direction, Microsoft Teams' avatar-and-dropdown pattern:
  [`assets/USER-MENU-001/reference-teams-avatar-dropdown.png`](assets/USER-MENU-001/reference-teams-avatar-dropdown.png)
  (the exact actions inside Teams' dropdown, e.g. presence/status, don't apply here — only the
  avatar-opens-dropdown-with-account-info-and-actions pattern is being requested)

Decided with the human (2026-09-27): `VERSION-INFO-001` places its version/build info inside this
story's dropdown, so `VERSION-INFO-001` now depends on this story — both touch
`client/src/components/AppHeader.tsx` and its new dropdown; sequence `USER-MENU-001` before
`VERSION-INFO-001` in sprint planning rather than developing them independently in parallel.

Implementation Plan (sprint planning, 2026-09-27):
* No new ADR needed — this extends ADR-0006's already-adopted shadcn/ui + Radix pattern, it doesn't
  introduce a new component library. `client/src/components/ui/` today only has `button.tsx`,
  `card.tsx`, `input.tsx`, `label.tsx` (no dropdown/menu primitive yet); `@radix-ui/react-label` and
  `@radix-ui/react-slot` are the only Radix packages present so far.
* Copy shadcn's `dropdown-menu.tsx` into `client/src/components/ui/`, adding
  `@radix-ui/react-dropdown-menu` as a `client/` runtime dependency (same copy-in convention as the
  existing `ui/` components).
* Add a small pure helper, e.g. `client/src/lib/avatarInitials.ts`, implementing the two rules
  above (2-alpha-char initials; 1-char fallback), unit-tested directly (given an email local part /
  when computing initials / then the expected initials) rather than only through the rendered
  header.
* In `client/src/components/AppHeader.tsx`, replace the signed-in `<span>` block (tenant pill +
  email + Log out button) with a `DropdownMenuTrigger` wrapping a circular avatar button (initials
  via the helper above; leaves room for a future profile-picture `src` since `SignedInUser` has
  none today) and a `DropdownMenuContent` showing the tenant name, email, and a "Log out" menu item
  wired to the existing `onLogout` prop — no change to `onLogout`'s own contract.
* Radix's `DropdownMenu` already opens on Enter/Space when its trigger is focused and closes on
  Escape/outside click by default — use it as-is rather than hand-rolling keyboard handling; verify
  this default behavior satisfies the DoD rather than assuming it.
* Update `client/src/App.test.tsx:81`'s assertion: open the dropdown first (e.g. click/keyboard-open
  the avatar trigger), then assert the workspace text inside the opened `DropdownMenuContent`.
* Verification: screenshot of the collapsed avatar and of the open dropdown (tenant/email/log-out
  visible), per `do_and_donts.md`'s GUI screenshot rule — light and dark color-scheme both, per the
  `sprint_26_09_19_00_00` DON'T.

Implemented (sprint, 2026-09-27):
* `client/src/components/ui/dropdown-menu.tsx` — shadcn's dropdown-menu copied in (Root, Trigger,
  Content, Label, Item, Separator), styled with the project's own tokens (ink/paper/brass), no
  `tailwindcss-animate` classes since that plugin isn't installed here.
* `client/src/lib/avatarInitials.ts` (+ `avatarInitials.test.ts`, given/when/then) — implements both
  DoD rules (2-alpha-char initials, 1-char fallback for <2 alphabetic characters).
* `client/src/components/AppHeader.tsx` — signed-in block replaced with an avatar
  `DropdownMenuTrigger` + `DropdownMenuContent` (tenant name, email, "Log out" wired to the existing
  `onLogout` prop, unchanged contract).
* `client/src/App.test.tsx` — the workspace-text assertion (line 81) and three other assertions that
  assumed email/"Log out" were directly visible in the header now open the account menu first (all
  four were checked by re-grepping the file, not just line 81, since the header change affects any
  assertion that queried header text directly).
* Radix's default keyboard behavior (Enter/Space opens the focused trigger, Escape/outside-click
  closes) verified as-is — no custom keyboard handling added.
* Test-environment finding: jsdom (this repo's `jsdom` v24) has no `PointerEvent` constructor, so
  Radix's trigger (which opens on `onPointerDown`) never opens under `fireEvent.click`/`fireEvent.pointerDown`
  in these unit tests. Worked around by opening via `fireEvent.keyDown(trigger, { key: 'Enter' })`
  instead — this exercises the DoD's own keyboard-accessibility requirement rather than working
  around it with an unrelated shortcut.
* Verification gap found, not a defect: `client/src/index.css` states this app is deliberately
  light-only (`color-scheme: light`, pinned for the QTI player's contrast) — there is no dark
  color-scheme to screenshot. Took one screenshot set (the app's only color scheme) instead of a
  light/dark pair; flagging this for human confirmation that a single-scheme screenshot satisfies
  this DoD line for an app with no dark theme.
* Full automated suite green (`npx vitest run`: 97/97; `npx tsc -b`: clean) and the feature was
  exercised end-to-end against a disposable Playwright/Postgres stack (the existing
  `client/e2e/run-e2e-server.sh` harness, not a dev-mode shortcut), not just unit tests, per
  `do_and_donts.md`'s `sprint_26_09_26_22_30` DO.
* Screenshots (both against the real built app, signed in as a fresh seeded-at-runtime user):
  [`assets/USER-MENU-001/verification-collapsed-avatar.png`](assets/USER-MENU-001/verification-collapsed-avatar.png),
  [`assets/USER-MENU-001/verification-open-dropdown.png`](assets/USER-MENU-001/verification-open-dropdown.png).
* Fallback-initials rule (single-char avatar when the local part has fewer than 2 alphabetic
  characters) implemented as coded in the Implementation Plan — flagging per that plan's own note
  for a quick human sanity-check, not separately re-decided here.
