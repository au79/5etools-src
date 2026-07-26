#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
package_dir=$(cd -- "$script_dir/.." && pwd)
env_file="$package_dir/.env"

if [[ ! -f "$env_file" ]]; then
  printf 'Missing %s. Copy .env.example to .env and set the tunnel ID and runtime API key.\n' "$env_file" >&2
  exit 1
fi

set -a
source "$env_file"
set +a

: "${CONTROL_PLANE_TUNNEL_ID:?Set CONTROL_PLANE_TUNNEL_ID in mcp-server/.env.}"
: "${CONTROL_PLANE_API_KEY:?Set CONTROL_PLANE_API_KEY in mcp-server/.env.}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ "${1:-}" == "init-5etools" ]]; then
  shift
  exec tunnel-client init \
    --sample sample_mcp_stdio_local \
    --profile 5etools-local \
    --tunnel-id "$CONTROL_PLANE_TUNNEL_ID" \
    --mcp-command "node $package_dir/dist/src/cli.js" \
    "$@"
fi

exec tunnel-client "$@"
