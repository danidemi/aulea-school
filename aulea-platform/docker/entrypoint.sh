#!/bin/sh
# Docker-secrets friendly: for every VAR_FILE=/path set in the environment,
# export VAR with the file's content (trailing newline stripped).
# Example: DATABASE_URL_FILE=/run/secrets/database_url
set -eu

for file_var in $(env | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*_FILE\)=.*/\1/p'); do
  var="${file_var%_FILE}"
  path="$(printenv "$file_var")"
  [ -n "$path" ] || continue
  if [ -n "$(printenv "$var" || true)" ]; then
    echo "entrypoint: both $var and $file_var are set; use only one" >&2
    exit 1
  fi
  if [ ! -r "$path" ]; then
    echo "entrypoint: $file_var points to unreadable file: $path" >&2
    exit 1
  fi
  export "$var=$(cat "$path")"
  unset "$file_var"
done

exec "$@"
