ID: BUG-QUIZ-REFRESH-DUP-SESSION

Status: DONE

Steps To Reproduce:
1. A student opens the "take quiz" page of an open quiz.
2. While still on the "take quiz" page, the student refreshes the browser (e.g. F5 / reload).

Expected result:
The refresh is recognized as the same student continuing the same quiz attempt/connection — no new student connection is registered.

Actual result:
The application registers a new student connection on refresh, as if a different/new student had joined. A malicious student could repeatedly refresh to create many fake student connections.

Security impact:
Allows a single student to inflate the count of registered student connections for a quiz by refreshing the page, which can be used to fake participation numbers or otherwise abuse features that rely on the connection count. Note (grooming, 2026-09-20): QUIZ-CONNECTION-INTEGRITY-001 (reopened, not yet implemented — see that story) will stop refresh-spam from polluting the *Results* table by filtering on `submittedAt`, but it does not touch `joinedCount` — refresh-spam still inflates that live count on Block #1/#2 even once that story ships. Both stories are needed.

Priority: Medium — inflates a visible live count (`joinedCount`) but, once QUIZ-CONNECTION-INTEGRITY-001 ships, no longer pollutes final Results/class average.

Effort: 3

Depends on: none technically, but touches the same `quiz_session_connections` table/join endpoint
as QUIZ-CONNECTION-INTEGRITY-001 (`active_sprint/`) — sequence after that story to avoid two
concurrent changes to the same join path.

Decision (human, grooming, 2026-09-20):
Identity is a browser-local token, not a server cookie or a required name. On first successful
join, the client stores the returned `connectionId` in `localStorage`/`sessionStorage` keyed by
`sessionId`; on mount, the take page checks for an existing token for that `sessionId` before
calling join, and reuses it instead of creating a new connection. Trade-off accepted: a student
who switches browser/device or clears storage still registers as a new join — good enough for the
stated abuse case (repeated in-page refresh), not a defense against a determined multi-device
attacker.

Definition of Done:
* `QuizSessionTakePage` checks `localStorage` (or `sessionStorage`) for an existing
  `connectionId` scoped to the current `sessionId` before calling
  `POST /api/quiz-sessions/:sessionId/connections`
  * if found, reuses it (no new join call) and resumes the take flow from wherever the student
    left off (or at least skips creating a duplicate connection — resuming mid-quiz answer state
    is out of scope for this bug unless already supported)
  * if not found, joins as today and stores the returned `connectionId` before continuing
* a `stopped`/ended session still shows the existing "This quiz session has ended" message on
  refresh, using the stored token's last-known state — no new join attempt against an ended
  session
* refreshing the take page 5 times in a row for the same session results in exactly one
  `quiz_session_connections` row, not five
* clearing storage (or opening in a new incognito/private window) and reloading the same take
  URL is expected, by design, to register as a new join — not a defect
* verification: automated —
  * client unit test: mounting `QuizSessionTakePage` with a pre-existing stored `connectionId`
    for the current session does not call the join endpoint again
  * client unit test: mounting with no stored token calls join once and persists the result
  * e2e/manual: simulate a refresh (remount with the same storage) and confirm `joinedCount`
    does not increment on the Monitor page

Implemented (sprint, 2026-09-20):
* `client/src/QuizSessionTakePage.tsx`: added `connectionStorageKey(sessionId)` and, on mount,
  checks `localStorage` for an existing `connectionId` before calling join; stores the id on a
  fresh join. Status/items fetching is unchanged either way.
* Client unit tests added: stores the id on first join; reuses a stored id and skips the join
  call on a later mount. Full client suite (78 tests) and `tsc -b` pass.
* Not covered by an e2e test this sprint (manual/e2e verification item in the DoD above) — the
  two unit tests above cover the reuse/skip-join logic directly; flag at review if an e2e
  confirmation of `joinedCount` staying flat across a real refresh is still wanted.
