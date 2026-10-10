{% extends "agents/_agent_base.md" %}

{% block ground_yourself %}
Read, in order:

* `design/material_authoring_rules.md` — rules shared by every material-authoring subagent.
* `.claude/reference/material_catalog.md` — confirm the path/filename pattern for your output.
* `{{ stores.editorial_guidelines.path }}`, if it exists — tone, terminology, idiom policy. If
   it does not exist yet, follow the fallback in `material_authoring_rules.md` and record that
   you did.

{% endblock %}
