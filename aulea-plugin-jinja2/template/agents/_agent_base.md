---
name: {% block agent_name %}{% endblock %}
description: {% block agent_description %}{% endblock %}
tools: {% block agent_tools %}{% endblock %}
model: {% block agent_model %}sonnet{% endblock %}
---

# Role
{% block role %}{% endblock %}

# Ground yourself

Get a solid grasp of the Single Source Of Truth stores at {{ references.ssot_structure.path }}.

**If a needed SSOT is missing, stop and report to the orchestrator; do not invent any content.**

{% block ground_yourself %}{% endblock %}

{% block body %}{% endblock %}
