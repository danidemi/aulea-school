# ADR-0015: Self-hosted font for the Aulea Wordmark

## Status
Proposed — 2026-10-16 (font choice made by the development team at sprint planning; to be confirmed by the Product Owner)

## Context
BRANDING-001 renders the `Wordmark` ("Aulea" + ".school") as real HTML text, in a geometric sans close
to the one in `title.png`, self-hosted with no external font CDN. `title.png` shows a geometric sans
with a single-story "a", round "o" and "e", and a flat-cut "l".

`client/` currently loads Source Serif 4, Inter and IBM Plex Mono from Google Fonts
(`client/src/index.css`). That is out of scope here; this ADR only covers the new `Wordmark` font.

Candidates: Outfit, Poppins, Montserrat.
* **Outfit**: single-story "a" like the logo, open license (OFL), a variable font.
* Poppins: double-story "a", visibly different from `title.png`.
* Montserrat: wider letterforms and a double-story "a".

## Decision
Use **Outfit** (weight 600/700), self-hosted through the **`@fontsource-variable/outfit`** npm package,
imported only by the `Wordmark` component. The font is bundled by Vite into `client/dist`, so no request
leaves the app.

## Consequences
* `client/package.json` gains `@fontsource-variable/outfit` as a runtime dependency.
* Tailwind gets a new `fontFamily.wordmark` entry. The existing `display`, `sans` and `mono` families
  are untouched.
* If the Product Owner prefers another font, only the import and the Tailwind entry change.
