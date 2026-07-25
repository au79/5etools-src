# MCP Rollout, Testing, and Observability

Status: approved

## Decision

The steel thread exposes races and classes end-to-end through ChatGPT. Expand next through grouped player-facing data, then grouped DM-facing data.

Provide a standalone MCP validation command that can inspect parent data without running the server and exits nonzero on schema/discovery failures. Validate the current rollout group at startup by default; change this only if measured performance requires it.

The package must compile and type-check its TypeScript source before tests or the local server are considered valid.

The package uses Prettier for formatting, ESLint for correctness and TypeScript safety, and lexical import sorting within import groups. Warnings do not fail CI. Promise handling must prevent unobserved async failures, with floating promises treated as errors.

Include automated MCP protocol tests and a documented manual ChatGPT smoke test using races/classes.

Require observability from the first implementation. Select a logging library and standard structured JSON format before implementation. For local `stdio`, stdout remains protocol-only and logs must use stderr or another explicitly safe sink.

Use `pino@10.3.1` for structured JSON logging and include `pino-pretty@13.1.3` as an opt-in human-readable local formatter. JSON on `stderr` remains the default; pretty output must never be sent to protocol `stdout`.

## Rationale

The steel thread proves the full user path quickly without waiting for every domain. Grouped expansion keeps schema work reviewable. Independent validation makes parent-fork edits checkable without starting the server. Observability is required to diagnose startup validation and MCP request failures.

## Consequences

- Player-facing groups precede DM-facing groups.
- Rendering, derived helpers, encounter/character assistance, and rules adjudication are deferred until the raw read-only surface is reliable.
- Logging library and JSON schema remain a near-term implementation choice, not a reason to delay the architecture.
- Pretty local logs are a convenience mode, not a replacement for machine-readable JSON or a protocol output channel.
- The MCP package overrides its transitive `@hono/node-server` dependency to patched `2.0.11`; `npm audit --omit=dev` reports no vulnerabilities.
- `typescript@6.0.3` is pinned in the package lockfile as the latest reasonable version compatible with the current TypeScript-aware ESLint stack; revisit when TypeScript 7 support is available.

## Revisit triggers

Revisit rollout order if a concrete ChatGPT use case requires another domain, or revisit startup validation if measured data volume makes it too slow.
