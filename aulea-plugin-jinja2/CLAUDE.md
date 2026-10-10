# CLAUDE.md

Guidance for Claude Code when working in this directory.

## What this is

The Jinja2 template source for `aulea-plugin/`. `template/` holds the
templates and `context.yml` holds the values; `render.py` renders one into
the other. `aulea-plugin/` is a **generated build product** — never
hand-edit it. Edit files under `template/` and/or `context.yml`, then
re-render.

## Commands

```bash
python3 render.py           # render and overwrite ../aulea-plugin/
python3 render.py --check   # render to a temp dir, diff against ../aulea-plugin/, exit 1 if they differ
```

Assume `jinja2` and `pyyaml` are already installed. If a command fails
because they are missing, report the failure — do not try to work around it
(no ad hoc `pip install`, no alternate runner).

## Rules

- **Partial files**: any file or directory under `template/` whose name
  starts with `_` (e.g. `template/agents/_agent_base.md`) is a partial —
  library-only content reached via `{% extends %}`/`{% include %}`, never
  rendered to its own output file. Partials exist only under `template/` and
  are intentionally absent from `aulea-plugin/`.
- Other than partials, `render.py` never creates or deletes files in
  `aulea-plugin/` on its own. Adding or removing a (non-partial) file in
  `template/` requires adding or removing the matching file in
  `aulea-plugin/` by hand, so the git diff shows the intent.
- `context.yml` uses Jinja2 `StrictUndefined`: a template referencing a key
  not defined in `context.yml` fails to render rather than producing an
  empty string.
- File newline style (CRLF vs LF) is preserved per file; `render.py` handles
  this itself.

## After rendering

Run `python3 render.py --check` before considering template changes done —
it is the way to confirm `template/` and `aulea-plugin/` are in sync.
