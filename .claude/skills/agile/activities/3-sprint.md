# Activity 3: Sprint

Goal: develop the PBIs in `active_sprint/`.

Read `references/tech_reference.md` first — it says where the actual source tree lives, which
may not be the same folder as the SCRUM root (e.g. spec and code kept in separate trees).

Read `references/do_and_donts.md` before starting and obey it. It is the retrospective log of
rules this project has already learned the hard way.

Use the canonical terms from `references/ubiquitous_language.md` when naming things in code,
comments, or discussion — but never rename existing code identifiers just to match the glossary;
the glossary governs spec prose, not enforced code style.

Develop each PBI along these guidelines:

- Comply with the ADRs in `adr/`.
- Follow project best practices as outlined there (i.e.: CLAUDE.md or otheri instructions)
- Satisfy every requirement in the PBI's Definition of Done.
- Before updating `Status:` to `IN_REVIEW`, re-read `references/do_and_donts.md` and write one line
  in the PBI's "Implemented" section confirming which entries applied and how they were met.
- Before updating `Status:` to `IN_REVIEW`, verify in this order — don't stop right after editing
  code and assert it works:
  1. Run the full automated test suite; it must be green.
  2. When reasonable, actually run the app and exercise the feature end-to-end (not just its own
     unit tests) — this is what catches integration breaks between PBIs that per-story tests miss.
  3. Attach the resulting screenshots and/or logs to the PBI as durable evidence (see "PBI
     attachments" in `SKILL.md`), not just a written claim that it works.
- If the human attaches an image while describing or discussing a PBI, save it under the PBI's own
  `assets/<pbi-id>/` folder per `SKILL.md`'s "PBI attachments" convention — don't let it drop.
