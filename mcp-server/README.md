# 5etools MCP Server

This is an independent package for exposing the enclosing 5etools data repository through MCP.

The package is intentionally separate from the upstream site. It has its own manifest, lockfile, source, tests, and
documentation. The package uses the MCP SDK, Zod, and Pino selected in Phase 1. It is currently a transport-only
integration shell; D&D data access is not implemented yet.

## Current status

P1-03A establishes the MCP transport integration gate. The server completes the MCP lifecycle, responds to standard
`ping`, advertises a `server_metadata` diagnostic tool, and reports its package metadata and running git commit hash.

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
handling to `process.exitCode`.

The server writes logs only to stderr. MCP `stdio` protocol traffic remains on stdout. The package does not load D&D
data, prerelease, homebrew, or adventure content in this integration phase.

For human-readable local development logs, set `MCP_LOG_PRETTY=true` when launching the server directly:

```bash
MCP_LOG_PRETTY=true pnpm start
```

For a reproducible local smoke test with pretty server logs forwarded to the terminal, run:

```bash
pnpm run smoke:stdio
```

The MCP Inspector is useful for interactive protocol inspection, but it captures the spawned server's stderr rather than
relaying it to its UI or the launching terminal. Use `smoke:stdio` when you need readable server logs. The Inspector is
an external development tool and does not modify this package's PNPM dependencies or lockfile.
