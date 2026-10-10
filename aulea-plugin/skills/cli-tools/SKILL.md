---
name: cli-tools
description: >-
  Hot to use some cli tools to perform several tasks as: json schema based validation, json query
---

# json schema based validation

To validate a json file against a json schema:

  pipx run check-jsonschema --schemafile <PATH_OF_SCHEMA> -v --color never --traceback-mode full --output-format json <PATH_OF_JSON> 

If the json obeys the schema the output is:

  {
    "status": "ok",
    "errors": [],
    "checked_paths": [
      "aulea-test-course-docker/design/knowledge_goals_graph.json"
    ]
  }

In case of errors:

  {
    "status": "fail",
    "successes": [],
    "errors": [
      {
        "filename": "aulea-test-course-docker/design/knowledge_goals_graph.json",
        "path": "$.nodes[1]",
        "message": "Additional properties are not allowed ('monster' was unexpected)",
        "has_sub_errors": false
      }
    ],
    "parse_errors": []
  }

## json query

You can use `jq` to extract meaningful fields as:

  pipx run check-jsonschema --schemafile aulea-plugin/reference/knowledge_goals_graph.schema.json -v --color never --traceback-mode full --output-format json aulea-test-course-docker/design/knowledge_goals_graph.json | jq '.status'