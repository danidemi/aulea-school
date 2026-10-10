# Material catalog

Registry of every kind of didactic material can be produced. 
Every authoring subagent — see each row's `owning_subagent` for its exact name — and the
`material-author` orchestrating skill read this file instead of re-deriving the
mapping. 

Trigger values (`delivery_style`, `item_type`, `support_material_kind`) are the enums defined in
`reference/curriculum.schema.json`. Read that schema, do not guess at its enum values.

# Materials

{% for material in didactic_material -%}
## Material {{ loop.index }}

```
type: {{ material.type }}
audience: {{ material.audience }}
preferred_formats: {{ material.preferred_formats }}
owning_subagent: {{ material.owning_subagent }}
trigger: {{ material.trigger }}
path_pattern: {{ material.path_pattern }}
filename_pattern: {{ material.filename_pattern }}
```

{% endfor -%}

`node_ref` in a filename is the item's own `node_ref`.

