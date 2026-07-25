# MCP Package Boundary and Transport

Status: approved

## Decision

Keep the MCP server in a separate `mcp-server/` package with its own manifest, lockfile, dependencies, source, tests, and documentation. The upstream 5etools app must not import or configure it.

Implement the MCP package in TypeScript using `typescript@6.0.3`, the latest reasonable version compatible with the current TypeScript-aware ESLint stack. Pin the toolchain in the package lockfile and compile to runnable JavaScript before launching the local server. Re-evaluate this pin when `typescript-eslint` supports the TypeScript 7 compiler API.

Use these package-local tooling preferences:

- two-space indentation using spaces, not tabs;
- single quotes;
- trailing commas in all multiline constructs;
- 120-character print width;
- bracket spacing, always-parenthesized arrow parameters, quote properties as needed, LF endings, final newline, and reflowed Markdown;
- Prettier owns formatting; ESLint does not duplicate formatting rules;
- `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` enabled;
- `noUnusedLocals` and `noUnusedParameters` handled as ESLint warnings, ignoring names beginning with `_`;
- `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2024`, source maps enabled, declaration output disabled, and cleaned `dist/` output;
- lexical import ordering within Node-built-in, external, internal, and relative groups;
- `no-floating-promises` as an error, `no-misused-promises` as a warning, `await-thenable` as an error, and no initial `promise-function-async` rule;
- warnings do not fail CI, while correctness errors do.

Start with local MCP `stdio`. Keep the data/query core transport-independent so a future remote transport can be added without duplicating domain logic.

The server defaults to the enclosing 5etools checkout, while accepting explicit alternate repository/data roots. Configuration supports a file, environment variables, and CLI arguments, with precedence: CLI, environment, config file, built-in defaults.

## Rationale

This minimizes conflicts with parent-fork refreshes and keeps MCP dependencies out of the upstream app. `stdio` directly supports the initial ChatGPT workflow. An explicit root makes tests, refreshed checkouts, downstream forks, and future packaging possible.

## Consequences

- `stdout` is reserved for MCP protocol traffic; logs use `stderr` for `stdio`.
- TypeScript source is compiled before the MCP process is launched; generated build output is package-local and not upstream app output.
- TypeScript compiler output uses `dist/`, with `dist/` cleaned before each build.
- Remote HTTP transport, authentication, deployment, and multi-user concerns are deferred.
- The server must validate the configured root before serving data.

## Revisit triggers

Revisit when a remote deployment is authorized, when ChatGPT requires a different transport/configuration shape, or when package isolation materially impedes maintenance.

## Phase 1 library selections

Use `@modelcontextprotocol/sdk@1.29.0` for the MCP adapter, `zod@4.4.3` for strict runtime schemas, `pino@10.3.1` for structured logging, and `pino-pretty@13.1.3` for opt-in human-readable local logs. Use Node's built-in test runner rather than adding a test framework. These dependencies remain package-local.

The selected MCP SDK currently brings a moderate `@hono/node-server` audit finding through an unused HTTP-oriented dependency path. The initial server uses local `stdio`, so this is not on the active transport path; revisit the SDK or dependency resolution when an upstream fix is available.
