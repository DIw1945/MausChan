#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
nohup flock -n /tmp/burnice-private-preview.lock node .devcontainer/preview.mjs > /tmp/burnice-private-preview.log 2>&1 < /dev/null &
echo 'Private preview starting on port 4173. Keep port visibility Private; check /tmp/burnice-private-preview.log if startup fails.'
