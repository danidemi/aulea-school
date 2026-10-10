# Ubiquitous Language

One-line entries. Long definitions live in `ul/<slug>.md`, linked from here.

- **Answer Breakdown** (aka: answer breakdown block) — a block on the Quiz Session Monitor
  showing per-option response counts for the class on a given question.
- **App Header** (aka: top navigation bar) — the header shown on every signed-in page, holding the
  product name, the Courses link, and the User Menu.
- **Breadcrumb** — the trail of links near the top of a page showing where it sits in the
  course/quiz/session hierarchy, letting a trainer navigate back up.
- **Connection** — one student's participation record within a quiz session: their join, answers,
  and resulting score.
- **Course** — a collection of quizzes belonging to a tenant, browsable and selectable by a
  trainer.
- **Force Shuffle** (questions / answers) — a per-session trainer setting that shuffles every
  applicable question/choice order per student regardless of the item's own authored `shuffle`
  attribute. Off does not mean "never shuffle" — it means the item/section's own authored
  `shuffle` attribute decides.
- **Needs Manual Grading** — the status shown for a connection whose result includes at least one
  question that cannot be automatically scored.
- **Quiz** — an uploaded QTI package (a single item or a manifest-based package of items) that can
  be run as a quiz session.
- **Quiz Session** (aka: session) — a live, time-bounded run of a quiz that students join and
  answer questions during.
- **Quiz Session Monitor** (aka: quiz monitor page, monitor screen) — the trainer-facing page for
  watching and controlling a live quiz session.
- **Quiz Take Page** (aka: quiz-taking page, take page) — the student-facing page for answering a
  quiz session's questions in sequence.
- **Student** — a course participant who takes quizzes during a quiz session.
- **Tenant** (aka: workspace) — an organizational account boundary; every user and course belongs
  to one tenant. The UI currently labels it `<email>'s workspace`.
- **Trainer** — the person running the course and controlling quiz sessions.
- **User Menu** (aka: avatar menu) — the avatar-triggered dropdown in the App Header showing the
  signed-in trainer's tenant, email, and log-out action.
- **Version Info** — the running app's reported source/build identity (branch, commit SHA,
  dirty/clean status, commit and build timestamps), shown so a trainer can confirm what code is
  actually running.
