# Slide design rules — actionable form

This is the **operational distillation** of `doc/writing_effective_slides.md` (Mayer's CTML,
Sweller's Cognitive Load Theory, Paivio's dual coding, Alley's Assertion-Evidence model, Gestalt).
That document is the reasoning; this one is the set of decisions an author applies and a script can
check. Read the source document when a rule here seems wrong for a specific slide — the theory tells
you which way to bend.

This is **not** a byte-copy of the source (unlike the other `.claude/reference/` theory docs); it is a
rewrite. When the source changes, re-derive this file rather than diffing it.

Numeric thresholds live in `aulea-tools/slides/slide_rules.yml`, not here — one place, machine-readable.

---

## 1. Every slide is an assertion plus its evidence

**Headline = one complete sentence stating the takeaway.** Not a topic label.

- ✗ `Routing` · `Panoramica del gateway` · `Obiettivi`
- ✓ `Il path split manda /legacy al vecchio sistema senza toccarne il codice.`

A generic label is rejected outright by the linter, because a label forces the audience to hold an
open question while you talk — which is exactly the working-memory cost CLT tells us to remove. If you
cannot write the assertion, you do not yet know what the slide is for; that is information, not an
obstacle.

**Body = evidence for that claim.** In order of preference:

1. **A diagram written as code** (Mermaid) — the default for architecture, request flow, sequence,
   state. It is text, so it diffs in git, renders identically everywhere, and is written in the course
   language.
2. **A real artefact** — a console screenshot, a genuine config fragment, a trace view.
3. **A short list** — only under the exception in §2.
4. **A placeholder** — an honest `DA FORNIRE` marker beats an invented illustration.

## 2. The one licensed exception to "no bullet lists"

Alley's model says eliminate bulleted lists. This project keeps a **narrow, justified exception**,
because a technical course genuinely contains ordered and enumerable content — deploy steps,
configuration checklists, a debrief's three questions — and forcing those into diagrams produces
contrivance, which costs more than the bullets save.

A list is permitted **only** when the content is *intrinsically enumerable or ordered*, and then:

- the model must carry a `justification` saying why (**enforced as an error**, not a warning);
- ≤ 5 items, ≤ 8 words each, no nesting;
- parallel grammar; no item is a sentence. An item ending in `.` is prose in disguise.

Prose in bullets is banned with no exception. If items need sentences, the content belongs in the
teacher notes or a handout, not on the slide.

## 3. What the audience reads and what they hear must differ

Mayer's redundancy principle: nobody can read dense text and listen at the same time. So the slide
carries the *claim and the evidence*; the instructor carries the *argument*. Concretely, the teacher
notes must not be the slide read aloud — this is measured, see §6.

Corollary: never put the spoken script on the slide. A slide that is self-sufficient has made the
instructor redundant, which for an instructor-led course (LOGISTICS: human-taught, synchronous) is a
design failure, not an achievement.

## 4. One idea per slide; chunk instead of compressing

Intrinsic load is the subject's real difficulty — you manage it by splitting across sequential slides,
never by shrinking the font. Word budget covers headline plus visible body text; a slide over budget
is a slide that should be two. Diagram source and code blocks are excluded from the count, because
they are the evidence, not prose to be read word by word.

## 5. Signal, contiguity, coherence

- **Signal** what matters: the headline already does most of this work; add at most one visual
  emphasis per slide.
- **Contiguity**: labels belong *inside* the diagram, next to the thing they name — not in a caption
  below it, and not on the next slide. Mermaid node labels satisfy this by construction.
- **Coherence**: no decorative image, no stock photography, no icon that carries no information. If
  deleting an element loses nothing, delete it. This is why *"find an image about the topic"* is not a
  valid instruction — most search results are exactly the chartjunk this rule removes.

## 6. Teacher notes are structured, and their novelty is measured

Notes carry five fields, all required (see `deck_model_spec.md`). They exist so a different
instructor can teach the deck, so they answer *why this slide, why here* — never *what is on it*.

The linter computes a **novelty ratio**: the share of content words in the notes that do not appear on
the slide, after stripping Italian and English function words. A low score means the notes restate the
slide. It is a warning, not an error, because the metric is a proxy and a short slide can legitimately
score low — but a deck where many slides score low has notes that are not doing their job.

## 7. Structure mirrors the curriculum, and it is checked

- One deck model per **session**; one PowerPoint section per **unit**.
- Inside a unit, the slide roles walk Kolb's cycle in order: `problem` → `lab-brief` → `debrief` →
  `concept` → `apply`. The linter warns when a stage is missing, and **`debrief` is the one to watch**:
  it is the stage most often skipped and the one that turns activity into learning.
- Theory never opens a unit. The task opens it (andragogy: adults engage with a recognised need
  first). A `concept` slide before any `problem` slide inverts the design.
- Every slide traces to an objective id from `specifications/goals.md` — enforced as an error. A slide
  that serves no objective is either a gap in the goals or a slide that should not exist.

## 8. Remote delivery (this cohort: Teams, 4 people)

Shared over video, half the audience is on a laptop screen. Fewer elements, larger type, no thin
hairlines in diagrams, and never rely on a colour distinction alone. A lab step someone must *type*
belongs in a handout they can copy from, not on a slide they must read off a compressed video stream.

## 9. Third-party images are a legal artefact

Any fetched image records `license`, `attribution` and `alt` in the model, comes from the host
allowlist in `slide_rules.yml`, and is downloaded to `assets/` so a later render does not depend on a
remote host. The build emits a credits slide automatically.

**The authoring agent cannot see images.** Any image it proposes is a guess based on a URL and a
caption, and must be marked `reviewed: true` by a human who actually opened it. Prefer a diagram the
agent *can* verify by compiling it.
