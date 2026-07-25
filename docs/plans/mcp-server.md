# High-Level Plan: D&D Data and Rules MCP Server

## Goal

Expose the D&D data available in this 5etools fork through an MCP server that can support both DM and player questions, while keeping the implementation easy to carry forward when the fork is refreshed from its parent.

## Guiding constraints

- Treat the repository's JSON data as the source of truth; do not copy game content into a second database or hand-maintained registry.
- Keep the MCP implementation isolated from the site's runtime and generated build output wherever practical.
- Prefer metadata and filesystem discovery over hard-coded lists, so new books, creatures, items, spells, and similar content become available after a normal parent refresh.
- Preserve source identity, book/source information, and edition/version distinctions in responses so the assistant can avoid silently mixing rules.
- Make licensing, attribution, and the fork's existing content boundaries visible in the server's documentation and response metadata.
- Treat the supported conceptual domains as a versioned compatibility contract; new domains or incompatible shape changes require an intentional plan/code update.

## Proposed shape

Create a self-contained server area, likely under `node/` or a dedicated top-level `mcp/` directory, with:

1. A data catalog layer that discovers supported JSON files and their top-level collections, loads them lazily, and caches parsed data for the process lifetime.
2. A schema-validation layer using explicit Zod schemas/adapters for the supported domains and major record types. It should validate the current upstream shapes before data is exposed.
3. A normalization/search layer that gives common entities a stable identity such as category, name, source, and slug, while retaining the original validated 5etools JSON for complete details.
4. An MCP transport entry point suitable for local desktop clients, with configuration for the repository/data root and optional read-only access to `prerelease/` and `homebrew/`.
5. A small, intentional tool/resource surface for discovery, exact lookup, filtered search, source/catalog inspection, and rules-oriented retrieval.
6. Tests and fixtures that validate discovery, lookup, source filtering, malformed/unsupported data handling, and refresh behavior without depending on a particular current book list.

## Schema and compatibility contract

The MCP-facing domain set should be explicit and versioned rather than inferred indefinitely:

`character`, `class`, `spell`, `item`, `creature`, `rule`, `adventure`, `book`, `worldbuilding`, and `dm-tool`.

Each domain should have a domain adapter and Zod schema based on the current upstream shape. The common response envelope should include stable fields such as `id`, `name`, `domain`, `source`, and `edition`, while retaining the validated domain-specific payload.

Validation should be strict by default. The server must fail during catalog/startup validation when:

- an expected domain or required collection is missing;
- a known field changes type, requiredness, or nested structure;
- an unexpected top-level collection or unsupported domain appears; or
- a strict schema encounters an unrecognized field.

The failure must identify the source file, domain/collection, record identity where available, and the schema error. There should be no silent best-effort fallback to expose data that did not pass validation.

New records, sources, books, and files are compatible when they conform to an existing domain schema. Additive upstream fields are intentionally treated as breaking changes under strict mode and require an explicit schema review/update. Any fields designated as documented extension points must be modeled explicitly rather than hidden behind an unrestricted catch-all.

## Initial MCP surface to design

The detailed plan should define exact schemas and names, but the first version should cover these capabilities:

- List available content categories and sources.
- Search entities by name/text/category/source, with bounded result counts.
- Fetch one exact entity, including its original structured data and readable rendering where useful.
- Retrieve related entries, such as a spell's classes, a creature's actions, or an item's source.
- Retrieve rules/reference material from supported rule and reference datasets, clearly labeled by source.
- Expose repository/catalog metadata so a client can report which data snapshot it used.

Avoid making the server an unrestricted filesystem browser or a general-purpose code execution tool. Keep all operations read-only and enforce result-size limits, path containment, predictable error responses, and validation before exposure.

## Refresh and maintenance strategy

