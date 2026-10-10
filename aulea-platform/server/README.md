# aulea-platform-server

See `../README.md` for the overall project layout and how to run the app.

## Seed test data (TESTDATA-001)

If you're testing the app and want it pre-loaded with realistic sample
data — accounts you can log in with, a course, a quiz, and some quiz
results already recorded — from the `aulea-platform/` folder, run:

```bash
./scripts/seed.sh
```

**Before running it**, the server must already be up and running, with
`EXPEDITE_SIGNUP_ENABLED=true` set (this is what lets the script create
the two accounts below without needing to read a confirmation email).

The easiest way to get there is the same script used for human-led UAT —
from the `aulea-platform/` folder (one level up from here):

```bash
./scripts/uat.sh
```

This brings up Postgres, builds and starts the server (creating
`server/.env` from `server/.env.example` for you if it's missing — that
file already has `EXPEDITE_SIGNUP_ENABLED=true`), and leaves it running in
that terminal. Once it prints `aulea-platform server listening on port
3000`, open a **second terminal** and, from the `aulea-platform/` folder,
run `./scripts/seed.sh`.

If you're instead running the server some other way (`npm run dev`, etc.),
make sure `server/.env` exists (`cp .env.example .env` if it doesn't) and
that `EXPEDITE_SIGNUP_ENABLED=true` is set in it before starting the
server.

**What it creates:**

* Two trainer accounts you can sign in with at the app's home page:
  * `trainer1@seed.local`
  * `trainer2@seed.local`
  * Password for both: `SeedPass123!`
* Under `trainer1@seed.local`, a course called **"Seed Course"** containing
  one quiz built from a sample geography quiz package (one single-choice
  question, one multi-select question).
* One quiz session for that quiz that has already been run and stopped,
  with three recorded student attempts:
  * one that answered everything correctly,
  * one that answered everything incorrectly,
  * one that got the single-choice question right but only partially
    answered the multi-select question (picked one of the two correct
    options).

Sign in as `trainer1@seed.local` / `SeedPass123!` to see the course, the
quiz, and that session's results.

**Safe to re-run.** Every time you run it, it first removes only the data
it previously created (anything tied to a `@seed.local` account), then
creates it again from scratch. It never touches any other account, course,
or quiz in your database — so it's safe to run as many times as you like
to reset the sample data back to a known state.
