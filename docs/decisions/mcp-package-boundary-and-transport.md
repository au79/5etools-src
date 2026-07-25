# MCP Package Boundary and Transport

Status: approved

## Decision

Keep the MCP server in a separate `mcp-server/` package with its own manifest, lockfile, dependencies, source, tests, and documentation. The upstream 5etools app must not import or configure it.

Implement the MCP package in TypeScript using the latest stable TypeScript release available when implementation begins. Pin the resolved toolchain in the package lockfile and compile to runnable JavaScript before launching the local server.

Start with local MCP `stdio`. Keep the data/query core transport-independent so a future remote transport can be added without duplicating domain logic.

The server defaults to the enclosing 5etools checkout, while accepting explicit alternate repository/data roots. Configuration supports a file, environment variables, and CLI arguments, with precedence: CLI, environment, config file, built-in defaults.

## Rationale

This minimizes conflicts with parent-fork refreshes and keeps MCP dependencies out of the upstream app. `stdio` directly supports the initial ChatGPT workflow. An explicit root makes tests, refreshed checkouts, downstream forks, and future packaging possible.

## Consequences

- `stdout` is reserved for MCP protocol traffic; logs use `stderr` for `stdio`.
- TypeScript source is compiled before the MCP process is launched; generated build output is package-local and not upstream app output.
- Remote HTTP transport, authentication, deployment, and multi-user concerns are deferred.
- The server must validate the configured root before serving data.

## Revisit triggers

Revisit when a remote deployment is authorized, when ChatGPT requires a different transport/configuration shape, or when package isolation materially impedes maintenance.