- Do not modify individual `data/*.json` files for MCP support.
- Do not generate a second checked-in copy of the content.
- Keep server code and tests in files that are unlikely to conflict with upstream changes; isolate package-script/dependency changes in a small, obvious area.
- Base catalog discovery on existing indexes and file conventions, with a fallback scan for newly added datasets.
- Add a smoke test that runs against the current checkout and verifies that representative categories are discovered without asserting exact counts.
- Document the refresh workflow: update from the parent, install/lock dependencies as needed, run the catalog smoke test, then run the relevant repository checks.
- Treat changes to the upstream data schema as intentional compatibility work: update the affected Zod schema/adapter, add or revise fixtures, and document the change before accepting the refresh.
- Keep the conceptual domain set stable; fail fast and call out any new or unclassifiable domain rather than silently adding it to the MCP surface.

## Phased delivery

### Phase 1: Architecture and compatibility decisions

Confirm the supported MCP SDK/transport, Node version policy, client launch configuration, data-root configuration, edition/source semantics, whether `prerelease/` and `homebrew/` are enabled by default, the versioned domain manifest, and strict-versus-extension-point behavior for each schema.

### Phase 2: Read-only catalog and lookup core

Implement discovery, strict Zod validation, lazy loading, stable identifiers, source-aware filtering, bounded search, exact lookup, and error handling. Keep this layer independently testable without an MCP client.

### Phase 3: MCP adapter

Expose the core through the selected MCP transport and tool/resource schemas. Include concise descriptions that help a DM/player agent choose search versus exact retrieval and understand source labels.

### Phase 4: Validation and client documentation

Add unit/integration coverage, a local launch example, refresh instructions, representative usage examples, and repository-compatible lint/test scripts. Verify that a refreshed data file is visible without code changes.

### Phase 5: Optional enrichment

Only after the read-only data surface is reliable, consider derived conveniences such as rules cross-references, encounter/character helpers, or natural-language rendering. These should remain derived at query time and must link back to source entries.

## Risks and decisions for the detailed plan

- The repository contains many heterogeneous JSON shapes; a universal schema may lose useful data, while returning raw JSON everywhere may be difficult for clients to use. The adapter should use a small common envelope plus a strict, domain-specific validated payload.
- Strict validation makes upstream additive fields intentionally breaking. This is the desired fail-fast behavior, but it requires schema updates as part of refresh review.
- Some nested content is recursive or heterogeneous, especially `entries` and book/adventure trees. The schemas must model those structures explicitly and identify any deliberate extension points.
- Search indexes generated for the website may not be the right MCP index. The detailed plan should decide whether to reuse them read-only or build an in-memory index at startup/query time.
- Public, prerelease, and homebrew content can overlap by name. Source-aware IDs and explicit filters are required to prevent ambiguous answers.
- Some rules are represented as prose, tags, or nested entries rather than standalone entities. The server should distinguish authoritative lookup from derived interpretation and report missing/ambiguous matches.
- MCP SDK and transport choices affect client compatibility and dependency churn. Pin the smallest supported surface and document the compatibility target.

## Acceptance criteria for the detailed implementation

- A supported MCP client can launch the server against a checkout and discover its available categories/sources.
- A client can search and retrieve representative spells, creatures, items, classes, races, backgrounds, feats, books, adventures, conditions, actions, vehicles, and other available reference datasets without hand-maintained per-entry code.
- Results include stable source/edition context and are bounded, deterministic, and read-only.
- Refreshing the parent data and rerunning the documented checks makes newly added content discoverable without copying or editing it into MCP-specific files.
- Tests cover current representative data, strict schema behavior, startup failures for missing/unknown collections and shape changes, and discovery of future content additions that conform to existing schemas.
- Existing site build, lint, and data checks remain unaffected except for explicitly documented package/setup integration.

## Not included in this phase

- Editing or authoring campaign data.
- Character-sheet or encounter state persistence.
- Rules adjudication that claims authority beyond the retrieved source text.
- A hosted/public MCP deployment, authentication, or multi-user service.
- Changes to the parent fork's data files or broad refactors of the 5etools site.
