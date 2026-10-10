# Aulea 

This repository is a monorepo with three kinds of content:

- `aulea-plugin/` — a Claude Code plugin for planning adult courses and producing
  their didactic material (slides, quizzes, exercises, manuals).
- `learning-container/tools/` — containerized toolchains the plugin depends on
  (`graph/` for the knowledge-goals graph editor, `slides/` for the slide build
  pipeline).
- `aulea-test-course-*/` — sample course projects used to exercise the plugin
  while developing it (e.g. `aulea-test-course-migration/`).

The repository is mid-restructure: some reference docs under `aulea-plugin/`
still point at old paths (`tools/graph/`, `.claude/reference/`). Treat any such
path as stale until it is fixed.

## What was set up for local development

The plugin is not published anywhere. To make it usable while you develop it,
it was registered as a **local marketplace** pointing at this checkout:

- `.claude-plugin/marketplace.json` (in this repo, committed) declares a
  marketplace named `aulea` with one plugin entry, `aulea-plugin`,
  sourced from `./aulea-plugin`.
- The marketplace and the plugin were then registered with the Claude Code CLI:

  ```bash
  claude plugin marketplace add ./
  claude plugin install aulea-plugin@aulea
  claude plugin enable aulea-plugin@aulea
  ```

These two commands write to your **user-level** `~/.claude/settings.json`
(`extraKnownMarketplaces` and `enabledPlugins`), not to anything in this repo.
That means:

- The plugin is enabled for you personally, in every project, not just this
  one — it is a per-machine setting, not a per-repo one.
- Anyone else who clones this repo must run the same two commands themselves;
  committing `.claude-plugin/marketplace.json` only gives them the marketplace
  definition, not the registration.

## How to use the plugin while developing it

1. Edit anything under `aulea-plugin/agents/`, `aulea-plugin/skills/`, or
   `aulea-plugin/reference/`.
2. Start a new Claude Code session (or run `/reload-plugins` if your build
   supports it) — plugin content is not hot-reloaded into a running session.
3. The plugin's slash-command skills (e.g. `/requirements-gatherer`)
   and its subagents (e.g. `project-manager`,
   `curriculum-architect`) are now available like any built-in
   command or agent — no need to reference file paths manually.
4. Exercise the change against one of the `aulea-test-course-*/` folders,
   which hold sample `specifications/`, `design/`, and `material/` content to
   run the pipeline against.
5. After changing **any** file under `aulea-plugin/agents/` or
   `aulea-plugin/skills/`, run the `support-agent-coherence`
   skill. It checks for name/path/ownership drift across agents and skills,
   reports first, and only edits after you approve.

## Useful commands

```bash
# See what's installed and enabled
claude plugin list

# Inspect the plugin's components and their token cost
claude plugin details aulea-plugin@aulea

# Validate the manifests (catches YAML/schema errors early)
claude plugin validate .
claude plugin validate ./aulea-plugin

# Remove the plugin or the marketplace if you need to start over
claude plugin uninstall aulea-plugin@aulea
claude plugin marketplace remove aulea
```

## Known issue

`claude plugin validate ./aulea-plugin` currently reports a real error, not
just warnings: the YAML frontmatter of
`aulea-plugin/agents/reading-guide-author.md` fails to parse
because its `description` field contains an unquoted `kind: reading` sequence,
which YAML reads as a nested mapping. At runtime this agent loads with empty
metadata (name, tools, and model are all silently dropped). Fix by quoting the
`description` value; re-run `support-agent-coherence` afterward since
this touches a file under `aulea-plugin/agents/`.
