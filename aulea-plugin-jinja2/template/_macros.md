{#
  Shared phrase macros, importable from any template under template/.

  Usage, from anywhere (agent body, skill, reference doc):

    {% import "_macros.md" as macros %}
    {{ macros.only_ssot_writer_preamble([stores.design]) }}
    {{ macros.ssot_reader_preamble([stores.logistics, stores.student_personas]) }}

  Each argument is a Python list of store entries taken from context.yml's `stores`
  map (e.g. `stores.design`, `[stores.logistics, stores.student_personas]`) — pass
  the store objects themselves, not their names as raw strings, so the macro can
  read `.name`.

  This file is a partial (leading underscore): render.py never renders it to its
  own output file, but Jinja's loader can still resolve the `{% import %}` above
  because FileSystemLoader's root is the whole template/ tree.
#}

{% macro join_names(store_list) -%}
{%- if store_list|length == 1 -%}
{{ store_list[0].name }}
{%- elif store_list|length == 2 -%}
{{ store_list[0].name }} and {{ store_list[1].name }}
{%- else -%}
{{ store_list[:-1]|map(attribute="name")|join(", ") }}, and {{ store_list[-1].name }}
{%- endif -%}
{%- endmacro %}

{% macro only_ssot_writer_preamble(store_list) -%}
You are the sole writer of the {{ join_names(store_list) }} store{{ "s" if store_list|length > 1 else "" }} —
everyone else reads the current version before generating from it; never write it from memory,
a stale copy, or invention.
{%- endmacro %}

{% macro ssot_reader_preamble(store_list) -%}
You read the {{ join_names(store_list) }} store{{ "s" if store_list|length > 1 else "" }} — always the
current version, retrieved before you use it; never from memory, a stale copy, or invention.
**If a needed info is missing, stop and report to the orchestrator; do not invent the missing piece of info.**
{%- endmacro %}

{% macro pretty_activity_name(activity) -%}
{{ activity.name.split("_")|map("capitalize")|join(" ") }}
{%- endmacro %}
