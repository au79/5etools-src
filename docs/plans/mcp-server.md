# D&D Data MCP Server — High-Level Plan

## Goal

Provide a local MCP server that exposes this repository's D&D data to ChatGPT for personal DM/player assistance and to other agents. Prove the wiring first with a transport-only MCP steel thread, then add a read-only races/classes steel thread and expand through grouped player-facing and DM-facing domains.

## Phase 1 decision index

Phase 1 decisions are recorded in lightweight decision notes:

- [Package boundary and transport](../decisions/mcp-package-boundary-and-transport.md)
- [Data schema and compatibility contract](../decisions/mcp-data-schema-contract.md)
- [Content scope and adventure safety](../decisions/mcp-content-scope-and-safety.md)
- [Rollout, testing, and observability](../decisions/mcp-rollout-testing-and-observability.md)

These notes are intentionally lighter than full ADRs. Update the relevant note when a decision changes, and update this index if notes are added or consolidated.

## Phased delivery

### Phase 1: Architecture and compatibility decisions

Confirm the supported MCP SDK/transport, Node version policy, latest reasonable TypeScript toolchain (`typescript@6.0.3`, selected for compatibility with the current TypeScript-aware ESLint stack), approved formatting/linting/type-checking rules, ChatGPT launch configuration, data-root configuration, edition/source semantics, default source scope, versioned domain manifest, strict schema behavior, observability approach (`pino@10.3.1` with optional `pino-pretty@13.1.3`), and adventure safety controls. Prioritize the integration gate before the data catalog: the server must complete MCP initialization, answer standard `ping`, advertise its diagnostic tool, and return package version plus the running git commit hash before data loading work proceeds. The decisions captured above are the working Phase 1 baseline.

### Phase 2: Read-only catalog and lookup core

Implement the TypeScript catalog, rollout-group schema validation, lazy data access, stable identifiers, provenance envelopes, source-aware filtering, bounded search, exact lookup, ambiguity handling, and predictable errors. Keep this layer independently testable without an MCP client.

### Phase 3: MCP adapter and steel thread

The transport-only integration gate is delivered first, independently of the data catalog. Then expose the validated races/classes surface through local `stdio` with raw `search` and `get` operations. Add the automated protocol tests and documented manual ChatGPT smoke test. Keep stdout protocol-only and route observability to stderr or another explicitly safe sink.

### Phase 4: Validation, refresh workflow, and client documentation

Add the standalone validation command, grouped rollout checks, local launch/configuration documentation, refresh instructions, provenance examples, and representative usage examples. Verify that compatible upstream additions are discovered and incompatible shape changes fail clearly.

### Phase 5: Grouped expansion and optional enrichment

Expand through player-facing groups first, then DM-facing groups. Only after the read-only surface is reliable, consider tagged-text rendering, rules cross-references, encounter/character helpers, and the adventure allowlist helper. Derived conveniences should link back to source entries.

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

## Acceptance criteria for the detailed implementation

- ChatGPT can launch the local server over `stdio`, discover the exposed catalog, search races/classes, and retrieve exact raw records.
- Before data loading, a ChatGPT-compatible client can complete `initialize`/`initialized`, use standard `ping`, discover the diagnostic tool, and retrieve the server package version and running git commit hash.
- The first rollout validates and serves races and classes without requiring unrelated domains to pass validation.
- Results include stable source/edition context and the mandatory originating-file/source-root provenance envelope.
- Ambiguous searches return clearly labeled matches; exact retrieval does not silently choose among conflicting sources.
- `prerelease/`, `homebrew/`, and adventures are disabled by default; adventure opt-in modes and warnings are testable when enabled.
- The standalone validation command checks the current rollout group without running the MCP server and exits nonzero on incompatibility.
- Automated protocol tests and a manual ChatGPT smoke test cover the steel thread.
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
