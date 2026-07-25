# MCP Data Schema and Compatibility Contract

Status: approved

## Decision

Keep the MCP domain set explicit and versioned. Use strict Zod schemas and domain adapters based on the current upstream shapes. Validate only the domains in the current rollout group, beginning with races and classes, and expand validation with each rollout group.

Fail fast on missing collections, changed types/requiredness/nested structure, unknown top-level collections, or unrecognized fields. Additive upstream fields require intentional schema review. There is no silent best-effort fallback.

The initial MCP surface is read-only `search` and `get` over validated raw records. Preserve 5etools tagged text exactly and defer rendering. Every result wraps the unchanged raw record in a provenance envelope containing domain, source root, originating file, source/book ID, page when available, and edition when available.

Search may return multiple same-named records with prominent labels. Exact retrieval must disambiguate ambiguous names.

## Rationale

Strict validation makes parent-fork refreshes visible instead of silently producing incomplete or misleading rules answers. Domain adapters preserve useful differences between creatures, spells, classes, books, and other data while providing a stable MCP envelope.

## Consequences

- New records and sources are accepted when they conform to an existing schema.
- Schema changes intentionally require adapter/test updates.
- Recursive or heterogeneous structures such as `entries` and book/adventure trees need explicit schema treatment and documented extension points.
- Character-builder assistance is a future read-only consumer of structured options, prerequisites, choices, and relationships; Phase 1 provides no character-building operations.

## Revisit triggers

Revisit if strict validation causes unacceptable measured startup cost, if upstream introduces a documented extension mechanism, or if a domain cannot be represented without unsafe unrestricted fields.
