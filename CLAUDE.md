# CLAUDE.md

Guidance to Claude Code when working in this repository.

The project brand is **Aulea** (aulea.school). Folders are prefixed `aulea-`; the SCRUM folder is `agile/`.

## What this repository is

This multi-repo is several things at once:

1. **A Claude Code plugin** (`aulea-plugin`) for planning adult courses and producing their didactic material (slides, quizzes, exercises, manuals). You cannot access this folder because this folder content is rendered based on the jinja2 templates contained in `aulea-plugin-jinja2`.
2. **A templetized Claude Code plugin** (`aulea-plugin-jinja2`). This is the actual source of the plugin. Every update on the plugin should be applied here.
3. **Few live test course project** (`aulea-test-course-<TOPIC>`), likely courses that human can regenerate for testing purpose.
4. **SCRUM management folders** (`agile`), a series of folders that try to make you write code following a SCRUM workflow. Based on the SCRUM there, other source is being generated.
5. **Literature** (`doc`), folder generally reserved to human for documentation about topics that are important for the project. Don't access them unless explicitly told.
6. **Tools** (`aulea-tools`), a series of tools used across the project.

