# Connect the local 5etools MCP server to ChatGPT

Use this guide to make the local, read-only MCP server available to ChatGPT without exposing the repository or the
server on the public internet. It uses OpenAI Secure MCP Tunnel and the external `tunnel-client` program.

## Scope: OpenAI ChatGPT only

This is the only supported remote-client integration. It covers OpenAI ChatGPT via Secure MCP Tunnel only; it does not
provide setup or operational instructions for Cursor, Claude, or other MCP clients.

The `codex:tunnel:*` script prefix is a local package-command namespace; it does not configure or document Codex as an
MCP client.

## Resume after a break

If `.env`, the `5etools-local` profile, and the ChatGPT plugin already exist, run this from `mcp-server`:

```bash
pnpm codex:tunnel:run
```

Keep that terminal open, then start a new ChatGPT conversation and enable the plugin. If the tunnel or plugin no longer
works, continue with the relevant setup or troubleshooting section below.

## Scope and safety

- The server currently exposes only the `server_metadata` diagnostic tool. D&D data tools are not available yet.
- The server is read-only. Do not add secrets, personal data, or campaign material to its source tree.
- `tunnel-client` and the server run on your machine. The server remains private; the tunnel makes only an OpenAI-hosted
  endpoint available to supported OpenAI products.
- Do not commit, paste into shell history, screenshot, or share `CONTROL_PLANE_API_KEY` in ChatGPT messages.

## Prerequisites

You need all of the following before the ChatGPT test can succeed:

1. A ChatGPT account/workspace where Developer Mode is enabled and where you can create a developer-mode app.
2. An OpenAI Platform organization where you have Tunnels Read + Manage to create a tunnel and Tunnels Read + Use to
   run it.
3. A tunnel associated with the target ChatGPT workspace and a recorded `tunnel_id`.
4. A runtime API key for `tunnel-client`.
5. A current `tunnel-client` binary from Platform tunnel settings or the latest public release.
6. Outbound HTTPS from this machine to `api.openai.com:443`.
7. Node 24 and the package's pinned PNPM version.

ChatGPT workspace developer-mode permission and Platform tunnel permission are separate. A tunnel associated only with a
Platform organization will not necessarily appear in the intended ChatGPT workspace.

## Create local configuration

From `mcp-server`, copy the secret-free template and restrict its permissions:

```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` and replace both values:

```bash
CONTROL_PLANE_TUNNEL_ID='tunnel_replace_with_yours'
CONTROL_PLANE_API_KEY='replace_with_your_runtime_api_key'
```

`.env` is ignored by Git. The package's `pnpm codex:tunnel:client` command reads it only for the child
`tunnel-client` process, so neither value appears in the command line.

## Build and verify the local server

```bash
pnpm run check
pnpm run smoke:stdio
```

Expected result: the smoke command reports that `ping`, `tools/list`, and `server_metadata` passed. This verifies the
local stdio server before adding the tunnel.

## Create the stdio tunnel profile

Ensure `tunnel-client` is on `PATH`, then create the named profile:

```bash
pnpm codex:tunnel:init
```

This command builds the package, reads `.env`, and points the profile at `dist/` deliberately: the built server includes
the package and Git metadata it reports through `server_metadata`.

## Validate and run the tunnel

```bash
pnpm codex:tunnel:doctor
pnpm codex:tunnel:run
```

Run `doctor` **before** `run`: it tests whether the configured local health port is free. Once `run` owns that port,
re-running `doctor` reports an expected bind conflict rather than a tunnel failure. Leave `run` active while you test
ChatGPT. The tunnel client should report healthy, ready, and connected. Its loopback admin UI, health, readiness, and
metrics endpoints are for local operator use; do not expose them remotely by default.

## Create the ChatGPT developer-mode app

1. In ChatGPT, open Settings → Plugins, or visit the apps/plugins page.
2. Create a developer-mode app and choose **Tunnel** as its connection.
3. Select the `CONTROL_PLANE_TUNNEL_ID` tunnel. If it is not listed, verify the tunnel's ChatGPT-workspace association and your
   Tunnels Read + Use permission.
4. Scan tools, then create the draft app.
5. In a new ChatGPT conversation, select the draft app and ask it to call `server_metadata`.

Expected result: ChatGPT discovers one `server_metadata` tool and reports the package name, version, description, Git
commit, and dirty-working-tree state from the running local build.

## Later chats and server updates

The app remains enabled in ChatGPT settings, but select it from the tools menu (or refer to it in the prompt) for each
new conversation. Keep `pnpm codex:tunnel:run` active whenever a conversation needs to call it.

For data-only or implementation changes that preserve the same tool names and input shapes, rebuild and restart the
local tunnel; no ChatGPT app refresh is required. When tool names, descriptions, or input shapes change, refresh or
rescan the app's actions in ChatGPT before testing in a new conversation. ChatGPT can retain a frozen tool-definition
snapshot until that refresh occurs.

## Troubleshooting

| Symptom                               | Check                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Tunnel is absent in ChatGPT           | Associate it with the intended ChatGPT workspace, then confirm Tunnels Read + Use.      |
| Tool scan or calls fail               | Confirm `pnpm codex:tunnel:run` is still active, then rerun `pnpm codex:tunnel:doctor`. |
| Local verification fails              | Run `pnpm run smoke:stdio` and fix that before testing the tunnel.                      |
| Server metadata is stale              | Rebuild with `pnpm run build`, recreate/restart the profile, and rescan tools.          |
| ChatGPT does not reflect tool changes | Refresh the app's actions; ChatGPT retains an approved tool snapshot.                   |

## Safe shutdown

Stop `pnpm codex:tunnel:run` with Ctrl-C. This stops remote reachability but leaves the local repository and built
server files unchanged. Remove or rotate the runtime API key through the OpenAI Platform if it was exposed.
