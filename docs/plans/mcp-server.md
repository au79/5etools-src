# D&D Data MCP Server — High-Level Plan

## Goal

Provide an MCP server that exposes this repository's D&D data to ChatGPT for personal DM/player assistance and to other agents. Prove the wiring first with a transport-only local MCP steel thread, then make it reachable by ChatGPT through Secure MCP Tunnel or another supported remote endpoint before adding the read-only races/classes steel thread.

## Phase 1 decision index

Phase 1 decisions are recorded in lightweight decision notes:

- [Package boundary and transport](../decisions/mcp-package-boundary-and-transport.md)
- [Data schema and compatibility contract](../decisions/mcp-data-schema-contract.md)
- [Content scope and adventure safety](../decisions/mcp-content-scope-and-safety.md)
- [Rollout, testing, and observability](../decisions/mcp-rollout-testing-and-observability.md)

These notes are intentionally lighter than full ADRs. Update the relevant note when a decision changes, and update this index if notes are added or consolidated.

## Phased delivery

### Phase 1: Architecture and compatibility decisions

Status: complete. The package boundary, SDK/transport, Node/toolchain policy, configuration, strict schemas,
observability, and adventure-safety decisions are recorded above. The transport integration gate completed before data
loading, including MCP initialization, `ping`, diagnostic metadata, and running-commit reporting.

### Phase 2: Read-only catalog and lookup core

Status: complete for the races/classes rollout. The TypeScript catalog validates enabled standard source roots, retains
provenance envelopes, supports source-aware bounded search and exact lookup, and rejects ambiguity and unsafe errors
predictably. The query layer remains independently testable without an MCP client.

### Phase 3: MCP adapter and steel thread

Status: complete. The local `stdio` server exposes `server_metadata`, raw `search`, and exact `get`; automated protocol
tests and a live Secure MCP Tunnel check cover the steel thread. The consumer README and canonical tunnel runbook cover
safe setup, verification, and recovery. Stdout remains protocol-only and observability is routed to stderr.

### Phase 4: Validation, refresh workflow, and client documentation

Status: complete for the races/classes rollout. `pnpm run validate:data` shares startup configuration and validates
selected source roots without starting MCP. The package documentation covers configuration, validation, provenance,
representative queries, and tunnel operation; compatible additions are discovered and incompatible shapes fail clearly.

### Phase 5: Grouped expansion and optional enrichment

Status: pending. Expand through player-facing groups first, then DM-facing groups. Only after the read-only surface is
reliable, consider tagged-text rendering, rules cross-references, encounter/character helpers, and the adventure
allowlist helper. Derived conveniences should link back to source entries. Near the end of this work, make an editorial
pass over the repository documentation and plans to remove obsolete references to delivery phases.

## Risks and decisions for the detailed plan

- The repository contains many heterogeneous JSON shapes; a universal schema may lose useful data, while returning raw JSON everywhere may be difficult for clients to use. Use a small common provenance envelope plus strict, domain-specific validated payloads.
- Strict validation makes upstream additive fields intentionally breaking. This is the desired fail-fast behavior, but it requires schema updates as part of refresh review.
- Some nested content is recursive or heterogeneous, especially `entries` and book/adventure trees. Schemas must model those structures explicitly and identify deliberate extension points.
- Search indexes generated for the website may not be the right MCP index. Decide whether to reuse them read-only or build an in-memory index during the relevant rollout.
- Public, prerelease, and homebrew content can overlap by name. Source-root-aware IDs and explicit filters are required to prevent ambiguous answers.
- Adventures can expose spoilers. Default exclusion, explicit opt-in, allowlists, and warnings must be enforced consistently in configuration, validation, search, and responses.
- Raw 5etools tags are useful for progression but not immediately human-friendly. Preserve them first, then evaluate reuse or emulation of existing repository renderers.
- MCP SDK and transport choices affect client compatibility and dependency churn. Pin the smallest supported surface and keep transport-specific code isolated.
- Observability must never corrupt `stdio`; library and JSON schema selection should be evaluated against stderr behavior and future transport needs.

## Deferred discovery

- Revisit whether catalog roots outside the standard `data/`, `prerelease/`, and `homebrew/` locations are a product requirement or merely a test-fixture convenience. Keep the current configuration narrow unless a concrete ingestion use case justifies its complexity.
- Trace the catalog pipeline end to end—configuration, manifest discovery, validation, catalog construction, query, and MCP response—to document its data flow and identify any unnecessary coupling before later domain expansion.

## Acceptance criteria for the detailed implementation

- ChatGPT can launch the local server over `stdio`, discover the exposed catalog, search races/classes, and retrieve exact raw records.
- Before data loading, a local MCP client can complete `initialize`/`initialized`, use standard `ping`, discover the diagnostic tool, and retrieve the server package version and running git commit hash.
- Before the D&D data steel thread is considered complete, ChatGPT can reach the same diagnostic surface through Secure MCP Tunnel or another supported remote MCP endpoint.
- The first rollout validates and serves races and classes without requiring unrelated domains to pass validation.
- Results include stable source/edition context and the mandatory originating-file/source-root provenance envelope.
- Ambiguous searches return clearly labeled matches; exact retrieval does not silently choose among conflicting sources.
- `prerelease/`, `homebrew/`, and adventures are disabled by default; adventure opt-in modes and warnings are testable when enabled.
- The standalone validation command checks the current rollout group without running the MCP server and exits nonzero on incompatibility.
- Automated protocol tests and a manual ChatGPT smoke test cover the steel thread.
- Unit tests for `file.ext` use the adjacent `file.unit.test.ext` naming convention. Larger cross-module and protocol
  tests remain in the package's separate `test/` directory. Covered production source must maintain 100% line, branch,
  and function coverage; only unit-test files and the process-entry `cli.ts` glue are excluded because the latter only
  wires startup failure handling to `process.exitCode`.
- Refreshing parent data makes compatible new records discoverable without copying content into MCP-specific files; incompatible shape changes identify the file, domain, record where available, and schema error.
- Existing site build, lint, and data checks remain unaffected because the upstream app does not depend on the MCP package.

## Not included in this phase

- Editing or authoring campaign data.
- Character-sheet or encounter-state persistence.
- Character-building operations; the server remains a read-only data source.
- Rules adjudication that claims authority beyond retrieved source material.
- Human-readable rendering of tagged text.
- Adventure helper UX beyond the configuration controls required for safe opt-in.
- A hosted/public MCP deployment, authentication, or multi-user service.
- Broad refactors of the 5etools site or changes to its data files.
