#!/usr/bin/env python3
"""Renders aulea-plugin-jinja2/template/ into ../aulea-plugin/ with Jinja2.

The template tree and the output tree must always have the same file list,
with one exception: any file or directory whose name starts with `_` (e.g.
template/agents/_agent_base.md) is a partial — library-only content meant to
be reached via {% extends %}/{% include %} from another template, never
rendered to its own output file. Partials exist only under template/ and are
intentionally absent from aulea-plugin/.

Other than that exception, this script never creates or deletes files in the
output tree by itself — if you add or remove a (non-partial) file in
template/, add or remove the matching file in aulea-plugin/ by hand (git
tracks it, so the diff will show the intent).

Usage:
    python3 render.py           # render and overwrite aulea-plugin/
    python3 render.py --check   # render to a temp dir, diff against
                                 # aulea-plugin/, exit 1 if they differ
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

ROOT = Path(__file__).resolve().parent
TEMPLATE_DIR = ROOT / "template"
CONTEXT_FILE = ROOT / "context.yml"
DEFAULT_OUTPUT_DIR = ROOT.parent / "aulea-plugin"


def load_context():
    with CONTEXT_FILE.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def make_env():
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        autoescape=False,
    )


def is_partial(rel_path):
    """True if any path component starts with '_' — a library-only file/dir,
    loadable via {% extends %}/{% include %} (FileSystemLoader's root is
    TEMPLATE_DIR, so the whole tree is resolvable) but never rendered to its
    own output file."""
    return any(part.startswith("_") for part in rel_path.parts)


def render_tree(output_dir):
    context = load_context()
    env = make_env()
    output_dir = Path(output_dir)
    for src in sorted(TEMPLATE_DIR.rglob("*")):
        if src.is_dir():
            continue
        rel = src.relative_to(TEMPLATE_DIR)
        if is_partial(rel):
            continue
        dest = output_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        template_name = rel.as_posix()
        # Jinja's loader reads source text with universal-newline translation
        # (\r\n -> \n), so preserve each file's original newline style by hand:
        # about half of this tree is CRLF and half is LF.
        uses_crlf = b"\r\n" in src.read_bytes()
        template = env.get_template(template_name)
        try:
            rendered = template.render(**context)
        except Exception as exc:
            raise SystemExit(f"error rendering {template_name}: {exc}") from exc
        if uses_crlf:
            rendered = rendered.replace("\n", "\r\n")
        dest.write_bytes(rendered.encode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="render to a temp dir and diff against the output dir instead of writing it",
    )
    args = parser.parse_args()

    if args.check:
        with tempfile.TemporaryDirectory() as tmp:
            render_tree(tmp)
            result = subprocess.run(
                ["diff", "-r", tmp, str(DEFAULT_OUTPUT_DIR)],
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                print(f"OK: rendered template matches {DEFAULT_OUTPUT_DIR}")
                sys.exit(0)
            else:
                print(result.stdout)
                print(result.stderr, file=sys.stderr)
                sys.exit(1)
    else:
        render_tree(DEFAULT_OUTPUT_DIR)
        print(f"rendered template/ into {DEFAULT_OUTPUT_DIR}")


if __name__ == "__main__":
    main()
