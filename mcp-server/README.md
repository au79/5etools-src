# 5etools MCP Server

This is an independent package for exposing the enclosing 5etools data repository through MCP.

The package is intentionally separate from the upstream site. It has its own manifest, lockfile, source, tests, and
documentation. The package uses the MCP SDK, Zod, and Pino. It is a read-only data service for catalog records.

## Current status

The server completes the MCP lifecycle, responds to standard `ping`, validates the configured catalog before
serving requests, and advertises three read-only tools:

- `server_metadata` returns package identity, the running Git commit, and dirty-working-tree state.
- `search` searches raw validated `race`, `subrace`, `background`, `feat`, `optionalfeature`, `facility`, `class`,
  `subclass`, `classFeature`, `subclassFeature`, and `spell` records. It accepts a required `query`, plus optional
  `domain`, `source`, `sourceRoot`, and a `limit` from 1 through 100 (20 by default). `facility` is the upstream
  collection name for records stored in `bastions.json`.
- `get` retrieves one raw provenance envelope by stable `id`, or by exact `domain` and `name` with optional `source`
  and `sourceRoot` filters. Ambiguous exact requests return safe disambiguation candidates instead of selecting one.

Every data result preserves the raw record in `data` and includes `domain`, `id`, `source`, `sourceRoot`, originating
`file`, and any available `edition` and `page`. The initial source root is `data`; `prerelease` and `homebrew` are
disabled unless explicitly enabled. Enabled source roots must contain the same catalog layout, and a stable-ID collision
across roots fails startup rather than merging records silently. Adventures are not exposed.

Representative raw-record requests are `search({"domain":"background","query":"acolyte"})`,
`search({"domain":"feat","query":"alert"})`, `search({"domain":"optionalfeature","query":"agonizing blast"})`,
`get({"id":"facility/ancient%20altar/rhw"})`, and `get({"id":"spell/acid%20splash/phb"})`. Tagged text remains
unchanged inside each result's `data` payload.

## Resume here: OpenAI ChatGPT

The only documented remote client integration is **OpenAI ChatGPT via Secure MCP Tunnel**. It does not cover Cursor,
Claude, or any other MCP client.

The `codex:tunnel:*` script prefix is a local package-command namespace; it does not add a Codex client integration.

If you have already created `mcp-server/.env`, initialized the profile, and created the ChatGPT plugin, restart the
tunnel from this directory with:

```bash
pnpm codex:tunnel:run
```

To reconnect after source changes, rebuilds, or client exits, append the wrapper's `--watch` flag. It watches every
non-test file in `src/` and the built `dist/src/cli.js` entrypoint:

```bash
pnpm codex:tunnel:run -- --watch
```

`--watch` does not build the server; run `pnpm run build` after changing source. The resulting entrypoint change causes
another reconnect that loads the new build.

Then use the plugin in a new ChatGPT conversation. For initial setup, recovery steps, and troubleshooting, follow the
[OpenAI ChatGPT Secure MCP Tunnel runbook](docs/chatgpt-secure-mcp-tunnel.md). `tunnel-client` is an
operator-installed tool, not an npm dependency of this package.

For initial setup or after changing the profile, run `pnpm codex:tunnel:doctor` **before** `pnpm codex:tunnel:run`.
`doctor` cannot pass while the running daemon owns its local health port.

## Development

From this directory:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm test
pnpm run test:coverage
pnpm start
```

This package uses the PNPM version pinned in `packageManager`; the enclosing 5etools application remains independent
and retains its existing npm workflow.

Unit tests for `file.ext` live beside the tested file as `file.unit.test.ext`. Larger cross-module or protocol tests may
live in `test/` with their integration-oriented name. `pnpm run test:coverage` requires 100% line, branch, and function
coverage for production source, excluding only unit-test files and `cli.ts`, which only wires process startup and failure
handling to `process.exitCode`, and `validationCli.ts`, which only wires validation failures to `process.exitCode`.

The server writes logs only to stderr. MCP `stdio` protocol traffic remains on stdout. Startup and each tool action emit
structured start/completion/failure events with a correlation ID and duration. Logs contain only bounded safe context:
they exclude raw queries, returned records, full filesystem paths, and unexpected error messages.

## Configuration

Configuration precedence is CLI arguments, then environment variables, then `.5etools-mcp.jsonc` in the selected
project root, then safe defaults. The default project root is the enclosing checkout and the default source root is
`data`.

```bash
pnpm start --root /path/to/5etools-src --sources data,homebrew --log-pretty
```

The corresponding environment variables are `MCP_5ETOOLS_ROOT`, `MCP_5ETOOLS_CONFIG`, `MCP_5ETOOLS_SOURCES`,
`MCP_5ETOOLS_LOG_LEVEL`, and `MCP_5ETOOLS_LOG_PRETTY`. The config file also supports `adventures`, which defaults to
`disabled`. Adventure and book text domains are absent from discovery, search, and retrieval while disabled; use an
explicit `allowlist` of metadata source IDs for selected text, or `all` when the explicit startup warning is acceptable.
Text results retain the raw validated entry tree and visibly include the title, source, and file provenance. This is a
spoiler-bearing opt-in; the server does not infer whether a caller should see spoilers.

## Validate data

Run the same configuration and source-root validation used at server startup without starting an MCP process:

```bash
pnpm run validate:data
```

Pass the same CLI options after `--`, for example:

```bash
pnpm run validate:data --sources data,homebrew
```

On success, the command prints a concise file/source-root summary and exits zero. Configuration, discovery, or schema
failures are printed to stderr and exit nonzero.

For human-readable local development logs, set `MCP_5ETOOLS_LOG_PRETTY=true` when launching the server directly:

```bash
MCP_5ETOOLS_LOG_PRETTY=true pnpm start
```

For a reproducible local smoke test with pretty server logs forwarded to the terminal, run:

```bash
pnpm run smoke:stdio
```

The MCP Inspector is useful for interactive protocol inspection, but it captures the spawned server's stderr rather than
relaying it to its UI or the launching terminal. Use `smoke:stdio` when you need readable server logs. The Inspector is
an external development tool and does not modify this package's PNPM dependencies or lockfile.
