# Slide renderer

Turns a deck model (`material/slides/session-NN.yml`, shape defined in
`aulea-plugin/reference/deck_model_spec.md`) into a `.pptx`, and optionally a `.pdf`, with
Mermaid diagrams rendered as real graphics.

The renderer itself is pure Python (`python-pptx` + `PyYAML`), but diagram rendering needs
mermaid-cli and PDF export needs LibreOffice, so this toolchain runs inside Docker: the
`learning-tool-slide` image carries both, plus every Python dependency, and the `slides` wrapper
script builds it (on first use) and runs the renderer inside a container. The host needs only
Docker — nothing else to install.

## Usage

```bash
# Always renders, stamps [DRAFT] on every slide when status isn't approved.
./slides preview material/slides/session-01.yml

# Refuses when status: draft — only a human sets status: approved.
./slides render material/slides/session-01.yml

# Also produce a .pdf.
./slides render material/slides/session-01.yml --pdf
```

`slides` builds the `learning-tool-slide` image automatically the first time it is needed; later
calls reuse it. Rebuild by hand after changing `Dockerfile`, `render_deck.py`, or
`requirements.txt`:

```bash
docker build -t learning-tool-slide .
```

Output goes to `<deck's directory>/out/<deck-name>.pptx` (and `.pdf`) — e.g.
`material/slides/out/session-01.pptx`. That `out/` directory is a build product: never commit it,
never hand-edit it, never treat it as a source. Fix the `.yml` model instead and re-render.

## Running `render_deck.py` directly, without Docker

For quick local iteration only. `mmdc` (mermaid-cli) and LibreOffice will not be present, so
diagrams fall back to their Mermaid source shown as text, and `--pdf` is skipped with a message —
both are stated up front by `render_deck.py`'s own docstring, not silently degraded.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python3 render_deck.py preview material/slides/session-01.yml
```

## Self-test

`example/fixture.yml` exercises every body kind (`diagram`, `list`, `code`, `image` with both a
local `asset` and a bare `source_url`, `callout`, `placeholder`, `none`) plus the draft/approved
gate. Render it and skim the result before trusting a real deck's output:

```bash
./slides preview example/fixture.yml
```

## Known gaps, stated rather than hidden

- No linting here. `deck_model_spec.md`'s word budgets, the list-item exception, and note-novelty
  are not checked mechanically by anything in this repository right now — an author applies them
  by judgment, a human reviews the rendered deck.
- No schema validation beyond the handful of required top-level keys `render_deck.py` checks to
  avoid crashing. A malformed slide can still produce a malformed slide, not a clean error.
- `render_deck.py` itself never fetches anything — an `image` body with no `asset` renders as a
  labelled placeholder. The `author-slide` agent does fetch (via WebFetch/Bash, outside
  this script) and set `asset` for slides where an internet image is appropriate; `render` (not
  `preview`) then refuses any such image unless a human has set `reviewed: true` on it.
- PDF fidelity is whatever the image's pinned LibreOffice version produces, not something this
  script controls.
