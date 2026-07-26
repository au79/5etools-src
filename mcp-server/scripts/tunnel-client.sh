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

if [[ "${1:-}" == "run" ]]; then
	shift

	watch=false
	run_args=()
	for arg in "$@"; do
		if [[ "$arg" == "--watch" ]]; then
			watch=true
		else
			run_args+=("$arg")
		fi
	done

	if [[ "$watch" == false ]]; then
		exec tunnel-client run "${run_args[@]}"
	fi

	get_watch_fingerprint() {
		local cli_path="$package_dir/dist/src/cli.js"

		{
			find "$package_dir/src" -type f ! -name '*.test.*' -exec cksum {} + | LC_ALL=C sort
			if [[ -f "$cli_path" ]]; then
				cksum "$cli_path"
			else
				printf 'missing %s\n' "$cli_path"
			fi
		} | cksum
	}

	client_pid=
	stop_client() {
		if [[ -n "$client_pid" ]]; then
			kill -TERM "$client_pid" 2>/dev/null || true
			wait "$client_pid" 2>/dev/null || true
		fi
		exit 0
	}

	trap stop_client INT TERM
	watch_fingerprint=$(get_watch_fingerprint)
	while true; do
		tunnel-client run "${run_args[@]}" &
		client_pid=$!
		restarted_for_build=false

		while kill -0 "$client_pid" 2>/dev/null; do
			sleep 1
			current_watch_fingerprint=$(get_watch_fingerprint)
			if [[ "$current_watch_fingerprint" != "$watch_fingerprint" ]]; then
				printf 'Detected MCP server source or build change; reconnecting tunnel.\n' >&2
				watch_fingerprint=$current_watch_fingerprint
				restarted_for_build=true
				kill -TERM "$client_pid" 2>/dev/null || true
				break
			fi
		done

		if wait "$client_pid"; then
			status=0
		else
			status=$?
		fi
		client_pid=

		if [[ "$restarted_for_build" == false ]]; then
			printf 'Tunnel exited with status %s; reconnecting in 1 second.\n' "$status" >&2
		fi
		sleep 1
	done
fi

exec tunnel-client "$@"
